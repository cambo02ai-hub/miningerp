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

            // Seed 68 Employees from company register
            String[][] employeeData68 = {
                {"A0002", "ဦးတင်ထူးအောင်", "ဦးထွန်းရင်", "STN-ALP-A0002", "@stnA0002", "၉/မကန(နိုင်)၀၆၁၅၈၉", "ဝါးဘို"},
                {"A0003", "ဦးကျော်ဝင်း", "ဦးသောင်းထွန်း", "STN-ALP-A0003", "@stnA0003", "၆/", ""},
                {"A0004", "ဦးနိုင်လင်းထွန်း", "ဦးဌေးဝင်း", "STN-ALP-A0004", "@stnA0004", "၉/မယန(နိုင်)၂၄၃၃၃၇", ""},
                {"A0005", "ဦးဝင်းသောင်", "ဦးဌေးဝင်း", "STN-ALP-A0005", "@stnA0005", "၉/မယန(နိုင်)၁၅၇၄၆၅", ""},
                {"A0006", "မောင်ဝေဖြိုးပိုင်", "ဦးကံကောင်း", "STN-ALP-A0006", "@stnA0006", "၉/ဘအန(နိုင်)၀၅၅၄၄၇", ""},
                {"A0007", "မောင်ဆန်းဝင်းသူ", "ဦးစိန်", "STN-ALP-A0007", "@stnA0007", "၉/မနမ(နိုင်)၁၀၉၇၇၅", ""},
                {"A0008", "မောင်အောင်ဆန်းဝင်း", "ဦးသန်းလှိုင်", "STN-ALP-A0008", "@stnA0008", "၉/မအလ(နိုင်)၂၁၀၇၃၇", ""},
                {"A0009", "မိုးဟိန်း", "ဦးထွန်းလင်း", "STN-ALP-A0009", "@stnA0009", "၁၃/ကတန(နိုင်)၀၇၆၇၀၃", ""},
                {"A0010", "မောင်ဆန်းဦးထွန်း", "ဦးကျော်စိန်", "STN-ALP-A0010", "@stnA0010", "၁၃/ဟပန(နိုင်)၀၁၁၃၄၃", ""},
                {"A0011", "မောင်ကျော်သန့်", "ဦးလှစိုး", "STN-ALP-A0011", "@stnA0011", "၁၃/ကလတ(နိုင်)၁၁၇၉၀၃", ""},
                {"A0012", "မောင်သန်းထိုက်သူ", "ဦးအောင်ထွန်းလင်း", "STN-ALP-A0012", "@stnA0012", "၁၃/သနန(နိုင်)၀၅၄၉၈၀", ""},
                {"A0013", "ဦးမျိုး", "ဦးတင်လှ", "STN-ALP-A0013", "@stnA0013", "၉/မကန(နိုင်)၀၆၁၅၈၉", ""},
                {"A0014", "မောင်မျိုးသန့်", "ဦးကျော်သန်း", "STN-ALP-A0014", "@stnA0014", "၉/မနမ(နိုင်)၁၄၈၅၁၇", ""},
                {"A0015", "မောင်လှမျိုးဆန်း", "ဦးသန်းစိုး", "STN-ALP-A0015", "@stnA0015", "၇/ရတာ(နိုင်)၁၆၅၄၄၁", ""},
                {"A0016", "မောင်ခိုင်သူ", "ဦးမျိုးမင်းသန့်", "STN-ALP-A0016", "@stnA0016", "၉/မနမ(နိုင်)၁၄၄၄၃၇", ""},
                {"A0017", "မောင်စိုးသူ", "ဦးသန်းအောင်", "STN-ALP-A0017", "@stnA0017", "", ""},
                {"A0018", "ဦးအောင်မျိုး", "ဦးဉာဏ်ထွန်း", "STN-ALP-A0018", "@stnA0018", "၉/မယန(နိုင်)၀၄၁၆၅၂", ""},
                {"A0019", "မောင်ဆန်းထွန်း", "ဦးကျောက်တိုင်", "STN-ALP-A0019", "@stnA0019", "၇/မအတ(နိုင်)၁၅၈၇၀၅", ""},
                {"A0020", "မောင်ဆန်းလင်း", "ဦးဆန်းမောင်", "STN-ALP-A0020", "@stnA0020", "", "ဝါးဘို"},
                {"A0021", "မောင်မျိုးသန့်", "ဦးအေးစိန်", "STN-ALP-A0021", "@stnA0021", "၅/ရဘန(နိုင်)၁၃၉၀၄၇", "ဝါးဘို"},
                {"A0022", "မောင်ဆန်းဆန်းထွေး", "", "STN-ALP-A0022", "@stnA0022", "", ""},
                {"A0023", "မောင်ပိုင်ချမ်းသာ", "ဦးကျော်ထူး", "STN-ALP-A0023", "@stnA0023", "၉/မယန(နိုင်)၂၄၃၃၃၇", ""},
                {"A0024", "မောင်ဖိုးပြည့်", "ဦးအောင်မြင့်", "STN-ALP-A0024", "@stnA0024", "၁၃/", ""},
                {"A0025", "မောင်ဆန်းဝင်းပိုင်", "ဦးမြတ်ဝင်း", "STN-ALP-A0025", "@stnA0025", "(ဒ်ု)၀၃၂၅၅၂", ""},
                {"A0026", "မောင်ဆန်းအောင်သူ", "ဦးအောင်လွင်", "STN-ALP-A0026", "@stnA0026", "၅/ဒပယ(နိုင်)၁၃၇၂၀၅", ""},
                {"A0027", "မောင်အောင်မျိုးသန့်", "ဦးအောင်စိန်", "STN-ALP-A0027", "@stnA0027", "၁၂/မကန(နိုင်)၀၃၅၄၄၅", ""},
                {"A0028", "မောင်ပြည့်ဖြိုးအောင်", "ဦးဝင်းဟန်", "STN-ALP-A0028", "@stnA0028", "၁၂/မနမ(နိုင်)၁၄၃၇၀၁", ""},
                {"A0029", "မောင်မျိုးပိုင်", "ဦးစိန်ခိုင်", "STN-ALP-A0029", "@stnA0029", "၁၃/", ""},
                {"A0030", "မောင်ကျော်သူဦး", "", "STN-ALP-A0030", "@stnA0030", "၁၃/၀၇၆၆၆၂", ""},
                {"A0031", "မောင်ခိုင်", "", "STN-ALP-A0031", "@stnA0031", "", ""},
                {"A0032", "ဦးသောင်ထန်း", "", "STN-ALP-A0032", "@stnA0032", "မရှိ", ""},
                {"A0033", "မောင်ချမ်းမြေ့", "ဦးထွန်း", "STN-ALP-A0033", "@stnA0033", "၉/မနမ(နိုင်)၁၄၄၇၀၃", ""},
                {"A0034", "မောင်ဝင်းစက်ပိုင်", "ဦးတင်မြင့်", "STN-ALP-A0034", "@stnA0034", "၁၂/မနမ(နိုင်)၀၁၅၂၂၆", ""},
                {"A0035", "မောင်ထာပြည့်စုံ", "ဦးတင်မျိုးနိုင်", "STN-ALP-A0035", "@stnA0035", "၁၂/မနမ(နိုင်)၁၂၅၀၇၃", ""},
                {"A0036", "မဝေဝေမွန်", "ဦးထွန်းဌေး", "STN-ALP-A0036", "@stnA0036", "မရှိ", "ဝါးဘို"},
                {"A0037", "မစန်းစန်းနွယ်", "ဦးဆန်းဌေး", "STN-ALP-A0037", "@stnA0037", "မရှိ", ""},
                {"A0038", "ဒေါ်စုမွန်", "ဦးတင်ဝင်း", "STN-ALP-A0038", "@stnA0038", "၉/မကန(နိုင်)၀၆၁၅၈၈", ""},
                {"A0039", "မအိအိနွယ်", "ဦးလှမျိုး", "STN-ALP-A0039", "@stnA0039", "၉/မနမ(နိုင်)၁၄၁၅၈၇", "မြိုင်မြိုင်"},
                {"A0040", "မဝေဝေအောင်(ခ)မခိုင်", "ဦးကျော်မြင့်", "STN-ALP-A0040", "@stnA0040", "၁၄/မအပ(နိုင်)၀၇၃၈၁၁", "ဆင်မ‌လေး"},
                {"A0041", "ကိုနိုင်ကိုလင်း", "ဦးလှထွေး", "STN-ALP-A0041", "@stnA0041", "၃/ဘအန(နိုင်)၀၀၀၄၄၂", "ဆင်မ‌လေး"},
                {"A0042", "မောင်မျိုးသူ", "ဦးထက်အောင်", "STN-ALP-A0042", "@stnA0042", "၇/မအတ(နိုင်)၂၂၄၆၄၅", ""},
                {"A0043", "မောင်ကျော်သူ", "ဦးစိုးနောင်", "STN-ALP-A0043", "@stnA0043", "၅/မနမ(နိုင်)၁၂၂၀၇၇", ""},
                {"A0044", "မောင်ကျော်စိုး", "ဦးဘိုနီ", "STN-ALP-A0044", "@stnA0044", "၇/တငန(နိုင်)၁၈၄၆၆၆", ""},
                {"A0045", "မောင်မျိုးမင်း", "ဦးဝင်းဌေး", "STN-ALP-A0045", "@stnA0045", "၈/မကန(နိုင်)၃၃၉၃၆၀", ""},
                {"A0046", "မောင်တောရာစိုး", "ဦးဝင်းဝေ", "STN-ALP-A0046", "@stnA0046", "၅/မနမ(နိုင်)၃၆၀၇၆၀", ""},
                {"A0047", "မောင်ထွေးလှိုင်", "ဦးတင်စိန်", "STN-ALP-A0047", "@stnA0047", "၅/ကသန(နိုင်)၁၁၁၄၆၉", ""},
                {"A0048", "မောင်ထွေးပိုင်", "ဦးမျိုးချစ်", "STN-ALP-A0048", "@stnA0048", "၅/ကသန(နိုင်)၁၈၇၇၁၅", ""},
                {"A0049", "မောင်ထွန်းကောင်", "ဦးကျော်ဝင်းစိန်", "STN-ALP-A0049", "@stnA0049", "၇/မအတ(နိုင်)၁၅၈ရ၃၇", ""},
                {"A0050", "မောင်လင်းထူး", "ဦးသောင်းထွန်း", "STN-ALP-A0050", "@stnA0050", "၇/ကတန(နိုင်)၁၃၀၃၆၀", ""},
                {"A0051", "မပြည့်စုံ", "ဦးအေးဌေး", "STN-ALP-A0051", "@stnA0051", "၅/မနမ(နိုင်)၂၅၈၁၁၂", ""},
                {"A0052", "မစန်းစန်းအေး", "ဦးချစ်အောင်", "STN-ALP-A0052", "@stnA0052", "၅/မနမ(နိုင်)၀၀၆၂၀၇", "လက်ပံလှ"},
                {"A0053", "မောင်ယုနိုင်", "ဦးမျိုးအောင်", "STN-ALP-A0053", "@stnA0053", "", ""},
                {"A0054", "မောင်ထက်ထက်ပိုင်", "", "STN-ALP-A0054", "@stnA0054", "", ""},
                {"A0055", "ဦးချစ်စန်း", "", "STN-ALP-A0055", "@stnA0055", "", ""},
                {"A0056", "မောင်ကျော်ဆန်းဝင်း", "ဦးကျော်အောင်", "STN-ALP-A0056", "@stnA0056", "မရှိ", ""},
                {"A0057", "မောင်မျိုးဆန်းအောင်", "ဦးစန်းမြင့်", "STN-ALP-A0057", "@stnA0057", "မရှိ", ""},
                {"A0058", "မောင်မျိုးထက်အောင်", "ဦးကျော်အောင်", "STN-ALP-A0058", "@stnA0058", "မရှိ", ""},
                {"A0059", "မောင်ပြည့်ဖြိုးဝင်း", "ဦးကြီးကို", "STN-ALP-A0059", "@stnA0059", "၉/နထက(နိုင်)၁၄၄၇၈၇", ""},
                {"A0060", "မောင်စိုးဝင်း", "ဦးအောင်ထွန်း", "STN-ALP-A0060", "@stnA0060", "၉/မနမ(နိုင်)၁၂၅၇၄၄", ""},
                {"A0061", "မောင်သက္ကားပိုင်", "ဦးထွန်းလွင်", "STN-ALP-A0061", "@stnA0061", "၉/ပယန(နိုင်)၁၄၃၂၆၅", ""},
                {"A0062", "မောင်ဆန်းလင်း", "ဦးဝင်း", "STN-ALP-A0062", "@stnA0062", "၉/မနမ(နိုင်)၁၉၆၄၃၂", ""},
                {"A0063", "မောင်မျိုးမြတ်ထွန်း", "ဦးစန်း", "STN-ALP-A0063", "@stnA0063", "၉/မနမ(နိုင်)၂၁၂၅၄၂", ""},
                {"A0064", "မောင်ဝင်းမင်းဌေး", "ဦးဟန်းသောင်", "STN-ALP-A0064", "@stnA0064", "၉/မနမ(နိုင်)၁၄၄၆၃၉", ""},
                {"A0065", "မောင်စိုးသူထက်", "ဦးစန်းဝင်း", "STN-ALP-A0065", "@stnA0065", "၉/မနမ(နိုင်)၃၃၃၃၉၃", ""},
                {"A0066", "ဦးနန္ဒကိုဝင်း", "ဦးကျော်အောင်", "STN-ALP-A0066", "@stnA0066", "", "ကန်မြဲ"},
                {"A0067", "မောင်ဟိန်းထက်အောင်", "ဦးမြိုင်", "STN-ALP-A0067", "@stnA0067", "၉/မနမ(နိုင်)၁၇၃၆၁၀", ""},
                {"A0068", "မောင်မင်းသူအောင်", "ဦးလှစိန်", "STN-ALP-A0068", "@stnA0068", "၉/မနမ(နိုင်)၁၀၀၆၂၇", ""},
                {"A0069", "မဆန်းဆန်းထွေး", "ဦးမြတ်စိုး", "STN-ALP-A0069", "@stnA0069", "၉/မနမ(နိုင်)၁၅၀ရ၇၇", ""}
            };

            Role operatorRole = roleRepository.findByCodeIgnoreCase("ROLE_OPERATOR")
                    .orElseGet(() -> roleRepository.findByCodeIgnoreCase("ROLE_VIEWER").orElse(adminRole));

            for (String[] emp : employeeData68) {
                String uName = emp[0];
                String fName = emp[1];
                String fatherName = emp[2];
                String empId = emp[3];
                String rawPwd = emp[4];
                String nrc = emp[5];
                String addr = emp[6];

                Optional<User> empOpt = userRepository.findByUsernameIgnoreCase(uName);
                if (empOpt.isEmpty()) {
                    User opUser = new User();
                    opUser.setUsername(uName);
                    opUser.setEmail(uName.toLowerCase() + "@jpmonitor.com");
                    opUser.setFullName(fName);
                    opUser.setFatherName(fatherName.isBlank() ? null : fatherName);
                    opUser.setEmployeeId(empId);
                    opUser.setDepartment("ထုတ်လုပ်ရေး");
                    opUser.setSite("ထုတ်လုပ်ရေး");
                    opUser.setIsActive(true);
                    opUser.setRole(operatorRole);
                    opUser.setPasswordHash(passwordEncoder.encode(rawPwd));
                    userRepository.save(opUser);
                    log.info("Seeded employee user: {} ({})", uName, fName);
                } else {
                    User opUser = empOpt.get();
                    boolean updated = false;
                    if (fatherName != null && !fatherName.isBlank() && !fatherName.equals(opUser.getFatherName())) {
                        opUser.setFatherName(fatherName);
                        updated = true;
                    }
                    if (!empId.equals(opUser.getEmployeeId())) {
                        opUser.setEmployeeId(empId);
                        updated = true;
                    }
                    if (!"ထုတ်လုပ်ရေး".equals(opUser.getDepartment())) {
                        opUser.setDepartment("ထုတ်လုပ်ရေး");
                        updated = true;
                    }
                    if (!"ထုတ်လုပ်ရေး".equals(opUser.getSite())) {
                        opUser.setSite("ထုတ်လုပ်ရေး");
                        updated = true;
                    }
                    if (updated) {
                        userRepository.save(opUser);
                        log.info("Updated seeded employee user: {}", uName);
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
