package com.callflow.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresInMs,
        UserProfileResponse user
) {
}
