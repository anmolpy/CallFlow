package com.callflow.dto;

import com.callflow.entity.AgentAvailabilityStatus;
import java.time.Instant;

public record AgentResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        AgentAvailabilityStatus availabilityStatus,
        Instant createdAt,
        Instant updatedAt
) {
}
