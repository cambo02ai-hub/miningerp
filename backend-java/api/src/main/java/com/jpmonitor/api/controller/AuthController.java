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
import java.util.Map;
import java.util.stream.Collectors;

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

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !isSuperAdmin(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new AuthErrorResponse("Only Super Admin is authorized to access user accounts"));
        }
        List<User> users = userRepository.findAll();
        List<UserDTO> dtoList = users.stream()
                .map(this::mapUserToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtoList);
    }

    @PostMapping("/login")
    @Transactional
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

            if (user.getIsActive() != null && !user.getIsActive()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new AuthErrorResponse("Account is suspended"));
            }

            user.setLastLogin(java.time.LocalDateTime.now());
            userRepository.save(user);

            String token = jwtUtils.generateToken(userDetails);
            UserDTO userDTO = mapUserToDTO(user);

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
    public ResponseEntity<?> register(@RequestBody RegisterRequest request, Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated() && !isSuperAdmin(authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new AuthErrorResponse("Only Super Admin is authorized to create user accounts"));
            }
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

            String emailToSet = (request.email() != null && !request.email().isBlank()) ? request.email().trim() : request.username().trim() + "@jpmonitor.com";
            if (userRepository.findByEmailIgnoreCase(emailToSet).isPresent()) {
                emailToSet = request.username().trim() + "." + System.currentTimeMillis() + "@jpmonitor.com";
            }

            User user = new User();
            user.setUsername(request.username().trim());
            user.setFullName(request.fullName() != null && !request.fullName().isBlank() ? request.fullName().trim() : request.username().trim());
            user.setEmail(emailToSet);
            user.setEmployeeId(request.employeeId() != null ? request.employeeId().trim() : null);
            user.setDepartment(request.department() != null ? request.department().trim() : null);
            user.setSite(request.site() != null ? request.site().trim() : null);
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setRole(role);
            user.setIsActive(request.status() == null || !request.status().equalsIgnoreCase("SUSPENDED"));
            if (request.permissionOverrides() != null && !request.permissionOverrides().isEmpty()) {
                user.setParsedPermissionOverrides(request.permissionOverrides());
            } else {
                user.setPermissionOverrides("[]");
            }

            User savedUser = userRepository.save(user);

            UserDTO userDTO = mapUserToDTO(savedUser);

            log.info("User registered successfully: {} with role: {}", savedUser.getUsername(), savedUser.getRole().getCode());
            return ResponseEntity.status(HttpStatus.CREATED).body(userDTO);
        } catch (Exception e) {
            log.error("Registration error for user: {}", request.username(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthErrorResponse("Account registration failed: " + e.getMessage()));
        }
    }

    @PutMapping("/users/{username}")
    @Transactional
    public ResponseEntity<?> updateUser(@PathVariable String username, @RequestBody RegisterRequest request, Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated() && !isSuperAdmin(authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new AuthErrorResponse("Only Super Admin is authorized to update user accounts"));
            }
            User user = userRepository.findByUsernameIgnoreCase(username.trim())
                    .or(() -> userRepository.findByUsername(username.trim()))
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

            if (request.fullName() != null && !request.fullName().isBlank()) {
                user.setFullName(request.fullName().trim());
            }
            if (request.email() != null && !request.email().isBlank()) {
                user.setEmail(request.email().trim());
            }
            if (request.employeeId() != null) {
                user.setEmployeeId(request.employeeId().trim());
            }
            if (request.department() != null) {
                user.setDepartment(request.department().trim());
            }
            if (request.site() != null) {
                user.setSite(request.site().trim());
            }
            if (request.password() != null && !request.password().isBlank()) {
                if (request.password().length() < 8) {
                    return ResponseEntity.badRequest().body(new AuthErrorResponse("Password must be at least 8 characters"));
                }
                user.setPasswordHash(passwordEncoder.encode(request.password()));
            }

            if (request.role() != null && !request.role().isBlank()) {
                String targetRoleCode = request.role().trim().toUpperCase();
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
                            defaultRole.setPermissions("[]");
                            Role saved = roleRepository.save(defaultRole);
                            return saved != null ? saved : defaultRole;
                        });
                if (role != null) {
                    user.setRole(role);
                }
            }

            if (request.status() != null) {
                user.setIsActive(!request.status().equalsIgnoreCase("SUSPENDED"));
            }

            if (request.permissionOverrides() != null) {
                user.setParsedPermissionOverrides(request.permissionOverrides());
            }

            User savedUser = userRepository.save(user);

            UserDTO userDTO = mapUserToDTO(savedUser);

            log.info("User updated successfully: {}", savedUser.getUsername());
            return ResponseEntity.ok(userDTO);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new AuthErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Update error for user: {}", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthErrorResponse("Account update failed: " + e.getMessage()));
        }
    }

    @PatchMapping("/users/{username}/status")
    @Transactional
    public ResponseEntity<?> updateUserStatus(@PathVariable String username, @RequestBody Map<String, String> body, Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated() && !isSuperAdmin(authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new AuthErrorResponse("Only Super Admin is authorized to modify user status"));
            }
            User user = userRepository.findByUsernameIgnoreCase(username.trim())
                    .or(() -> userRepository.findByUsername(username.trim()))
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

            String status = body.get("status");
            if (status != null) {
                user.setIsActive(!status.equalsIgnoreCase("SUSPENDED"));
                userRepository.save(user);
            }

            log.info("User status updated successfully for: {} to {}", user.getUsername(), status);
            return ResponseEntity.ok(Map.of("message", "Status updated successfully", "username", username, "isActive", user.getIsActive()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new AuthErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Status update error for user: {}", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthErrorResponse("Status update failed: " + e.getMessage()));
        }
    }

    @DeleteMapping("/users/{username}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable String username, Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated() && !isSuperAdmin(authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new AuthErrorResponse("Only Super Admin is authorized to delete user accounts"));
            }
            User user = userRepository.findByUsernameIgnoreCase(username.trim())
                    .or(() -> userRepository.findByUsername(username.trim()))
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

            if ("myohlaingoo".equalsIgnoreCase(user.getUsername()) || (user.getRole() != null && "ROLE_SUPER_ADMIN".equalsIgnoreCase(user.getRole().getCode()))) {
                return ResponseEntity.badRequest().body(new AuthErrorResponse("Super Admin account cannot be deleted"));
            }

            userRepository.delete(user);
            log.info("User deleted successfully: {}", username);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully", "username", username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new AuthErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Delete error for user: {}", username, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthErrorResponse("User deletion failed: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(mapUserToDTO(user));
    }

    private boolean isSuperAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        String username = authentication.getName();
        if (username == null || username.isBlank()) return false;
        if ("myohlaingoo".equalsIgnoreCase(username.trim())) return true;
        return userRepository.findByUsernameIgnoreCase(username.trim())
                .map(u -> u.getRole() != null && ("ROLE_SUPER_ADMIN".equalsIgnoreCase(u.getRole().getCode()) || "SUPER_ADMIN".equalsIgnoreCase(u.getRole().getCode())))
                .orElse(false);
    }

    private UserDTO mapUserToDTO(User user) {
        String roleCode = user.getRole() != null ? user.getRole().getCode() : "ROLE_OPERATOR";
        List<String> rolePermissions = user.getRole() != null ? user.getRole().getPermissions() : Collections.emptyList();
        String statusStr = (user.getIsActive() != null && !user.getIsActive()) ? "SUSPENDED" : "ACTIVE";

        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                roleCode,
                user.getEmployeeId() != null ? user.getEmployeeId() : "",
                user.getDepartment() != null ? user.getDepartment() : "",
                user.getSite() != null ? user.getSite() : "",
                statusStr,
                rolePermissions,
                user.getParsedPermissionOverrides(),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
                "စနစ်",
                user.getLastLogin() != null ? user.getLastLogin().toString() : null
        );
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
