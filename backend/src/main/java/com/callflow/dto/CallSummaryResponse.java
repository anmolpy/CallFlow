package com.callflow.dto;

import com.callflow.entity.CallStatus;
import java.time.Instant;

public record CallSummaryResponse(
        Long id,
        Long customerId,
        String customerName,
        String customerEmail,
        Long agentId,
        String agentName,
        CallStatus status,
        Instant startedAt,
        Instant endedAt,
        Long durationSeconds,
        long noteCount,
        Instant createdAt,
        Instant updatedAt
) {
}
