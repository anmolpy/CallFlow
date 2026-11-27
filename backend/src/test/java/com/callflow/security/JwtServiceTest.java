package com.callflow.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.callflow.entity.User;
import com.callflow.entity.UserRole;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String VALID_SECRET = "callflow_test_secret_key_with_minimum_32_bytes_length";

    @Test
    void constructorRejectsBlankOrShortSecrets() {
        assertThatThrownBy(() -> new JwtService(new JwtProperties("", 60000L)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");

        assertThatThrownBy(() -> new JwtService(new JwtProperties("too-short-secret", 60000L)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }

    @Test
    void generatesAndValidatesTokenForMatchingPrincipal() {
        JwtService jwtService = new JwtService(new JwtProperties(VALID_SECRET, 60000L));
        UserPrincipal admin = principal(1L, "admin@callflow.local", UserRole.ADMIN, true);
        UserPrincipal other = principal(2L, "agent@callflow.local", UserRole.AGENT, true);

        String token = jwtService.generateToken(admin);

        assertThat(jwtService.extractSubject(token)).isEqualTo("admin@callflow.local");
        assertThat(jwtService.getExpirationMs()).isEqualTo(60000L);
        assertThat(jwtService.isTokenValid(token, admin)).isTrue();
        assertThat(jwtService.isTokenValid(token, other)).isFalse();
        assertThat(jwtService.isTokenValid("invalid.jwt.token", admin)).isFalse();
    }

    @Test
    void rejectsExpiredOrTamperedToken() {
        JwtService expiredJwtService = new JwtService(new JwtProperties(VALID_SECRET, -1000L));
        UserPrincipal principal = principal(1L, "admin@callflow.local", UserRole.ADMIN, true);

        String expiredToken = expiredJwtService.generateToken(principal);
        assertThat(expiredJwtService.isTokenValid(expiredToken, principal)).isFalse();

        JwtService otherKeyService = new JwtService(
                new JwtProperties("another_completely_different_32_byte_secret_key", 60000L)
        );
        String tokenFromOtherKey = otherKeyService.generateToken(principal);

        JwtService verifier = new JwtService(new JwtProperties(VALID_SECRET, 60000L));
        assertThat(verifier.isTokenValid(tokenFromOtherKey, principal)).isFalse();
        assertThatThrownBy(() -> verifier.extractSubject(tokenFromOtherKey))
                .isInstanceOf(JwtException.class);
    }

    private UserPrincipal principal(Long id, String email, UserRole role, boolean enabled) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setFullName("Test User");
        user.setPasswordHash("$2a$10$hash");
        user.setRole(role);
        user.setEnabled(enabled);
        return new UserPrincipal(user);
    }
}
