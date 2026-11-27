package com.callflow.dto;

import com.callflow.entity.CallStatus;
import java.time.Instant;
import java.util.List;

public record CallDetailResponse(
        Long id,
        Long customerId,
        String customerName,
        String customerEmail,
        String customerPhoneNumber,
        Long agentId,
        String agentName,
        String agentEmail,
        CallStatus status,
        Instant startedAt,
        Instant endedAt,
        Long durationSeconds,
        List<CallNoteResponse> notes,
        Instant createdAt,
        Instant updatedAt
) {
}
