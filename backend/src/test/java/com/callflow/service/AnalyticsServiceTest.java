package com.callflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.callflow.dto.AgentPerformanceResponse;
import com.callflow.dto.AnalyticsOverviewResponse;
import com.callflow.dto.StatusCountResponse;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.entity.CallStatus;
import com.callflow.repository.CallRepository;
import com.callflow.repository.CallRepository.AgentPerformanceProjection;
import com.callflow.repository.CallRepository.CallOverviewProjection;
import com.callflow.repository.CallRepository.CallStatusCountProjection;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private CallRepository callRepository;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(callRepository);
    }

    @Test
    void getOverviewMapsTotalsAndRoundsAverageDuration() {
        when(callRepository.fetchAnalyticsOverview()).thenReturn(new CallOverviewProjection() {
            @Override
            public long getTotalCalls() {
                return 12L;
            }

            @Override
            public long getCompletedCalls() {
                return 7L;
            }

            @Override
            public long getMissedCalls() {
                return 2L;
            }

            @Override
            public long getQueuedCalls() {
                return 1L;
            }

            @Override
            public long getInProgressCalls() {
                return 1L;
            }

            @Override
            public long getCancelledCalls() {
                return 1L;
            }

            @Override
            public double getAverageDurationSeconds() {
                return 341.256;
            }
        });

        AnalyticsOverviewResponse overview = analyticsService.getOverview();

        assertThat(overview.totalCalls()).isEqualTo(12L);
        assertThat(overview.completedCalls()).isEqualTo(7L);
        assertThat(overview.missedCalls()).isEqualTo(2L);
        assertThat(overview.queuedCalls()).isEqualTo(1L);
        assertThat(overview.inProgressCalls()).isEqualTo(1L);
        assertThat(overview.cancelledCalls()).isEqualTo(1L);
        assertThat(overview.averageDurationSeconds()).isEqualTo(341.26);
    }

    @Test
    void getCallsByStatusZeroFillsMissingStatusesInEnumOrder() {
        when(callRepository.countCallsByStatus()).thenReturn(List.of(
                statusCount(CallStatus.COMPLETED, 5L),
                statusCount(CallStatus.QUEUED, 2L)
        ));

        List<StatusCountResponse> result = analyticsService.getCallsByStatus();

        assertThat(result).containsExactly(
                new StatusCountResponse(CallStatus.QUEUED, 2L),
                new StatusCountResponse(CallStatus.IN_PROGRESS, 0L),
                new StatusCountResponse(CallStatus.COMPLETED, 5L),
                new StatusCountResponse(CallStatus.MISSED, 0L),
                new StatusCountResponse(CallStatus.CANCELLED, 0L)
        );
    }

    @Test
    void getAgentPerformanceFormatsNamesAndRoundsDuration() {
        when(callRepository.fetchAgentPerformance()).thenReturn(List.of(new AgentPerformanceProjection() {
            @Override
            public Long getAgentId() {
                return 1L;
            }

            @Override
            public String getFirstName() {
                return "Jordan";
            }

            @Override
            public String getLastName() {
                return "Taylor";
            }

            @Override
            public String getEmail() {
                return "jordan.taylor@callflow.local";
            }

            @Override
            public AgentAvailabilityStatus getAvailabilityStatus() {
                return AgentAvailabilityStatus.AVAILABLE;
            }

            @Override
            public long getTotalCalls() {
                return 4L;
            }

            @Override
            public long getCompletedCalls() {
                return 3L;
            }

            @Override
            public long getMissedCalls() {
                return 1L;
            }

            @Override
            public double getAverageDurationSeconds() {
                return 123.454;
            }
        }));

        List<AgentPerformanceResponse> performance = analyticsService.getAgentPerformance();

        assertThat(performance).containsExactly(new AgentPerformanceResponse(
                1L,
                "Jordan Taylor",
                "jordan.taylor@callflow.local",
                AgentAvailabilityStatus.AVAILABLE,
                4L,
                3L,
                1L,
                123.45
        ));
    }

    private CallStatusCountProjection statusCount(CallStatus status, long count) {
        return new CallStatusCountProjection() {
            @Override
            public CallStatus getStatus() {
                return status;
            }

            @Override
            public long getCount() {
                return count;
            }
        };
    }
}
