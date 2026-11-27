package com.callflow.controller;

import com.callflow.dto.AgentPerformanceResponse;
import com.callflow.dto.AnalyticsOverviewResponse;
import com.callflow.dto.StatusCountResponse;
import com.callflow.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@PreAuthorize("hasAnyRole('ADMIN', 'AGENT')")
@Tag(name = "Analytics", description = "Operational call metrics and agent performance aggregations")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    @Operation(summary = "Get aggregate call totals and average duration")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }

    @GetMapping("/calls-by-status")
    @Operation(summary = "Get call counts grouped by status")
    public ResponseEntity<List<StatusCountResponse>> getCallsByStatus() {
        return ResponseEntity.ok(analyticsService.getCallsByStatus());
    }

    @GetMapping("/agent-performance")
    @Operation(summary = "Get call volume, completions, missed calls, and average duration per agent")
    public ResponseEntity<List<AgentPerformanceResponse>> getAgentPerformance() {
        return ResponseEntity.ok(analyticsService.getAgentPerformance());
    }
}
