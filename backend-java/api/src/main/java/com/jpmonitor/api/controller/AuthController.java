package com.jpmonitor.api.controller;

import com.jpmonitor.domains.core.dto.AuthResponse;
import com.jpmonitor.domains.core.dto.LoginRequest;
import com.jpmonitor.domains.core.dto.UserDTO;
import com.jpmonitor.domains.core.entity.User;
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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
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
