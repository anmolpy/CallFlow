package com.callflow.dto;

import com.callflow.entity.CallStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

@Schema(description = "Payload for transitioning a call status")
public record UpdateCallStatusRequest(
        @Schema(description = "Target call lifecycle status", example = "COMPLETED")
        @NotNull(message = "Target call status is required")
        CallStatus status,

        @Schema(description = "Optional UTC start timestamp")
        Instant startedAt,

        @Schema(description = "Optional UTC end timestamp (defaults to current time when completing)")
        Instant endedAt,

        @Schema(description = "Optional explicit duration in seconds")
        @Min(value = 0, message = "Duration cannot be negative")
        Long durationSeconds
) {
}
