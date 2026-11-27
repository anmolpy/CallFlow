package com.callflow.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.callflow.entity.Agent;
import com.callflow.entity.AgentAvailabilityStatus;
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
class AgentRepositoryTest {

    @Autowired
    private AgentRepository agentRepository;

    @Test
    void searchAndAvailabilityFiltersMatchSeededAgents() {
        Page<Agent> byName = agentRepository.search("jordan taylor", PageRequest.of(0, 10));
        assertThat(byName.getContent())
                .extracting(Agent::getEmail)
                .containsExactly("jordan.taylor@callflow.local");

        Page<Agent> byStatus = agentRepository.findByAvailabilityStatus(
                AgentAvailabilityStatus.BUSY, PageRequest.of(0, 10)
        );
        assertThat(byStatus.getContent())
                .extracting(Agent::getEmail)
                .contains("maya.lin@callflow.local");

        Page<Agent> combinedMatch = agentRepository.searchByAvailabilityStatus(
                "maya", AgentAvailabilityStatus.BUSY, PageRequest.of(0, 10)
        );
        assertThat(combinedMatch.getContent()).hasSize(1);

        Page<Agent> combinedMismatch = agentRepository.searchByAvailabilityStatus(
                "maya", AgentAvailabilityStatus.AVAILABLE, PageRequest.of(0, 10)
        );
        assertThat(combinedMismatch.getContent()).isEmpty();
    }

    @Test
    void emailUniquenessChecksIgnoreCaseAndExcludeSelf() {
        Agent saved = new Agent();
        saved.setFirstName("Morgan");
        saved.setLastName("Lee");
        saved.setEmail("morgan.lee@callflow.local");
        saved.setAvailabilityStatus(AgentAvailabilityStatus.AVAILABLE);
        saved = agentRepository.saveAndFlush(saved);

        assertThat(agentRepository.existsByEmailIgnoreCase("MORGAN.LEE@CALLFLOW.LOCAL")).isTrue();
        assertThat(agentRepository.existsByEmailIgnoreCaseAndIdNot("MORGAN.LEE@CALLFLOW.LOCAL", saved.getId())).isFalse();
        assertThat(agentRepository.existsByEmailIgnoreCaseAndIdNot("jordan.taylor@callflow.local", saved.getId())).isTrue();
    }
}
