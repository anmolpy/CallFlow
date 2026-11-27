package com.callflow.service;

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
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AgentService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "firstName", "lastName", "email", "availabilityStatus", "createdAt", "updatedAt"
    );

    private final AgentRepository agentRepository;
    private final AgentMapper agentMapper;
    private final PaginationValidator paginationValidator;

    public AgentService(
            AgentRepository agentRepository,
            AgentMapper agentMapper,
            PaginationValidator paginationValidator) {
        this.agentRepository = agentRepository;
        this.agentMapper = agentMapper;
        this.paginationValidator = paginationValidator;
    }

    @Transactional
    public AgentResponse createAgent(AgentRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (agentRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("An agent with email '" + normalizedEmail + "' already exists");
        }
        Agent saved = agentRepository.save(agentMapper.toEntity(request));
        return agentMapper.toResponse(saved);
    }

    public AgentResponse getAgentById(Long id) {
        Agent agent = agentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", id));
        return agentMapper.toResponse(agent);
    }

    @Transactional
    public AgentResponse updateAgent(Long id, AgentRequest request) {
        Agent existing = agentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", id));

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (agentRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, id)) {
            throw new DuplicateResourceException("An agent with email '" + normalizedEmail + "' already exists");
        }

        agentMapper.updateEntity(existing, request);
        Agent saved = agentRepository.save(existing);
        return agentMapper.toResponse(saved);
    }

    @Transactional
    public AgentResponse updateAvailability(Long id, AgentAvailabilityStatus status) {
        Agent existing = agentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", id));
        existing.setAvailabilityStatus(status);
        return agentMapper.toResponse(agentRepository.save(existing));
    }

    public PageResponse<AgentResponse> listAgents(
            String query,
            AgentAvailabilityStatus availabilityStatus,
            Pageable pageable) {
        Pageable sanitized = paginationValidator.sanitize(pageable, ALLOWED_SORT_FIELDS, "createdAt");
        Page<Agent> page;
        boolean hasQuery = query != null && !query.isBlank();
        if (hasQuery && availabilityStatus != null) {
            page = agentRepository.searchByAvailabilityStatus(query.trim(), availabilityStatus, sanitized);
        } else if (hasQuery) {
            page = agentRepository.search(query.trim(), sanitized);
        } else if (availabilityStatus != null) {
            page = agentRepository.findByAvailabilityStatus(availabilityStatus, sanitized);
        } else {
            page = agentRepository.findAll(sanitized);
        }
        return PageResponse.from(page.map(agentMapper::toResponse));
    }

    /**
     * Loads an agent and ensures they are eligible to be assigned to an active call.
     */
    public Agent requireAssignableAgent(Long agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", agentId));
        validateAssignable(agent);
        return agent;
    }

    /**
     * Validates that an agent's current availability allows call assignment.
     */
    public void validateAssignable(Agent agent) {
        if (agent.getAvailabilityStatus() == AgentAvailabilityStatus.OFFLINE) {
            throw new BusinessRuleViolationException(
                    "Cannot assign call to agent " + agent.getId() + " because agent is OFFLINE"
            );
        }
    }
}
