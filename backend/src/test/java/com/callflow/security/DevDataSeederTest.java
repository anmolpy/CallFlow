package com.callflow.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.callflow.entity.User;
import com.callflow.entity.UserRole;
import com.callflow.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class DevDataSeederTest {

    @Mock
    private UserRepository userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    void seedsAdminAndAgentWithBcryptHashesWhenEnabledAndMissing() {
        when(userRepository.existsByEmailIgnoreCase("admin@callflow.local")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("agent@callflow.local")).thenReturn(false);

        DevDataSeeder seeder = new DevDataSeeder(
                userRepository,
                passwordEncoder,
                true,
                " ADMIN@callflow.local ",
                "AdminPass123!",
                "agent@callflow.local",
                "AgentPass123!"
        );

        seeder.run(new DefaultApplicationArguments());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(2)).save(captor.capture());

        List<User> saved = captor.getAllValues();
        assertThat(saved.get(0).getEmail()).isEqualTo("admin@callflow.local");
        assertThat(saved.get(0).getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(passwordEncoder.matches("AdminPass123!", saved.get(0).getPasswordHash())).isTrue();
        assertThat(saved.get(0).getPasswordHash()).startsWith("$2");

        assertThat(saved.get(1).getEmail()).isEqualTo("agent@callflow.local");
        assertThat(saved.get(1).getRole()).isEqualTo(UserRole.AGENT);
        assertThat(passwordEncoder.matches("AgentPass123!", saved.get(1).getPasswordHash())).isTrue();
    }

    @Test
    void skipsWhenDisabledOrPasswordsBlankOrUsersAlreadyExist() {
        DevDataSeeder disabled = new DevDataSeeder(
                userRepository, passwordEncoder, false,
                "admin@callflow.local", "pass", "agent@callflow.local", "pass"
        );
        disabled.run(new DefaultApplicationArguments());
        verify(userRepository, never()).save(any());

        when(userRepository.existsByEmailIgnoreCase("admin@callflow.local")).thenReturn(true);
        DevDataSeeder partial = new DevDataSeeder(
                userRepository, passwordEncoder, true,
                "admin@callflow.local", "pass", "agent@callflow.local", "   "
        );
        partial.run(new DefaultApplicationArguments());
        verify(userRepository, never()).save(any());
    }
}
