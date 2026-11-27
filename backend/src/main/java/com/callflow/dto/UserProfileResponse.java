package com.callflow.dto;

import com.callflow.entity.UserRole;

public record UserProfileResponse(
        Long id,
        String email,
        String fullName,
        UserRole role
) {
}
