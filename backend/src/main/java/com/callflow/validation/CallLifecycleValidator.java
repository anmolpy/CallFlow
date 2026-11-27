package com.callflow.validation;

import com.callflow.entity.CallStatus;
import com.callflow.exception.BusinessRuleViolationException;
import com.callflow.exception.InvalidStateTransitionException;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class CallLifecycleValidator {

    private static final Map<CallStatus, Set<CallStatus>> ALLOWED_TRANSITIONS = new EnumMap<>(CallStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(CallStatus.QUEUED, EnumSet.of(
                CallStatus.IN_PROGRESS,
                CallStatus.MISSED,
                CallStatus.CANCELLED
        ));
        ALLOWED_TRANSITIONS.put(CallStatus.IN_PROGRESS, EnumSet.of(
                CallStatus.COMPLETED,
                CallStatus.MISSED,
                CallStatus.CANCELLED
        ));
        ALLOWED_TRANSITIONS.put(CallStatus.COMPLETED, EnumSet.noneOf(CallStatus.class));
        ALLOWED_TRANSITIONS.put(CallStatus.MISSED, EnumSet.noneOf(CallStatus.class));
        ALLOWED_TRANSITIONS.put(CallStatus.CANCELLED, EnumSet.noneOf(CallStatus.class));
    }

    public boolean isTransitionAllowed(CallStatus current, CallStatus target) {
        if (current == null || target == null) {
            return false;
        }
        return ALLOWED_TRANSITIONS.getOrDefault(current, EnumSet.noneOf(CallStatus.class)).contains(target);
    }

    public void validateStatusTransition(CallStatus current, CallStatus target) {
        if (!isTransitionAllowed(current, target)) {
            throw new InvalidStateTransitionException(
                    "Invalid call status transition from " + current + " to " + target
            );
        }
    }

    public void validateTimestampsAndDuration(
            CallStatus status,
            Instant startedAt,
            Instant endedAt,
            Long durationSeconds) {
        if (durationSeconds != null && durationSeconds < 0) {
            throw new BusinessRuleViolationException("Call duration cannot be negative");
        }
        if (endedAt != null && startedAt == null) {
            throw new BusinessRuleViolationException("Call end timestamp requires a start timestamp");
        }
        if (startedAt != null && endedAt != null && endedAt.isBefore(startedAt)) {
            throw new BusinessRuleViolationException("Call end timestamp cannot precede start timestamp");
        }
        if (status == CallStatus.COMPLETED) {
            if (startedAt == null || endedAt == null) {
                throw new BusinessRuleViolationException(
                        "A completed call must have both start and end timestamps"
                );
            }
        }
    }

    public Long resolveDuration(Instant startedAt, Instant endedAt, Long explicitDurationSeconds) {
        if (explicitDurationSeconds != null) {
            if (explicitDurationSeconds < 0) {
                throw new BusinessRuleViolationException("Call duration cannot be negative");
            }
            return explicitDurationSeconds;
        }
        if (startedAt != null && endedAt != null) {
            if (endedAt.isBefore(startedAt)) {
                throw new BusinessRuleViolationException("Call end timestamp cannot precede start timestamp");
            }
            return Duration.between(startedAt, endedAt).getSeconds();
        }
        return null;
    }
}
