package com.callflow.dto;

import com.callflow.entity.AgentAvailabilityStatus;

public record AgentPerformanceResponse(
        Long agentId,
        String agentName,
        String email,
        AgentAvailabilityStatus availabilityStatus,
        long totalCalls,
        long completedCalls,
        long missedCalls,
        double averageDurationSeconds
) {
}
