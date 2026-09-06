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

import java.util.Collections;
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
        if (request == null || request.username() == null || request.username().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthErrorResponse("Invalid username or password"));
        }
        String cleanUsername = request.username().trim();
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(cleanUsername);
            if (request.password() == null || !passwordEncoder.matches(request.password(), userDetails.getPassword())) {
                throw new BadCredentialsException("Invalid username or password");
            }

            User user = userRepository.findByUsernameIgnoreCase(cleanUsername)
                    .or(() -> userRepository.findByUsername(cleanUsername))
                    .orElseThrow(() -> new IllegalStateException("User not found after authentication"));

            String token = jwtUtils.generateToken(userDetails);

            UserDTO userDTO = new UserDTO(
                    user.getId(), user.getUsername(), user.getEmail(), user.getFullName(),
                    user.getRole().getCode(), user.getRole().getPermissions());

            log.info("User logged in successfully: {}", user.getUsername());
            return ResponseEntity.ok(new AuthResponse(token, userDTO));
        } catch (org.springframework.security.core.AuthenticationException e) {
            log.warn("Failed login attempt for user: {}", cleanUsername);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthErrorResponse("Invalid username or password"));
        } catch (Exception e) {
            log.error("Login error for user: {}", cleanUsername, e);
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
            if (userRepository.findByUsernameIgnoreCase(request.username().trim()).isPresent()) {
                return ResponseEntity.badRequest().body(new AuthErrorResponse("Username is already taken"));
            }

            String targetRoleCode = (request.role() != null && !request.role().isBlank()) ? request.role().trim().toUpperCase() : "OPERATOR";
            String prefixedCode = targetRoleCode.startsWith("ROLE_") ? targetRoleCode : "ROLE_" + targetRoleCode;
            String rawCode = targetRoleCode.startsWith("ROLE_") ? targetRoleCode.substring(5) : targetRoleCode;

            Role role = roleRepository.findByCodeIgnoreCase(prefixedCode)
                    .or(() -> roleRepository.findByCodeIgnoreCase(targetRoleCode))
                    .or(() -> roleRepository.findByCodeIgnoreCase(rawCode))
                    .orElseGet(() -> {
                        Role defaultRole = new Role();
                        defaultRole.setCode(prefixedCode);
                        defaultRole.setName(formatRoleName(rawCode));
                        defaultRole.setDescription(rawCode + " Role");
                        if (request.permissions() != null && !request.permissions().isEmpty()) {
                            defaultRole.setPermissions(formatPermissionsJson(request.permissions()));
                        } else {
                            defaultRole.setPermissions("[]");
                        }
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
                    savedUser.getRole().getCode(),
                    savedUser.getRole().getPermissions(),
                    request.permissionOverrides() != null ? request.permissionOverrides() : Collections.emptyList()
            );

            log.info("User registered successfully: {} with role: {}", savedUser.getUsername(), savedUser.getRole().getCode());
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
                user.getRole().getCode(), user.getRole().getPermissions());
        return ResponseEntity.ok(userDTO);
    }

    private String formatRoleName(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) return "User";
        String[] parts = rawCode.split("_");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) continue;
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(part.substring(0, 1).toUpperCase()).append(part.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    private String formatPermissionsJson(List<String> permissions) {
        if (permissions == null || permissions.isEmpty()) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < permissions.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(permissions.get(i).replace("\"", "")).append("\"");
        }
        sb.append("]");
        return sb.toString();
    }

    private record AuthErrorResponse(String message) {}
}
