package com.callflow.security;

import com.callflow.entity.User;
import com.callflow.entity.UserRole;
import com.callflow.repository.UserRepository;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String adminEmail;
    private final String adminPassword;
    private final String agentEmail;
    private final String agentPassword;

    public DevDataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.enabled:false}") boolean enabled,
            @Value("${app.seed.admin-email:admin@callflow.local}") String adminEmail,
            @Value("${app.seed.admin-password:}") String adminPassword,
            @Value("${app.seed.agent-email:agent@callflow.local}") String agentEmail,
            @Value("${app.seed.agent-password:}") String agentPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.agentEmail = agentEmail;
        this.agentPassword = agentPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        seedUserIfConfigured(adminEmail, adminPassword, "System Administrator", UserRole.ADMIN);
        seedUserIfConfigured(agentEmail, agentPassword, "Jordan Taylor", UserRole.AGENT);
    }

    private void seedUserIfConfigured(String email, String rawPassword, String fullName, UserRole role) {
        if (rawPassword == null || rawPassword.isBlank()) {
            log.warn("Skipping dev user seed for {} because password env var is not configured", email);
            return;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            return;
        }
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setEnabled(true);
        userRepository.save(user);
        log.info("Seeded dev user {} with role {}", normalizedEmail, role);
    }
}
