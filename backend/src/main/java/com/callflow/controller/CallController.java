package com.callflow.controller;

import com.callflow.dto.AddCallNoteRequest;
import com.callflow.dto.AssignCallRequest;
import com.callflow.dto.CallDetailResponse;
import com.callflow.dto.CallNoteResponse;
import com.callflow.dto.CallSummaryResponse;
import com.callflow.dto.CreateCallRequest;
import com.callflow.dto.PageResponse;
import com.callflow.dto.UpdateCallStatusRequest;
import com.callflow.entity.CallStatus;
import com.callflow.security.UserPrincipal;
import com.callflow.service.CallService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/calls")
@PreAuthorize("hasAnyRole('ADMIN', 'AGENT')")
@Tag(name = "Calls", description = "Support call creation, assignment, lifecycle updates, notes, and filtering")
public class CallController {

    private final CallService callService;

    public CallController(CallService callService) {
        this.callService = callService;
    }

    @PostMapping
    @Operation(summary = "Create a new support call")
    public ResponseEntity<CallDetailResponse> createCall(
            @Valid @RequestBody CreateCallRequest request,
            Authentication authentication) {
        CallDetailResponse created = callService.createCall(request, resolveActorName(authentication));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve detailed call information including notes")
    public ResponseEntity<CallDetailResponse> getCallById(@PathVariable Long id) {
        return ResponseEntity.ok(callService.getCallById(id));
    }

    @GetMapping
    @Operation(summary = "Search and filter calls with pagination")
    public ResponseEntity<PageResponse<CallSummaryResponse>> searchCalls(
            @RequestParam(required = false) CallStatus status,
            @RequestParam(required = false) Long agentId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Instant fromDate,
            @RequestParam(required = false) Instant toDate,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(
                callService.searchCalls(status, agentId, customerId, search, fromDate, toDate, pageable)
        );
    }

    @PatchMapping("/{id}/assign")
    @Operation(summary = "Assign an eligible agent to a non-terminal call")
    public ResponseEntity<CallDetailResponse> assignAgent(
            @PathVariable Long id,
            @Valid @RequestBody AssignCallRequest request) {
        return ResponseEntity.ok(callService.assignAgent(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Transition a call status and calculate duration")
    public ResponseEntity<CallDetailResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCallStatusRequest request) {
        return ResponseEntity.ok(callService.updateStatus(id, request));
    }

    @PostMapping("/{id}/notes")
    @Operation(summary = "Add a note to an existing call")
    public ResponseEntity<CallNoteResponse> addNote(
            @PathVariable Long id,
            @Valid @RequestBody AddCallNoteRequest request,
            Authentication authentication) {
        CallNoteResponse created = callService.addNote(id, request, resolveActorName(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    private String resolveActorName(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getFullName();
        }
        return authentication.getName();
    }
}
