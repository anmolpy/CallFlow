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
import com.callflow.exception.ApiErrorResponse;
import com.callflow.security.UserPrincipal;
import com.callflow.service.CallService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import org.springdoc.core.annotations.ParameterObject;
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
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Call created"),
            @ApiResponse(responseCode = "400", description = "Invalid call creation payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Referenced customer or agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Business rule violation (e.g., offline agent or invalid timestamps)",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
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
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Call details retrieved"),
            @ApiResponse(responseCode = "404", description = "Call not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CallDetailResponse> getCallById(
            @Parameter(description = "Call ID", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(callService.getCallById(id));
    }

    @GetMapping
    @Operation(summary = "Search and filter calls with pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paginated call list"),
            @ApiResponse(responseCode = "400", description = "Invalid query or sort parameter",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "End date filter precedes start date filter",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PageResponse<CallSummaryResponse>> searchCalls(
            @Parameter(description = "Filter by call status") @RequestParam(required = false) CallStatus status,
            @Parameter(description = "Filter by assigned agent ID") @RequestParam(required = false) Long agentId,
            @Parameter(description = "Filter by customer ID") @RequestParam(required = false) Long customerId,
            @Parameter(description = "Search customer or agent name, email, or phone") @RequestParam(required = false) String search,
            @Parameter(description = "Lower bound for call createdAt (ISO-8601 UTC)") @RequestParam(required = false) Instant fromDate,
            @Parameter(description = "Upper bound for call createdAt (ISO-8601 UTC)") @RequestParam(required = false) Instant toDate,
            @ParameterObject
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(
                callService.searchCalls(status, agentId, customerId, search, fromDate, toDate, pageable)
        );
    }

    @PatchMapping("/{id}/assign")
    @Operation(summary = "Assign an eligible agent to a non-terminal call")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agent assigned to call"),
            @ApiResponse(responseCode = "400", description = "Invalid assignment request",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Call or agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Call is terminal or agent is OFFLINE",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CallDetailResponse> assignAgent(
            @Parameter(description = "Call ID", example = "5") @PathVariable Long id,
            @Valid @RequestBody AssignCallRequest request) {
        return ResponseEntity.ok(callService.assignAgent(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Transition a call status and calculate duration")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Call status updated"),
            @ApiResponse(responseCode = "400", description = "Invalid status payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Call not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Invalid call state transition or timestamp rule violation",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CallDetailResponse> updateStatus(
            @Parameter(description = "Call ID", example = "5") @PathVariable Long id,
            @Valid @RequestBody UpdateCallStatusRequest request) {
        return ResponseEntity.ok(callService.updateStatus(id, request));
    }

    @PostMapping("/{id}/notes")
    @Operation(summary = "Add a note to an existing call")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Call note added"),
            @ApiResponse(responseCode = "400", description = "Invalid note payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Call or author agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CallNoteResponse> addNote(
            @Parameter(description = "Call ID", example = "4") @PathVariable Long id,
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
