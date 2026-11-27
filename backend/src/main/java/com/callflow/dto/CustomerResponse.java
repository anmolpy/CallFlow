package com.callflow.dto;

import java.time.Instant;

public record CustomerResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        Instant createdAt,
        Instant updatedAt
) {
}
