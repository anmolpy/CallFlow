package com.callflow.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.callflow.dto.AuthResponse;
import com.callflow.dto.LoginRequest;
import com.callflow.entity.User;
import com.callflow.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(new JwtProperties("callflow_test_secret_key_with_minimum_32_bytes_length", 3600000L));
        authService = new AuthService(authenticationManager, jwtService);
    }

    @Test
    void loginAuthenticatesTrimsEmailAndReturnsJwtResponse() {
        User user = new User();
        user.setId(5L);
        user.setEmail("admin@callflow.local");
        user.setFullName("System Administrator");
        user.setPasswordHash("$2a$10$encoded");
        user.setRole(UserRole.ADMIN);
        user.setEnabled(true);
        UserPrincipal principal = new UserPrincipal(user);

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);

        AuthResponse response = authService.login(new LoginRequest("  admin@callflow.local  ", "secret123"));

        ArgumentCaptor<UsernamePasswordAuthenticationToken> tokenCaptor =
                ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
        org.mockito.Mockito.verify(authenticationManager).authenticate(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getPrincipal()).isEqualTo("admin@callflow.local");

        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresInMs()).isEqualTo(3600000L);
        assertThat(response.accessToken()).isNotBlank();
        assertThat(jwtService.extractSubject(response.accessToken())).isEqualTo("admin@callflow.local");
        assertThat(response.user().role()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void loginPropagatesAuthenticationExceptionOnInvalidCredentials() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new LoginRequest("admin@callflow.local", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
