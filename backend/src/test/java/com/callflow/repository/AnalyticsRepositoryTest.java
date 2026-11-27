package com.callflow.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.callflow.entity.CallStatus;
import com.callflow.repository.CallRepository.AgentPerformanceProjection;
import com.callflow.repository.CallRepository.CallOverviewProjection;
import com.callflow.repository.CallRepository.CallStatusCountProjection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AnalyticsRepositoryTest {

    @Autowired
    private CallRepository callRepository;

    @Test
    void databaseAggregationsComputeOverviewStatusCountsAndAgentPerformance() {
        CallOverviewProjection overview = callRepository.fetchAnalyticsOverview();
        assertThat(overview.getTotalCalls()).isEqualTo(7L);
        assertThat(overview.getCompletedCalls()).isEqualTo(3L);
        assertThat(overview.getMissedCalls()).isEqualTo(1L);
        assertThat(overview.getQueuedCalls()).isEqualTo(1L);
        assertThat(overview.getInProgressCalls()).isEqualTo(1L);
        assertThat(overview.getCancelledCalls()).isEqualTo(1L);
        assertThat(overview.getAverageDurationSeconds()).isEqualTo(341.25);

        Map<CallStatus, Long> statusMap = callRepository.countCallsByStatus().stream()
                .collect(Collectors.toMap(CallStatusCountProjection::getStatus, CallStatusCountProjection::getCount));
        assertThat(statusMap).containsEntry(CallStatus.COMPLETED, 3L)
                .containsEntry(CallStatus.MISSED, 1L)
                .containsEntry(CallStatus.QUEUED, 1L)
                .containsEntry(CallStatus.IN_PROGRESS, 1L)
                .containsEntry(CallStatus.CANCELLED, 1L);

        List<AgentPerformanceProjection> performance = callRepository.fetchAgentPerformance();
        assertThat(performance).hasSize(4);
        assertThat(performance.get(0).getEmail()).isEqualTo("jordan.taylor@callflow.local");
        assertThat(performance.get(0).getCompletedCalls()).isEqualTo(2L);
        assertThat(performance.get(0).getAverageDurationSeconds()).isEqualTo(367.5);

        assertThat(performance.get(1).getEmail()).isEqualTo("maya.lin@callflow.local");
        assertThat(performance.get(1).getTotalCalls()).isEqualTo(2L);
        assertThat(performance.get(1).getCompletedCalls()).isEqualTo(1L);
        assertThat(performance.get(1).getAverageDurationSeconds()).isEqualTo(600.0);

        assertThat(performance.get(2).getEmail()).isEqualTo("devon.brooks@callflow.local");
        assertThat(performance.get(2).getMissedCalls()).isEqualTo(1L);

        assertThat(performance.get(3).getEmail()).isEqualTo("alex.rivera@callflow.local");
        assertThat(performance.get(3).getTotalCalls()).isEqualTo(0L);
        assertThat(performance.get(3).getAverageDurationSeconds()).isEqualTo(0.0);
    }

    @Test
    void fetchAnalyticsOverviewReturnsZerosWhenNoCallsExist() {
        callRepository.deleteAll();
        callRepository.flush();

        CallOverviewProjection overview = callRepository.fetchAnalyticsOverview();
        assertThat(overview.getTotalCalls()).isZero();
        assertThat(overview.getCompletedCalls()).isZero();
        assertThat(overview.getMissedCalls()).isZero();
        assertThat(overview.getAverageDurationSeconds()).isZero();
    }
}
