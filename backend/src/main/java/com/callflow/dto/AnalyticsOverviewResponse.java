package com.callflow.dto;

public record AnalyticsOverviewResponse(
        long totalCalls,
        long completedCalls,
        long missedCalls,
        long queuedCalls,
        long inProgressCalls,
        long cancelledCalls,
        double averageDurationSeconds
) {
}
