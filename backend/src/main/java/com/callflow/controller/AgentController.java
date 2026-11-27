package com.callflow.controller;

import com.callflow.dto.AgentRequest;
import com.callflow.dto.AgentResponse;
import com.callflow.dto.CallSummaryResponse;
import com.callflow.dto.PageResponse;
import com.callflow.dto.UpdateAgentAvailabilityRequest;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.exception.ApiErrorResponse;
import com.callflow.service.AgentService;
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
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/agents")
@PreAuthorize("hasAnyRole('ADMIN', 'AGENT')")
@Tag(name = "Agents", description = "Support agent creation, lookup, search, and availability management")
public class AgentController {

    private final AgentService agentService;
    private final CallService callService;

    public AgentController(AgentService agentService, CallService callService) {
        this.agentService = agentService;
        this.callService = callService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new support agent (ADMIN only)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Agent created"),
            @ApiResponse(responseCode = "400", description = "Invalid agent payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Agent email already exists",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<AgentResponse> createAgent(@Valid @RequestBody AgentRequest request) {
        AgentResponse created = agentService.createAgent(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve an agent by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agent found"),
            @ApiResponse(responseCode = "404", description = "Agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<AgentResponse> getAgentById(
            @Parameter(description = "Agent ID", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(agentService.getAgentById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an existing agent (ADMIN only)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agent updated"),
            @ApiResponse(responseCode = "400", description = "Invalid agent update payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Updated email conflicts with another agent",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<AgentResponse> updateAgent(
            @Parameter(description = "Agent ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody AgentRequest request) {
        return ResponseEntity.ok(agentService.updateAgent(id, request));
    }

    @PatchMapping("/{id}/availability")
    @Operation(summary = "Update an agent's availability status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Availability updated"),
            @ApiResponse(responseCode = "400", description = "Invalid availability payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<AgentResponse> updateAvailability(
            @Parameter(description = "Agent ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody UpdateAgentAvailabilityRequest request) {
        return ResponseEntity.ok(agentService.updateAvailability(id, request.availabilityStatus()));
    }

    @GetMapping
    @Operation(summary = "List and search agents with optional availability filtering and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paginated agent list"),
            @ApiResponse(responseCode = "400", description = "Invalid filter or sort parameter",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PageResponse<AgentResponse>> listAgents(
            @Parameter(description = "Optional search term matching name or email")
            @RequestParam(required = false) String query,
            @Parameter(description = "Optional availability status filter")
            @RequestParam(required = false) AgentAvailabilityStatus availabilityStatus,
            @ParameterObject
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(agentService.listAgents(query, availabilityStatus, pageable));
    }

    @GetMapping("/{id}/calls")
    @Operation(summary = "Retrieve paginated calls assigned to an agent")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paginated agent call history"),
            @ApiResponse(responseCode = "404", description = "Agent not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PageResponse<CallSummaryResponse>> getAgentCalls(
            @Parameter(description = "Agent ID", example = "1") @PathVariable Long id,
            @ParameterObject
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(callService.getAgentCalls(id, pageable));
    }
}
