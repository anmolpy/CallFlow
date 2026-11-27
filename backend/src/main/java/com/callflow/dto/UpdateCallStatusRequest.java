package com.callflow.dto;

import com.callflow.entity.CallStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record UpdateCallStatusRequest(
        @NotNull(message = "Target call status is required")
        CallStatus status,

        Instant startedAt,

        Instant endedAt,

        @Min(value = 0, message = "Duration cannot be negative")
        Long durationSeconds
) {
}
