package com.callflow.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.callflow.entity.CallStatus;
import com.callflow.exception.BusinessRuleViolationException;
import com.callflow.exception.InvalidStateTransitionException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class CallLifecycleValidatorTest {

    private final CallLifecycleValidator validator = new CallLifecycleValidator();

    @Test
    void allowsValidTransitionsAndRejectsInvalidOrTerminalTransitions() {
        assertThat(validator.isTransitionAllowed(CallStatus.QUEUED, CallStatus.IN_PROGRESS)).isTrue();
        assertThat(validator.isTransitionAllowed(CallStatus.QUEUED, CallStatus.MISSED)).isTrue();
        assertThat(validator.isTransitionAllowed(CallStatus.QUEUED, CallStatus.CANCELLED)).isTrue();
        assertThat(validator.isTransitionAllowed(CallStatus.IN_PROGRESS, CallStatus.COMPLETED)).isTrue();
        assertThat(validator.isTransitionAllowed(CallStatus.IN_PROGRESS, CallStatus.MISSED)).isTrue();
        assertThat(validator.isTransitionAllowed(CallStatus.IN_PROGRESS, CallStatus.CANCELLED)).isTrue();

        assertThat(validator.isTransitionAllowed(CallStatus.QUEUED, CallStatus.COMPLETED)).isFalse();
        assertThat(validator.isTransitionAllowed(CallStatus.COMPLETED, CallStatus.IN_PROGRESS)).isFalse();
        assertThat(validator.isTransitionAllowed(CallStatus.MISSED, CallStatus.QUEUED)).isFalse();
        assertThat(validator.isTransitionAllowed(CallStatus.CANCELLED, CallStatus.IN_PROGRESS)).isFalse();
        assertThat(validator.isTransitionAllowed(null, CallStatus.QUEUED)).isFalse();

        assertThatCode(() -> validator.validateStatusTransition(CallStatus.IN_PROGRESS, CallStatus.COMPLETED))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> validator.validateStatusTransition(CallStatus.QUEUED, CallStatus.COMPLETED))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("QUEUED")
                .hasMessageContaining("COMPLETED");
    }

    @Test
    void validatesTimestampsAndDurationRules() {
        Instant start = Instant.parse("2026-01-01T10:00:00Z");
        Instant end = Instant.parse("2026-01-01T10:05:30Z");

        assertThatCode(() -> validator.validateTimestampsAndDuration(CallStatus.COMPLETED, start, end, 330L))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> validator.validateTimestampsAndDuration(CallStatus.QUEUED, null, null, -1L))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("negative");

        assertThatThrownBy(() -> validator.validateTimestampsAndDuration(CallStatus.MISSED, null, end, null))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("start timestamp");

        assertThatThrownBy(() -> validator.validateTimestampsAndDuration(CallStatus.COMPLETED, end, start, null))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("precede");

        assertThatThrownBy(() -> validator.validateTimestampsAndDuration(CallStatus.COMPLETED, start, null, null))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("both start and end");
    }

    @Test
    void resolvesDurationFromTimestampsOrExplicitValue() {
        Instant start = Instant.parse("2026-01-01T10:00:00Z");
        Instant end = Instant.parse("2026-01-01T10:07:15Z");

        assertThat(validator.resolveDuration(start, end, null)).isEqualTo(435L);
        assertThat(validator.resolveDuration(start, end, 500L)).isEqualTo(500L);
        assertThat(validator.resolveDuration(start, null, null)).isNull();
    }
}
