package com.callflow.service;

import com.callflow.dto.AddCallNoteRequest;
import com.callflow.dto.AssignCallRequest;
import com.callflow.dto.CallDetailResponse;
import com.callflow.dto.CallNoteResponse;
import com.callflow.dto.CallSummaryResponse;
import com.callflow.dto.CreateCallRequest;
import com.callflow.dto.PageResponse;
import com.callflow.dto.UpdateCallStatusRequest;
import com.callflow.entity.Agent;
import com.callflow.entity.Call;
import com.callflow.entity.CallNote;
import com.callflow.entity.CallStatus;
import com.callflow.entity.Customer;
import com.callflow.exception.BusinessRuleViolationException;
import com.callflow.exception.ResourceNotFoundException;
import com.callflow.mapper.CallMapper;
import com.callflow.repository.AgentRepository;
import com.callflow.repository.CallRepository;
import com.callflow.repository.CallRepository.CallNoteCountProjection;
import com.callflow.repository.CallSpecifications;
import com.callflow.repository.CustomerRepository;
import com.callflow.validation.CallLifecycleValidator;
import com.callflow.validation.PaginationValidator;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CallService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "status", "startedAt", "endedAt", "durationSeconds", "createdAt", "updatedAt"
    );

    private final CallRepository callRepository;
    private final CustomerRepository customerRepository;
    private final AgentRepository agentRepository;
    private final AgentService agentService;
    private final CallMapper callMapper;
    private final CallLifecycleValidator lifecycleValidator;
    private final PaginationValidator paginationValidator;

    public CallService(
            CallRepository callRepository,
            CustomerRepository customerRepository,
            AgentRepository agentRepository,
            AgentService agentService,
            CallMapper callMapper,
            CallLifecycleValidator lifecycleValidator,
            PaginationValidator paginationValidator) {
        this.callRepository = callRepository;
        this.customerRepository = customerRepository;
        this.agentRepository = agentRepository;
        this.agentService = agentService;
        this.callMapper = callMapper;
        this.lifecycleValidator = lifecycleValidator;
        this.paginationValidator = paginationValidator;
    }

    @Transactional
    public CallDetailResponse createCall(CreateCallRequest request, String actorName) {
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", request.customerId()));

        CallStatus targetStatus = request.status() != null ? request.status() : CallStatus.QUEUED;
        Agent agent = resolveAssignableAgent(request.agentId(), targetStatus);

        Instant startedAt = request.startedAt();
        if (startedAt == null && targetStatus == CallStatus.IN_PROGRESS) {
            startedAt = Instant.now();
        }
        Instant endedAt = request.endedAt();

        lifecycleValidator.validateTimestampsAndDuration(
                targetStatus, startedAt, endedAt, request.durationSeconds()
        );
        Long durationSeconds = lifecycleValidator.resolveDuration(
                startedAt, endedAt, request.durationSeconds()
        );

        Call call = new Call();
        call.setCustomer(customer);
        call.setAgent(agent);
        call.setStatus(targetStatus);
        call.setStartedAt(startedAt);
        call.setEndedAt(endedAt);
        call.setDurationSeconds(durationSeconds);

        if (request.initialNote() != null && !request.initialNote().isBlank()) {
            CallNote note = new CallNote();
            note.setAuthorAgent(agent);
            note.setAuthorName(resolveNoteAuthorName(agent, actorName));
            note.setContent(request.initialNote().trim());
            call.addNote(note);
        }

        Call saved = callRepository.save(call);
        return callMapper.toDetailResponse(saved);
    }

    public CallDetailResponse getCallById(Long id) {
        Call call = callRepository.findDetailedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Call", id));
        return callMapper.toDetailResponse(call);
    }

    public PageResponse<CallSummaryResponse> searchCalls(
            CallStatus status,
            Long agentId,
            Long customerId,
            String search,
            Instant fromDate,
            Instant toDate,
            Pageable pageable) {
        if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
            throw new BusinessRuleViolationException("End date filter cannot precede start date filter");
        }
        Pageable sanitized = paginationValidator.sanitize(pageable, ALLOWED_SORT_FIELDS, "createdAt");
        Page<Call> page = callRepository.findAll(
                CallSpecifications.withFilters(status, agentId, customerId, search, fromDate, toDate),
                sanitized
        );
        return toSummaryPageResponse(page);
    }

    public PageResponse<CallSummaryResponse> getCustomerCalls(Long customerId, Pageable pageable) {
        if (!customerRepository.existsById(customerId)) {
            throw new ResourceNotFoundException("Customer", customerId);
        }
        Pageable sanitized = paginationValidator.sanitize(pageable, ALLOWED_SORT_FIELDS, "createdAt");
        return toSummaryPageResponse(callRepository.findByCustomerId(customerId, sanitized));
    }

    public PageResponse<CallSummaryResponse> getAgentCalls(Long agentId, Pageable pageable) {
        if (!agentRepository.existsById(agentId)) {
            throw new ResourceNotFoundException("Agent", agentId);
        }
        Pageable sanitized = paginationValidator.sanitize(pageable, ALLOWED_SORT_FIELDS, "createdAt");
        return toSummaryPageResponse(callRepository.findByAgentId(agentId, sanitized));
    }

    @Transactional
    public CallDetailResponse assignAgent(Long callId, AssignCallRequest request) {
        Call call = callRepository.findDetailedById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call", callId));

        if (isTerminalStatus(call.getStatus())) {
            throw new BusinessRuleViolationException(
                    "Cannot assign an agent to a call with terminal status " + call.getStatus()
            );
        }

        Agent agent = agentService.requireAssignableAgent(request.agentId());

        call.setAgent(agent);
        return callMapper.toDetailResponse(callRepository.save(call));
    }

    @Transactional
    public CallDetailResponse updateStatus(Long callId, UpdateCallStatusRequest request) {
        Call call = callRepository.findDetailedById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call", callId));

        CallStatus targetStatus = request.status();
        lifecycleValidator.validateStatusTransition(call.getStatus(), targetStatus);

        Instant effectiveStart = request.startedAt() != null ? request.startedAt() : call.getStartedAt();
        if (targetStatus == CallStatus.IN_PROGRESS && effectiveStart == null) {
            effectiveStart = Instant.now();
        }
        Instant effectiveEnd = request.endedAt() != null ? request.endedAt() : call.getEndedAt();
        if (targetStatus == CallStatus.COMPLETED && effectiveEnd == null) {
            effectiveEnd = Instant.now();
        }
        Long requestedDuration = request.durationSeconds() != null
                ? request.durationSeconds()
                : call.getDurationSeconds();

        lifecycleValidator.validateTimestampsAndDuration(
                targetStatus, effectiveStart, effectiveEnd, requestedDuration
        );
        Long resolvedDuration = lifecycleValidator.resolveDuration(
                effectiveStart, effectiveEnd, requestedDuration
        );

        call.setStatus(targetStatus);
        call.setStartedAt(effectiveStart);
        call.setEndedAt(effectiveEnd);
        call.setDurationSeconds(resolvedDuration);

        return callMapper.toDetailResponse(callRepository.save(call));
    }

    @Transactional
    public CallNoteResponse addNote(Long callId, AddCallNoteRequest request, String actorName) {
        Call call = callRepository.findDetailedById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call", callId));

        Agent authorAgent = null;
        if (request.authorAgentId() != null) {
            authorAgent = agentRepository.findById(request.authorAgentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Agent", request.authorAgentId()));
        }

        CallNote note = new CallNote();
        note.setAuthorAgent(authorAgent);
        note.setAuthorName(resolveNoteAuthorName(authorAgent, actorName));
        note.setContent(request.content().trim());

        call.addNote(note);
        Call saved = callRepository.save(call);
        CallNote persisted = saved.getNotes().get(saved.getNotes().size() - 1);
        return callMapper.toNoteResponse(persisted);
    }

    private PageResponse<CallSummaryResponse> toSummaryPageResponse(Page<Call> page) {
        List<Long> callIds = page.getContent().stream().map(Call::getId).toList();
        Map<Long, Long> noteCounts = callIds.isEmpty()
                ? Map.of()
                : callRepository.countNotesByCallIds(callIds).stream()
                        .collect(Collectors.toMap(
                                CallNoteCountProjection::getCallId,
                                CallNoteCountProjection::getNoteCount
                        ));
        Page<CallSummaryResponse> mapped = page.map(
                call -> callMapper.toSummaryResponse(call, noteCounts.getOrDefault(call.getId(), 0L))
        );
        return PageResponse.from(mapped);
    }

    private Agent resolveAssignableAgent(Long agentId, CallStatus targetStatus) {
        if (agentId == null) {
            return null;
        }
        if (!isTerminalStatus(targetStatus)) {
            return agentService.requireAssignableAgent(agentId);
        }
        return agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", agentId));
    }

    private boolean isTerminalStatus(CallStatus status) {
        return status == CallStatus.COMPLETED
                || status == CallStatus.MISSED
                || status == CallStatus.CANCELLED;
    }

    private String resolveNoteAuthorName(Agent agent, String actorName) {
        if (agent != null) {
            return agent.getFirstName() + " " + agent.getLastName();
        }
        if (actorName != null && !actorName.isBlank()) {
            return actorName.trim();
        }
        return "Support Staff";
    }
}
