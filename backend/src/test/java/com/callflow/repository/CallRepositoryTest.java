package com.callflow.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.callflow.entity.Call;
import com.callflow.entity.CallStatus;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CallRepositoryTest {

    @Autowired
    private CallRepository callRepository;

    @Test
    void specificationFiltersByStatusAgentCustomerDateRangeAndSearch() {
        Instant now = Instant.now();
        Page<Call> filtered = callRepository.findAll(
                CallSpecifications.withFilters(
                        CallStatus.COMPLETED,
                        1L,
                        1L,
                        "elena rostova",
                        now.minus(10, ChronoUnit.DAYS),
                        now
                ),
                PageRequest.of(0, 10)
        );

        assertThat(filtered.getContent()).hasSize(1);
        assertThat(filtered.getContent().get(0).getCustomer().getEmail())
                .isEqualTo("elena.rostova@example.com");

        Page<Call> agentSearch = callRepository.findAll(
                CallSpecifications.withFilters(null, null, null, "maya.lin@callflow.local", null, null),
                PageRequest.of(0, 10)
        );
        assertThat(agentSearch.getContent()).hasSize(2);
    }

    @Test
    void detailedLookupAndNoteCountProjectionsWork() {
        Call call = callRepository.findDetailedById(1L).orElseThrow();
        assertThat(call.getNotes()).hasSize(1);
        assertThat(call.getCustomer().getLastName()).isEqualTo("Rostova");
        assertThat(call.getAgent().getFirstName()).isEqualTo("Jordan");

        var noteCounts = callRepository.countNotesByCallIds(List.of(1L, 5L));
        assertThat(noteCounts).hasSize(1);
        assertThat(noteCounts.get(0).getCallId()).isEqualTo(1L);
        assertThat(noteCounts.get(0).getNoteCount()).isEqualTo(1L);
    }
}
