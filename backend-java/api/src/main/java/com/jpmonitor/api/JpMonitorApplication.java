package com.jpmonitor.api;

import com.jpmonitor.domains.core.entity.Role;
import com.jpmonitor.domains.core.entity.User;
import com.jpmonitor.domains.core.repository.RoleRepository;
import com.jpmonitor.domains.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Optional;
import java.util.Set;

@SpringBootApplication
@ComponentScan(basePackages = "com.jpmonitor")
@EntityScan(basePackages = "com.jpmonitor")
@EnableJpaRepositories(basePackages = "com.jpmonitor")
@RequiredArgsConstructor
public class JpMonitorApplication {

    private static final Logger log = LoggerFactory.getLogger(JpMonitorApplication.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public static void main(String[] args) {
        SpringApplication.run(JpMonitorApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            // Ensure roles exist
            Optional<Role> adminRoleOpt = roleRepository.findByCode("ROLE_SUPER_ADMIN");
            Role adminRole;
            if (adminRoleOpt.isEmpty()) {
                adminRole = new Role();
                adminRole.setCode("ROLE_SUPER_ADMIN");
                adminRole.setName("Super Administrator");
                adminRole.setDescription("Full System Access");
                adminRole = roleRepository.save(adminRole);
                log.info("Seeded ROLE_SUPER_ADMIN");
            } else {
                adminRole = adminRoleOpt.get();
            }

            // Ensure admin user exists with secure password
            Optional<User> adminUserOpt = userRepository.findByUsername("admin");
            if (adminUserOpt.isEmpty()) {
                String adminPassword = System.getenv("ADMIN_PASSWORD");
                if (adminPassword == null || adminPassword.isBlank()) {
                    adminPassword = java.util.UUID.randomUUID().toString().substring(0, 16);
                }

                User adminUser = new User();
                adminUser.setUsername("admin");
                adminUser.setEmail("admin@jpm.local");
                adminUser.setFullName("System Administrator");
                adminUser.setIsActive(true);
                adminUser.setRole(adminRole);
                adminUser.setPasswordHash(passwordEncoder.encode(adminPassword));
                userRepository.save(adminUser);

                // Write password to secure file (only if no env var was set)
                if (System.getenv("ADMIN_PASSWORD") == null) {
                    Path passwordFile = Paths.get(System.getProperty("user.home"), ".jpm-erp-admin-password");
                    Files.createDirectories(passwordFile.getParent());
                    Files.writeString(passwordFile, 
                        "Initial admin password: " + adminPassword + "\n" +
                        "CHANGE THIS PASSWORD IMMEDIATELY after first login.\n" +
                        "Generated: " + java.time.Instant.now() + "\n"
                    );
                    // Restrict permissions to owner only
                    try {
                        Files.setPosixFilePermissions(passwordFile, 
                            Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
                    } catch (UnsupportedOperationException e) {
                        // Not a POSIX filesystem, skip
                    }
                    log.warn("Initial admin password written to {}", passwordFile);
                    log.warn("SECURITY: Delete this file after first login: rm {}", passwordFile);
                }

                log.info("Seeded admin user. Password must be changed on first login.");
            }

            // Optional one-time administrator account supplied through deployment secrets.
            // The password is never persisted in source control and is only used when the
            // requested username does not already exist.
            String extraAdminUsername = System.getenv("ADMIN_ACCOUNT_USERNAME");
            String extraAdminEmail = System.getenv("ADMIN_ACCOUNT_EMAIL");
            String extraAdminPassword = System.getenv("ADMIN_ACCOUNT_PASSWORD");
            if (extraAdminUsername != null && !extraAdminUsername.isBlank()
                    && extraAdminEmail != null && !extraAdminEmail.isBlank()
                    && extraAdminPassword != null && !extraAdminPassword.isBlank()
                    && !extraAdminUsername.trim().equalsIgnoreCase("admin")) {
                String normalizedUsername = extraAdminUsername.trim();
                User extraAdmin = userRepository.findByUsername(normalizedUsername)
                        .orElseGet(User::new);
                extraAdmin.setUsername(normalizedUsername);
                extraAdmin.setEmail(extraAdminEmail.trim());
                extraAdmin.setFullName(extraAdminUsername.trim());
                extraAdmin.setIsActive(true);
                extraAdmin.setRole(adminRole);
                extraAdmin.setPasswordHash(passwordEncoder.encode(extraAdminPassword));
                userRepository.save(extraAdmin);
                log.warn("Provisioned requested administrator account: {}", normalizedUsername);
            } else {
                log.warn("Requested administrator seeding skipped: ADMIN_ACCOUNT_USERNAME, ADMIN_ACCOUNT_EMAIL, and ADMIN_ACCOUNT_PASSWORD must all be set");
            }
        };
    }
}
