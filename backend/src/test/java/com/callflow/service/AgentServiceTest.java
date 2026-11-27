package com.callflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.callflow.dto.AgentRequest;
import com.callflow.dto.AgentResponse;
import com.callflow.dto.PageResponse;
import com.callflow.entity.Agent;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.exception.BusinessRuleViolationException;
import com.callflow.exception.DuplicateResourceException;
import com.callflow.exception.ResourceNotFoundException;
import com.callflow.mapper.AgentMapper;
import com.callflow.repository.AgentRepository;
import com.callflow.validation.PaginationValidator;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class AgentServiceTest {

    @Mock
    private AgentRepository agentRepository;

    private AgentService agentService;

    @BeforeEach
    void setUp() {
        agentService = new AgentService(
                agentRepository,
                new AgentMapper(),
                new PaginationValidator()
        );
    }

    @Test
    void createAgentNormalizesFieldsAndDefaultsAvailabilityToAvailable() {
        AgentRequest request = new AgentRequest("  Taylor ", " Swift ", "Taylor.Agent@CallFlow.local", null);
        when(agentRepository.existsByEmailIgnoreCase("taylor.agent@callflow.local")).thenReturn(false);
        when(agentRepository.save(any(Agent.class))).thenAnswer(invocation -> {
            Agent entity = invocation.getArgument(0);
            entity.setId(12L);
            entity.setCreatedAt(Instant.now());
            entity.setUpdatedAt(Instant.now());
            return entity;
        });

        AgentResponse response = agentService.createAgent(request);

        ArgumentCaptor<Agent> captor = ArgumentCaptor.forClass(Agent.class);
        verify(agentRepository).save(captor.capture());
        assertThat(captor.getValue().getFirstName()).isEqualTo("Taylor");
        assertThat(captor.getValue().getLastName()).isEqualTo("Swift");
        assertThat(captor.getValue().getEmail()).isEqualTo("taylor.agent@callflow.local");
        assertThat(captor.getValue().getAvailabilityStatus()).isEqualTo(AgentAvailabilityStatus.AVAILABLE);
        assertThat(response.id()).isEqualTo(12L);
        assertThat(response.availabilityStatus()).isEqualTo(AgentAvailabilityStatus.AVAILABLE);
    }

    @Test
    void createAgentRejectsDuplicateEmail() {
        AgentRequest request = new AgentRequest("Jordan", "Taylor", "Jordan.Taylor@CallFlow.local", AgentAvailabilityStatus.BUSY);
        when(agentRepository.existsByEmailIgnoreCase("jordan.taylor@callflow.local")).thenReturn(true);

        assertThatThrownBy(() -> agentService.createAgent(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("jordan.taylor@callflow.local");

        verify(agentRepository, never()).save(any());
    }

    @Test
    void getAgentByIdReturnsAgentOrThrowsNotFound() {
        Agent agent = buildAgent(3L, "Devon", "Brooks", "devon.brooks@callflow.local", AgentAvailabilityStatus.AWAY);
        when(agentRepository.findById(3L)).thenReturn(Optional.of(agent));
        when(agentRepository.findById(88L)).thenReturn(Optional.empty());

        AgentResponse found = agentService.getAgentById(3L);
        assertThat(found.email()).isEqualTo("devon.brooks@callflow.local");

        assertThatThrownBy(() -> agentService.getAgentById(88L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("88");
    }

    @Test
    void updateAgentPreservesAvailabilityWhenNullAndChecksEmailConflict() {
        Agent existing = buildAgent(2L, "Maya", "Lin", "maya.lin@callflow.local", AgentAvailabilityStatus.BUSY);
        when(agentRepository.findById(2L)).thenReturn(Optional.of(existing));
        when(agentRepository.existsByEmailIgnoreCaseAndIdNot("maya.updated@callflow.local", 2L)).thenReturn(false);
        when(agentRepository.save(existing)).thenReturn(existing);

        AgentRequest request = new AgentRequest(" Maya ", " Chen ", "Maya.Updated@CallFlow.local", null);
        AgentResponse updated = agentService.updateAgent(2L, request);

        assertThat(updated.lastName()).isEqualTo("Chen");
        assertThat(updated.email()).isEqualTo("maya.updated@callflow.local");
        assertThat(updated.availabilityStatus()).isEqualTo(AgentAvailabilityStatus.BUSY);

        when(agentRepository.existsByEmailIgnoreCaseAndIdNot("taken@callflow.local", 2L)).thenReturn(true);
        AgentRequest conflict = new AgentRequest("Maya", "Lin", "taken@callflow.local", AgentAvailabilityStatus.AVAILABLE);
        assertThatThrownBy(() -> agentService.updateAgent(2L, conflict))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void updateAvailabilityChangesStatusOrThrowsNotFound() {
        Agent existing = buildAgent(1L, "Jordan", "Taylor", "jordan@callflow.local", AgentAvailabilityStatus.AVAILABLE);
        when(agentRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(agentRepository.save(existing)).thenReturn(existing);
        when(agentRepository.findById(999L)).thenReturn(Optional.empty());

        AgentResponse updated = agentService.updateAvailability(1L, AgentAvailabilityStatus.OFFLINE);
        assertThat(updated.availabilityStatus()).isEqualTo(AgentAvailabilityStatus.OFFLINE);

        assertThatThrownBy(() -> agentService.updateAvailability(999L, AgentAvailabilityStatus.AVAILABLE))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listAgentsRoutesQueryAndAvailabilityFilters() {
        Agent agent = buildAgent(1L, "Jordan", "Taylor", "jordan@callflow.local", AgentAvailabilityStatus.AVAILABLE);
        Pageable expected = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));

        when(agentRepository.findAll(expected)).thenReturn(new PageImpl<>(List.of(agent), expected, 1));
        PageResponse<AgentResponse> all = agentService.listAgents(null, null, PageRequest.of(0, 20));
        assertThat(all.totalElements()).isEqualTo(1);
        verify(agentRepository).findAll(expected);

        when(agentRepository.findByAvailabilityStatus(AgentAvailabilityStatus.AVAILABLE, expected))
                .thenReturn(new PageImpl<>(List.of(agent), expected, 1));
        agentService.listAgents("  ", AgentAvailabilityStatus.AVAILABLE, PageRequest.of(0, 20));
        verify(agentRepository).findByAvailabilityStatus(AgentAvailabilityStatus.AVAILABLE, expected);

        when(agentRepository.search("jordan", expected)).thenReturn(new PageImpl<>(List.of(agent), expected, 1));
        agentService.listAgents(" jordan ", null, PageRequest.of(0, 20));
        verify(agentRepository).search("jordan", expected);

        when(agentRepository.searchByAvailabilityStatus(eq("jordan"), eq(AgentAvailabilityStatus.AVAILABLE), eq(expected)))
                .thenReturn(new PageImpl<>(List.of(agent), expected, 1));
        agentService.listAgents("jordan", AgentAvailabilityStatus.AVAILABLE, PageRequest.of(0, 20));
        verify(agentRepository).searchByAvailabilityStatus("jordan", AgentAvailabilityStatus.AVAILABLE, expected);
    }

    @Test
    void requireAssignableAgentAllowsActiveStatusesAndRejectsOfflineOrMissing() {
        Agent available = buildAgent(1L, "Jordan", "Taylor", "jordan@callflow.local", AgentAvailabilityStatus.AVAILABLE);
        Agent busy = buildAgent(2L, "Maya", "Lin", "maya@callflow.local", AgentAvailabilityStatus.BUSY);
        Agent away = buildAgent(3L, "Devon", "Brooks", "devon@callflow.local", AgentAvailabilityStatus.AWAY);
        Agent offline = buildAgent(4L, "Alex", "Rivera", "alex@callflow.local", AgentAvailabilityStatus.OFFLINE);

        when(agentRepository.findById(1L)).thenReturn(Optional.of(available));
        when(agentRepository.findById(2L)).thenReturn(Optional.of(busy));
        when(agentRepository.findById(3L)).thenReturn(Optional.of(away));
        when(agentRepository.findById(4L)).thenReturn(Optional.of(offline));
        when(agentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThat(agentService.requireAssignableAgent(1L).getId()).isEqualTo(1L);
        assertThat(agentService.requireAssignableAgent(2L).getId()).isEqualTo(2L);
        assertThat(agentService.requireAssignableAgent(3L).getId()).isEqualTo(3L);

        assertThatThrownBy(() -> agentService.requireAssignableAgent(4L))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("OFFLINE");

        assertThatThrownBy(() -> agentService.requireAssignableAgent(404L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private Agent buildAgent(Long id, String first, String last, String email, AgentAvailabilityStatus status) {
        Agent agent = new Agent();
        agent.setId(id);
        agent.setFirstName(first);
        agent.setLastName(last);
        agent.setEmail(email);
        agent.setAvailabilityStatus(status);
        agent.setCreatedAt(Instant.now());
        agent.setUpdatedAt(Instant.now());
        return agent;
    }
}
