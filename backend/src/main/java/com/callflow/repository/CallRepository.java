package com.callflow.repository;

import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.entity.Call;
import com.callflow.entity.CallStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CallRepository extends JpaRepository<Call, Long>, JpaSpecificationExecutor<Call> {

    @Override
    @EntityGraph(attributePaths = {"customer", "agent"})
    Page<Call> findAll(Specification<Call> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "agent", "notes", "notes.authorAgent"})
    Optional<Call> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"customer", "agent"})
    Page<Call> findByCustomerId(Long customerId, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "agent"})
    Page<Call> findByAgentId(Long agentId, Pageable pageable);

    @Query("""
            SELECT n.call.id AS callId, COUNT(n) AS noteCount
            FROM CallNote n
            WHERE n.call.id IN :callIds
            GROUP BY n.call.id
            """)
    List<CallNoteCountProjection> countNotesByCallIds(@Param("callIds") Collection<Long> callIds);

    @Query("""
            SELECT COUNT(c) AS totalCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.COMPLETED THEN 1L ELSE 0L END), 0L) AS completedCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.MISSED THEN 1L ELSE 0L END), 0L) AS missedCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.QUEUED THEN 1L ELSE 0L END), 0L) AS queuedCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.IN_PROGRESS THEN 1L ELSE 0L END), 0L) AS inProgressCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.CANCELLED THEN 1L ELSE 0L END), 0L) AS cancelledCalls,
                   COALESCE(AVG(c.durationSeconds), 0.0) AS averageDurationSeconds
            FROM Call c
            """)
    CallOverviewProjection fetchAnalyticsOverview();

    @Query("SELECT c.status AS status, COUNT(c) AS count FROM Call c GROUP BY c.status")
    List<CallStatusCountProjection> countCallsByStatus();

    @Query("""
            SELECT a.id AS agentId,
                   a.firstName AS firstName,
                   a.lastName AS lastName,
                   a.email AS email,
                   a.availabilityStatus AS availabilityStatus,
                   COUNT(c) AS totalCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.COMPLETED THEN 1L ELSE 0L END), 0L) AS completedCalls,
                   COALESCE(SUM(CASE WHEN c.status = com.callflow.entity.CallStatus.MISSED THEN 1L ELSE 0L END), 0L) AS missedCalls,
                   COALESCE(AVG(c.durationSeconds), 0.0) AS averageDurationSeconds
            FROM Agent a
            LEFT JOIN Call c ON c.agent.id = a.id
            GROUP BY a.id, a.firstName, a.lastName, a.email, a.availabilityStatus
            ORDER BY completedCalls DESC, totalCalls DESC, a.id ASC
            """)
    List<AgentPerformanceProjection> fetchAgentPerformance();

    interface CallNoteCountProjection {
        Long getCallId();

        long getNoteCount();
    }

    interface CallOverviewProjection {
        long getTotalCalls();

        long getCompletedCalls();

        long getMissedCalls();

        long getQueuedCalls();

        long getInProgressCalls();

        long getCancelledCalls();

        double getAverageDurationSeconds();
    }

    interface CallStatusCountProjection {
        CallStatus getStatus();

        long getCount();
    }

    interface AgentPerformanceProjection {
        Long getAgentId();

        String getFirstName();

        String getLastName();

        String getEmail();

        AgentAvailabilityStatus getAvailabilityStatus();

        long getTotalCalls();

        long getCompletedCalls();

        long getMissedCalls();

        double getAverageDurationSeconds();
    }
}
