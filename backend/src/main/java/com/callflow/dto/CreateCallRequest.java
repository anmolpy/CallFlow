package com.callflow.dto;

import com.callflow.entity.CallStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

@Schema(description = "Payload for creating a new support call")
public record CreateCallRequest(
        @Schema(description = "ID of the customer placing or receiving the call", example = "1")
        @NotNull(message = "Customer ID is required")
        Long customerId,

        @Schema(description = "Optional eligible agent ID to assign immediately", example = "1")
        Long agentId,

        @Schema(description = "Initial call status (defaults to QUEUED)", example = "QUEUED")
        CallStatus status,

        @Schema(description = "Optional UTC start timestamp (auto-set when status is IN_PROGRESS)")
        Instant startedAt,

        @Schema(description = "Optional UTC end timestamp (required when status is COMPLETED)")
        Instant endedAt,

        @Schema(description = "Optional non-negative duration in seconds (auto-calculated from timestamps when omitted)", example = "300")
        @Min(value = 0, message = "Duration cannot be negative")
        Long durationSeconds,

        @Schema(description = "Optional initial call note", example = "Customer called regarding monthly invoice.")
        @Size(max = 2000, message = "Initial note must not exceed 2000 characters")
        String initialNote
) {
}
