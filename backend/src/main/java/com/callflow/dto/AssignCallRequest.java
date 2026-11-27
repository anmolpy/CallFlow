package com.callflow.dto;

import jakarta.validation.constraints.NotNull;

public record AssignCallRequest(
        @NotNull(message = "Agent ID is required")
        Long agentId
) {
}
