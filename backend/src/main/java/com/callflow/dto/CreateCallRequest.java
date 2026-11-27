package com.callflow.dto;

import com.callflow.entity.CallStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateCallRequest(
        @NotNull(message = "Customer ID is required")
        Long customerId,

        Long agentId,

        CallStatus status,

        Instant startedAt,

        Instant endedAt,

        @Min(value = 0, message = "Duration cannot be negative")
        Long durationSeconds,

        @Size(max = 2000, message = "Initial note must not exceed 2000 characters")
        String initialNote
) {
}
