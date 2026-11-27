package com.callflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "JWT login response containing bearer token and user profile")
public record AuthResponse(
        @Schema(description = "Signed JWT access token")
        String accessToken,

        @Schema(description = "Authorization scheme", example = "Bearer")
        String tokenType,

        @Schema(description = "Token validity duration in milliseconds", example = "86400000")
        long expiresInMs,

        @Schema(description = "Authenticated user details")
        UserProfileResponse user
) {
}
