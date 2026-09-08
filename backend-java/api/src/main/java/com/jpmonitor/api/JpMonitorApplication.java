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
            // Seed standard roles with role-appropriate permissions
            seedRole("ROLE_SUPER_ADMIN", "Super Administrator", "Full System Access", "[\"*\"]");
            seedRole("ROLE_ADMIN", "Administrator", "System Administrator", "[\"dashboard.view\",\"production.view\",\"production.create\",\"production.edit\",\"production.approve\",\"production.export\",\"fleet.view\",\"fleet.create\",\"fleet.edit\",\"fleet.delete\",\"fleet.approve\",\"fleet.export\",\"mutation.view\",\"mutation.create\",\"mutation.edit\",\"mutation.delete\",\"mutation.approve\",\"mutation.export\",\"inventory.view\",\"inventory.create\",\"inventory.edit\",\"inventory.delete\",\"inventory.approve\",\"inventory.export\",\"maintenance.view\",\"maintenance.create\",\"maintenance.edit\",\"maintenance.delete\",\"maintenance.approve\",\"maintenance.export\",\"employee.view\",\"employee.create\",\"employee.edit\",\"employee.delete\",\"employee.export\",\"supplier.view\",\"supplier.create\",\"supplier.edit\",\"supplier.delete\",\"supplier.export\",\"debt.view\",\"debt.create\",\"debt.edit\",\"debt.approve\",\"debt.export\",\"location.view\",\"location.create\",\"location.edit\",\"location.delete\",\"hse.view\",\"hse.create\",\"hse.edit\",\"hse.approve\",\"hse.export\",\"timesheet.view\",\"timesheet.create\",\"timesheet.edit\",\"timesheet.approve\",\"timesheet.export\",\"audit.view\",\"audit.export\",\"user_management.view\",\"user_management.create\",\"user_management.edit\",\"user_management.delete\",\"user_management.manage\"]");
            seedRole("ROLE_MANAGER", "Manager", "Operational Manager", "[\"dashboard.view\",\"production.view\",\"production.create\",\"production.edit\",\"production.approve\",\"production.export\",\"fleet.view\",\"fleet.approve\",\"fleet.export\",\"mutation.view\",\"mutation.approve\",\"mutation.export\",\"inventory.view\",\"inventory.create\",\"inventory.edit\",\"inventory.approve\",\"inventory.export\",\"maintenance.view\",\"maintenance.approve\",\"maintenance.export\",\"employee.view\",\"employee.export\",\"supplier.view\",\"supplier.export\",\"debt.view\",\"debt.approve\",\"debt.export\",\"location.view\",\"hse.view\",\"hse.approve\",\"hse.export\",\"timesheet.view\",\"timesheet.approve\",\"timesheet.export\",\"audit.view\",\"audit.export\"]");
            seedRole("ROLE_STOCK_MANAGER", "Stock Manager", "Inventory & Stock Data Manager", "[\"dashboard.view\",\"inventory.view\",\"inventory.create\",\"inventory.edit\",\"inventory.export\"]");
            seedRole("ROLE_STORE_EMPLOYEE", "Store Employee", "Store Issue & Daily Inventory Operations", "[\"inventory.view\",\"inventory.create\",\"inventory.edit\"]");
            seedRole("ROLE_SUPERVISOR", "Supervisor", "Site & Operations Supervisor", "[\"dashboard.view\",\"production.view\",\"production.create\",\"production.edit\",\"production.export\",\"fleet.view\",\"fleet.create\",\"fleet.edit\",\"mutation.view\",\"mutation.create\",\"mutation.edit\",\"inventory.view\",\"inventory.create\",\"inventory.edit\",\"inventory.export\",\"maintenance.view\",\"maintenance.create\",\"maintenance.edit\",\"maintenance.export\",\"employee.view\",\"supplier.view\",\"supplier.create\",\"debt.view\",\"location.view\",\"hse.view\",\"hse.create\",\"hse.edit\",\"timesheet.view\",\"timesheet.create\",\"timesheet.edit\",\"audit.view\"]");
            seedRole("ROLE_OPERATOR", "Operator", "Daily Operations Input", "[\"dashboard.view\",\"production.view\",\"production.create\",\"fleet.view\",\"mutation.view\",\"mutation.create\",\"inventory.view\",\"inventory.create\",\"maintenance.view\",\"maintenance.create\",\"hse.view\",\"hse.create\",\"timesheet.view\",\"timesheet.create\"]");
            seedRole("ROLE_VIEWER", "Viewer", "Read-Only Access", "[\"dashboard.view\",\"production.view\",\"fleet.view\",\"mutation.view\",\"inventory.view\",\"maintenance.view\",\"employee.view\",\"supplier.view\",\"debt.view\",\"location.view\",\"hse.view\",\"timesheet.view\",\"audit.view\"]");

            Role adminRole = roleRepository.findByCodeIgnoreCase("ROLE_SUPER_ADMIN")
                    .orElseThrow(() -> new IllegalStateException("ROLE_SUPER_ADMIN not found"));

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

            // Ensure myohlaingoo Super Administrator account exists
            Optional<User> myohlaingooOpt = userRepository.findByUsernameIgnoreCase("myohlaingoo");
            if (myohlaingooOpt.isEmpty()) {
                String myohlaingooPassword = System.getenv("MYOHLAINGOO_PASSWORD");
                if (myohlaingooPassword == null || myohlaingooPassword.isBlank()) {
                    myohlaingooPassword = System.getenv("ADMIN_PASSWORD");
                }
                if (myohlaingooPassword == null || myohlaingooPassword.isBlank()) {
                    myohlaingooPassword = "admin123";
                }

                User myohlaingooUser = new User();
                myohlaingooUser.setUsername("myohlaingoo");
                myohlaingooUser.setEmail("myohlaingoo@jpmonitor.com");
                myohlaingooUser.setFullName("Myo Hlaing Oo");
                myohlaingooUser.setIsActive(true);
                myohlaingooUser.setRole(adminRole);
                myohlaingooUser.setPasswordHash(passwordEncoder.encode(myohlaingooPassword));
                userRepository.save(myohlaingooUser);
                log.info("Seeded super admin user: myohlaingoo");
            } else {
                User myohlaingooUser = myohlaingooOpt.get();
                boolean updated = false;
                if (!myohlaingooUser.getRole().getId().equals(adminRole.getId())) {
                    myohlaingooUser.setRole(adminRole);
                    updated = true;
                }
                if (Boolean.FALSE.equals(myohlaingooUser.getIsActive())) {
                    myohlaingooUser.setIsActive(true);
                    updated = true;
                }
                if (updated) {
                    userRepository.save(myohlaingooUser);
                    log.info("Updated existing myohlaingoo user to ROLE_SUPER_ADMIN and active status");
                }
            }

            // Ensure nwenwekhant Stock Manager account exists
            Role stockManagerRole = roleRepository.findByCodeIgnoreCase("ROLE_STOCK_MANAGER")
                    .orElseThrow(() -> new IllegalStateException("ROLE_STOCK_MANAGER not found"));

            Optional<User> nwenwekhantOpt = userRepository.findByUsernameIgnoreCase("nwenwekhant");
            if (nwenwekhantOpt.isEmpty()) {
                User nwenwekhantUser = new User();
                nwenwekhantUser.setUsername("nwenwekhant");
                nwenwekhantUser.setEmail("nwenwekhant@jpmonitor.com");
                nwenwekhantUser.setFullName("Nwe Nwe Khant");
                nwenwekhantUser.setIsActive(true);
                nwenwekhantUser.setRole(stockManagerRole);
                nwenwekhantUser.setPasswordHash(passwordEncoder.encode("nwenwekhant123"));
                userRepository.save(nwenwekhantUser);
                log.info("Seeded stock manager user: nwenwekhant");
            } else {
                User nwenwekhantUser = nwenwekhantOpt.get();
                boolean updated = false;
                if (!nwenwekhantUser.getRole().getId().equals(stockManagerRole.getId())) {
                    nwenwekhantUser.setRole(stockManagerRole);
                    updated = true;
                }
                if (Boolean.FALSE.equals(nwenwekhantUser.getIsActive())) {
                    nwenwekhantUser.setIsActive(true);
                    updated = true;
                }
                if (!passwordEncoder.matches("nwenwekhant123", nwenwekhantUser.getPasswordHash())) {
                    nwenwekhantUser.setPasswordHash(passwordEncoder.encode("nwenwekhant123"));
                    updated = true;
                }
                if (updated) {
                    userRepository.save(nwenwekhantUser);
                    log.info("Updated existing nwenwekhant user to ROLE_STOCK_MANAGER and active status with reset password");
                }
            }

            // Ensure 5 demo Store Employee accounts exist
            Role storeEmployeeRole = roleRepository.findByCodeIgnoreCase("ROLE_STORE_EMPLOYEE")
                    .orElseGet(() -> roleRepository.findByCodeIgnoreCase("ROLE_OPERATOR")
                    .orElse(stockManagerRole));

            String[][] storeEmployeeSeed = {
                {"store01", "Store Staff 1", "store01@jpmonitor.com"},
                {"store02", "Store Staff 2", "store02@jpmonitor.com"},
                {"store03", "Store Staff 3", "store03@jpmonitor.com"},
                {"store04", "Store Staff 4", "store04@jpmonitor.com"},
                {"store05", "Store Staff 5", "store05@jpmonitor.com"}
            };

            for (String[] emp : storeEmployeeSeed) {
                String uName = emp[0];
                String fName = emp[1];
                String uEmail = emp[2];
                Optional<User> empOpt = userRepository.findByUsernameIgnoreCase(uName);
                if (empOpt.isEmpty()) {
                    User storeUser = new User();
                    storeUser.setUsername(uName);
                    storeUser.setEmail(uEmail);
                    storeUser.setFullName(fName);
                    storeUser.setIsActive(true);
                    storeUser.setRole(storeEmployeeRole);
                    storeUser.setPasswordHash(passwordEncoder.encode("store123"));
                    userRepository.save(storeUser);
                    log.info("Seeded store employee user: {}", uName);
                } else {
                    User storeUser = empOpt.get();
                    boolean updated = false;
                    if (!storeUser.getRole().getId().equals(storeEmployeeRole.getId())) {
                        storeUser.setRole(storeEmployeeRole);
                        updated = true;
                    }
                    if (Boolean.FALSE.equals(storeUser.getIsActive())) {
                        storeUser.setIsActive(true);
                        updated = true;
                    }
                    if (!passwordEncoder.matches("store123", storeUser.getPasswordHash())) {
                        storeUser.setPasswordHash(passwordEncoder.encode("store123"));
                        updated = true;
                    }
                    if (updated) {
                        userRepository.save(storeUser);
                        log.info("Updated existing store employee user: {}", uName);
                    }
                }
            }

            // Optional one-time administrator account supplied through deployment secrets.
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
                User savedExtraAdmin = userRepository.saveAndFlush(extraAdmin);
                boolean passwordMatches = passwordEncoder.matches(extraAdminPassword, savedExtraAdmin.getPasswordHash());
                log.warn("Provisioned requested administrator account: {} (active={}, role={}, passwordMatches={})",
                        normalizedUsername, savedExtraAdmin.getIsActive(), "ROLE_SUPER_ADMIN", passwordMatches);
            } else {
                log.warn("Requested administrator seeding skipped: ADMIN_ACCOUNT_USERNAME, ADMIN_ACCOUNT_EMAIL, and ADMIN_ACCOUNT_PASSWORD must all be set");
            }
        };
    }

    private void seedRole(String code, String name, String description, String permissionsJson) {
        Optional<Role> existingOpt = roleRepository.findByCodeIgnoreCase(code);
        if (existingOpt.isEmpty()) {
            Role role = new Role();
            role.setCode(code);
            role.setName(name);
            role.setDescription(description);
            role.setPermissions(permissionsJson);
            roleRepository.save(role);
            log.info("Seeded role: {}", code);
        } else {
            Role existing = existingOpt.get();
            if (!code.equalsIgnoreCase("ROLE_SUPER_ADMIN")) {
                existing.setName(name);
                existing.setDescription(description);
                existing.setPermissions(permissionsJson);
                roleRepository.save(existing);
                log.info("Updated permissions for existing role: {}", code);
            }
        }
    }
}
