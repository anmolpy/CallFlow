package com.callflow.controller;

import com.callflow.dto.AgentRequest;
import com.callflow.dto.AgentResponse;
import com.callflow.dto.PageResponse;
import com.callflow.dto.UpdateAgentAvailabilityRequest;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.service.AgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
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
@Tag(name = "Agents", description = "Support agent creation, lookup, search, and availability management")
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    @PostMapping
    @Operation(summary = "Create a new support agent")
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
    public ResponseEntity<AgentResponse> getAgentById(@PathVariable Long id) {
        return ResponseEntity.ok(agentService.getAgentById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing agent")
    public ResponseEntity<AgentResponse> updateAgent(
            @PathVariable Long id,
            @Valid @RequestBody AgentRequest request) {
        return ResponseEntity.ok(agentService.updateAgent(id, request));
    }

    @PatchMapping("/{id}/availability")
    @Operation(summary = "Update an agent's availability status")
    public ResponseEntity<AgentResponse> updateAvailability(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAgentAvailabilityRequest request) {
        return ResponseEntity.ok(agentService.updateAvailability(id, request.availabilityStatus()));
    }

    @GetMapping
    @Operation(summary = "List and search agents with optional availability filtering and pagination")
    public ResponseEntity<PageResponse<AgentResponse>> listAgents(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) AgentAvailabilityStatus availabilityStatus,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(agentService.listAgents(query, availabilityStatus, pageable));
    }
}
