package com.callflow.dto;

import com.callflow.entity.AgentAvailabilityStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateAgentAvailabilityRequest(
        @NotNull(message = "Availability status is required")
        AgentAvailabilityStatus availabilityStatus
) {
}
