package com.callflow.service;

import com.callflow.dto.AgentPerformanceResponse;
import com.callflow.dto.AnalyticsOverviewResponse;
import com.callflow.dto.StatusCountResponse;
import com.callflow.entity.CallStatus;
import com.callflow.repository.CallRepository;
import com.callflow.repository.CallRepository.CallOverviewProjection;
import com.callflow.repository.CallRepository.CallStatusCountProjection;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final CallRepository callRepository;

    public AnalyticsService(CallRepository callRepository) {
        this.callRepository = callRepository;
    }

    public AnalyticsOverviewResponse getOverview() {
        CallOverviewProjection overview = callRepository.fetchAnalyticsOverview();
        return new AnalyticsOverviewResponse(
                overview.getTotalCalls(),
                overview.getCompletedCalls(),
                overview.getMissedCalls(),
                overview.getQueuedCalls(),
                overview.getInProgressCalls(),
                overview.getCancelledCalls(),
                roundTwoDecimals(overview.getAverageDurationSeconds())
        );
    }

    public List<StatusCountResponse> getCallsByStatus() {
        Map<CallStatus, Long> counts = new EnumMap<>(CallStatus.class);
        for (CallStatus status : CallStatus.values()) {
            counts.put(status, 0L);
        }
        for (CallStatusCountProjection row : callRepository.countCallsByStatus()) {
            counts.put(row.getStatus(), row.getCount());
        }
        return Arrays.stream(CallStatus.values())
                .map(status -> new StatusCountResponse(status, counts.get(status)))
                .toList();
    }

    public List<AgentPerformanceResponse> getAgentPerformance() {
        return callRepository.fetchAgentPerformance().stream()
                .map(row -> new AgentPerformanceResponse(
                        row.getAgentId(),
                        row.getFirstName() + " " + row.getLastName(),
                        row.getEmail(),
                        row.getAvailabilityStatus(),
                        row.getTotalCalls(),
                        row.getCompletedCalls(),
                        row.getMissedCalls(),
                        roundTwoDecimals(row.getAverageDurationSeconds())
                ))
                .toList();
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
