package com.jpmonitor.api.controller;

import com.jpmonitor.domains.core.dto.AuthResponse;
import com.jpmonitor.domains.core.dto.LoginRequest;
import com.jpmonitor.domains.core.dto.RegisterRequest;
import com.jpmonitor.domains.core.dto.UserDTO;
import com.jpmonitor.domains.core.entity.Role;
import com.jpmonitor.domains.core.entity.User;
import com.jpmonitor.domains.core.repository.RoleRepository;
import com.jpmonitor.domains.core.repository.UserRepository;
import com.jpmonitor.platform.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
            if (!passwordEncoder.matches(request.password(), userDetails.getPassword())) {
                throw new BadCredentialsException("Invalid username or password");
            }

            User user = userRepository.findByUsername(request.username())
                    .orElseThrow(() -> new IllegalStateException("User not found after authentication"));

            String token = jwtUtils.generateToken(userDetails);

            UserDTO userDTO = new UserDTO(
                    user.getId(), user.getUsername(), user.getEmail(), user.getFullName(),
                    user.getRole().getName(), user.getRole().getPermissions());

            log.info("User logged in successfully: {}", user.getUsername());
            return ResponseEntity.ok(new AuthResponse(token, userDTO));
        } catch (BadCredentialsException e) {
            log.warn("Failed login attempt for user: {}", request.username());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthErrorResponse("Invalid username or password"));
        } catch (Exception e) {
            log.error("Login error for user: {}", request.username(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthErrorResponse("An error occurred during login"));
        }
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            if (request.username() == null || request.username().isBlank()) {
                return ResponseEntity.badRequest().body(new AuthErrorResponse("Username is required"));
            }
            if (request.password() == null || request.password().length() < 8) {
                return ResponseEntity.badRequest().body(new AuthErrorResponse("Password must be at least 8 characters"));
            }
            if (userRepository.findByUsername(request.username().trim()).isPresent()) {
                return ResponseEntity.badRequest().body(new AuthErrorResponse("Username is already taken"));
            }

            String targetRoleCode = (request.role() != null && !request.role().isBlank()) ? request.role().trim() : "OPERATOR";
            Role role = roleRepository.findByCode(targetRoleCode)
                    .or(() -> roleRepository.findByCode(targetRoleCode.toUpperCase()))
                    .orElseGet(() -> {
                        List<Role> roles = roleRepository.findAll();
                        if (!roles.isEmpty()) {
                            return roles.get(0);
                        }
                        Role defaultRole = new Role();
                        defaultRole.setCode(targetRoleCode);
                        defaultRole.setName(targetRoleCode);
                        defaultRole.setPermissions("[\"*\"]");
                        return roleRepository.save(defaultRole);
                    });

            User user = new User();
            user.setUsername(request.username().trim());
            user.setFullName(request.fullName() != null && !request.fullName().isBlank() ? request.fullName().trim() : request.username().trim());
            user.setEmail(request.email() != null && !request.email().isBlank() ? request.email().trim() : request.username().trim() + "@jpmonitor.com");
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRole(role);
            user.setIsActive(request.status() == null || !request.status().equalsIgnoreCase("SUSPENDED"));

            User savedUser = userRepository.save(user);

            UserDTO userDTO = new UserDTO(
                    savedUser.getId(),
                    savedUser.getUsername(),
                    savedUser.getEmail(),
                    savedUser.getFullName(),
                    savedUser.getRole().getName(),
                    savedUser.getRole().getPermissions()
            );

            log.info("User registered successfully: {}", savedUser.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(userDTO);
        } catch (Exception e) {
            log.error("Registration error for user: {}", request.username(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthErrorResponse("Account registration failed: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();

        UserDTO userDTO = new UserDTO(
                user.getId(), user.getUsername(), user.getEmail(), user.getFullName(),
                user.getRole().getName(), user.getRole().getPermissions());
        return ResponseEntity.ok(userDTO);
    }

    private record AuthErrorResponse(String message) {}
}
