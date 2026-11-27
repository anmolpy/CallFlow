package com.callflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.callflow.dto.AddCallNoteRequest;
import com.callflow.dto.AssignCallRequest;
import com.callflow.dto.CallDetailResponse;
import com.callflow.dto.CallNoteResponse;
import com.callflow.dto.CallSummaryResponse;
import com.callflow.dto.CreateCallRequest;
import com.callflow.dto.PageResponse;
import com.callflow.dto.UpdateCallStatusRequest;
import com.callflow.entity.Agent;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.entity.Call;
import com.callflow.entity.CallNote;
import com.callflow.entity.CallStatus;
import com.callflow.entity.Customer;
import com.callflow.exception.BusinessRuleViolationException;
import com.callflow.exception.InvalidStateTransitionException;
import com.callflow.exception.ResourceNotFoundException;
import com.callflow.mapper.CallMapper;
import com.callflow.repository.AgentRepository;
import com.callflow.repository.CallRepository;
import com.callflow.repository.CallRepository.CallNoteCountProjection;
import com.callflow.repository.CustomerRepository;
import com.callflow.validation.CallLifecycleValidator;
import com.callflow.validation.PaginationValidator;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class CallServiceTest {

    @Mock
    private CallRepository callRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private AgentService agentService;

    private CallService callService;

    @BeforeEach
    void setUp() {
        callService = new CallService(
                callRepository,
                customerRepository,
                agentRepository,
                agentService,
                new CallMapper(),
                new CallLifecycleValidator(),
                new PaginationValidator()
        );
    }

    @Test
    void createCallDefaultsToQueuedAndAddsInitialNote() {
        Customer customer = buildCustomer(1L);
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(callRepository.save(any(Call.class))).thenAnswer(invocation -> {
            Call c = invocation.getArgument(0);
            c.setId(100L);
            c.setCreatedAt(Instant.now());
            c.setUpdatedAt(Instant.now());
            c.getNotes().forEach(n -> {
                n.setId(200L);
                n.setCreatedAt(Instant.now());
            });
            return c;
        });

        CreateCallRequest request = new CreateCallRequest(1L, null, null, null, null, null, "  Billing inquiry  ");
        CallDetailResponse response = callService.createCall(request, "Admin User");

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.status()).isEqualTo(CallStatus.QUEUED);
        assertThat(response.notes()).hasSize(1);
        assertThat(response.notes().get(0).authorName()).isEqualTo("Admin User");
        assertThat(response.notes().get(0).content()).isEqualTo("Billing inquiry");
    }

    @Test
    void createCallInProgressAutoSetsStartTimeAndValidatesAgent() {
        Customer customer = buildCustomer(1L);
        Agent agent = buildAgent(2L, AgentAvailabilityStatus.AVAILABLE);
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(agentService.requireAssignableAgent(2L)).thenReturn(agent);
        when(callRepository.save(any(Call.class))).thenAnswer(invocation -> {
            Call c = invocation.getArgument(0);
            c.setId(101L);
            return c;
        });

        CreateCallRequest request = new CreateCallRequest(1L, 2L, CallStatus.IN_PROGRESS, null, null, null, null);
        CallDetailResponse response = callService.createCall(request, "Ignored");

        assertThat(response.status()).isEqualTo(CallStatus.IN_PROGRESS);
        assertThat(response.startedAt()).isNotNull();
        assertThat(response.agentId()).isEqualTo(2L);
    }

    @Test
    void assignAgentRejectsTerminalCallsAndDelegatesEligibility() {
        Call completed = buildCall(10L, CallStatus.COMPLETED);
        when(callRepository.findDetailedById(10L)).thenReturn(Optional.of(completed));

        assertThatThrownBy(() -> callService.assignAgent(10L, new AssignCallRequest(1L)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("terminal status");

        Call queued = buildCall(11L, CallStatus.QUEUED);
        Agent agent = buildAgent(1L, AgentAvailabilityStatus.AVAILABLE);
        when(callRepository.findDetailedById(11L)).thenReturn(Optional.of(queued));
        when(agentService.requireAssignableAgent(1L)).thenReturn(agent);
        when(callRepository.save(queued)).thenReturn(queued);

        CallDetailResponse assigned = callService.assignAgent(11L, new AssignCallRequest(1L));
        assertThat(assigned.agentId()).isEqualTo(1L);
    }

    @Test
    void updateStatusComputesDurationAndRejectsInvalidTransitions() {
        Instant start = Instant.parse("2026-01-01T12:00:00Z");
        Instant end = Instant.parse("2026-01-01T12:04:00Z");

        Call inProgress = buildCall(20L, CallStatus.IN_PROGRESS);
        inProgress.setStartedAt(start);
        when(callRepository.findDetailedById(20L)).thenReturn(Optional.of(inProgress));
        when(callRepository.save(inProgress)).thenReturn(inProgress);

        CallDetailResponse completed = callService.updateStatus(
                20L, new UpdateCallStatusRequest(CallStatus.COMPLETED, null, end, null)
        );
        assertThat(completed.status()).isEqualTo(CallStatus.COMPLETED);
        assertThat(completed.durationSeconds()).isEqualTo(240L);

        assertThatThrownBy(() -> callService.updateStatus(
                20L, new UpdateCallStatusRequest(CallStatus.IN_PROGRESS, null, null, null)))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    void addNoteUsesAgentAuthorOrFallbackActorName() {
        Call call = buildCall(30L, CallStatus.IN_PROGRESS);
        when(callRepository.findDetailedById(30L)).thenReturn(Optional.of(call));
        when(callRepository.save(call)).thenAnswer(invocation -> {
            Call saved = invocation.getArgument(0);
            CallNote last = saved.getNotes().get(saved.getNotes().size() - 1);
            last.setId(500L);
            last.setCreatedAt(Instant.now());
            return saved;
        });

        CallNoteResponse note = callService.addNote(30L, new AddCallNoteRequest("  Follow-up scheduled ", null), null);
        assertThat(note.id()).isEqualTo(500L);
        assertThat(note.authorName()).isEqualTo("Support Staff");
        assertThat(note.content()).isEqualTo("Follow-up scheduled");
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchCallsValidatesDatesAndMapsNoteCounts() {
        Instant from = Instant.parse("2026-01-02T00:00:00Z");
        Instant to = Instant.parse("2026-01-01T00:00:00Z");

        assertThatThrownBy(() -> callService.searchCalls(null, null, null, null, from, to, PageRequest.of(0, 10)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("precede");

        Call call = buildCall(40L, CallStatus.QUEUED);
        Pageable expectedPageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        when(callRepository.findAll(any(Specification.class), eq(expectedPageable)))
                .thenReturn(new PageImpl<>(List.of(call), expectedPageable, 1));
        when(callRepository.countNotesByCallIds(List.of(40L))).thenReturn(List.of(new CallNoteCountProjection() {
            @Override
            public Long getCallId() {
                return 40L;
            }

            @Override
            public long getNoteCount() {
                return 3L;
            }
        }));

        PageResponse<CallSummaryResponse> result = callService.searchCalls(
                CallStatus.QUEUED, null, null, null, null, null, PageRequest.of(0, 20)
        );
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).noteCount()).isEqualTo(3L);
    }

    @Test
    void customerAndAgentCallLookupsVerifyParentExists() {
        when(customerRepository.existsById(999L)).thenReturn(false);
        assertThatThrownBy(() -> callService.getCustomerCalls(999L, PageRequest.of(0, 10)))
                .isInstanceOf(ResourceNotFoundException.class);

        when(agentRepository.existsById(888L)).thenReturn(false);
        assertThatThrownBy(() -> callService.getAgentCalls(888L, PageRequest.of(0, 10)))
                .isInstanceOf(ResourceNotFoundException.class);

        Call call = buildCall(50L, CallStatus.QUEUED);
        Pageable expected = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
        when(customerRepository.existsById(1L)).thenReturn(true);
        when(callRepository.findByCustomerId(1L, expected)).thenReturn(new PageImpl<>(List.of(call), expected, 1));
        when(callRepository.countNotesByCallIds(List.of(50L))).thenReturn(List.of());

        PageResponse<CallSummaryResponse> page = callService.getCustomerCalls(1L, PageRequest.of(0, 20));
        assertThat(page.totalElements()).isEqualTo(1);
        verify(callRepository).findByCustomerId(1L, expected);
    }

    private Customer buildCustomer(Long id) {
        Customer c = new Customer();
        c.setId(id);
        c.setFirstName("Elena");
        c.setLastName("Rostova");
        c.setEmail("elena.rostova@example.com");
        c.setPhoneNumber("+1-555-0101");
        return c;
    }

    private Agent buildAgent(Long id, AgentAvailabilityStatus status) {
        Agent a = new Agent();
        a.setId(id);
        a.setFirstName("Jordan");
        a.setLastName("Taylor");
        a.setEmail("jordan.taylor@callflow.local");
        a.setAvailabilityStatus(status);
        return a;
    }

    private Call buildCall(Long id, CallStatus status) {
        Call call = new Call();
        call.setId(id);
        call.setCustomer(buildCustomer(1L));
        call.setStatus(status);
        call.setCreatedAt(Instant.now());
        call.setUpdatedAt(Instant.now());
        return call;
    }
}
