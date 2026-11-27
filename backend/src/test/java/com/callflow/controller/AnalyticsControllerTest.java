package com.callflow.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.callflow.dto.CreateCallRequest;
import com.callflow.entity.CallStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void unauthenticatedAnalyticsRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/analytics/overview"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void analyticsEndpointsReturnAggregatedSeedMetricsAndReflectNewCalls() throws Exception {
        mockMvc.perform(get("/api/analytics/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalls", is(7)))
                .andExpect(jsonPath("$.completedCalls", is(3)))
                .andExpect(jsonPath("$.missedCalls", is(1)))
                .andExpect(jsonPath("$.queuedCalls", is(1)))
                .andExpect(jsonPath("$.inProgressCalls", is(1)))
                .andExpect(jsonPath("$.cancelledCalls", is(1)))
                .andExpect(jsonPath("$.averageDurationSeconds", is(341.25)));

        mockMvc.perform(get("/api/analytics/calls-by-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].status", is("QUEUED")))
                .andExpect(jsonPath("$[0].count", is(1)))
                .andExpect(jsonPath("$[2].status", is("COMPLETED")))
                .andExpect(jsonPath("$[2].count", is(3)));

        mockMvc.perform(get("/api/analytics/agent-performance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].agentName", is("Jordan Taylor")))
                .andExpect(jsonPath("$[0].completedCalls", is(2)))
                .andExpect(jsonPath("$[0].averageDurationSeconds", is(367.5)))
                .andExpect(jsonPath("$[3].agentName", is("Alex Rivera")))
                .andExpect(jsonPath("$[3].totalCalls", is(0)));

        // Add a completed call with 635s duration -> total=8, completed=4, avg=(420+315+600+30+635)/5=400.0
        Instant start = Instant.parse("2026-11-26T12:00:00Z");
        Instant end = start.plusSeconds(635);
        CreateCallRequest newCompleted = new CreateCallRequest(1L, 1L, CallStatus.COMPLETED, start, end, null, null);

        mockMvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCompleted)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/analytics/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalls", is(8)))
                .andExpect(jsonPath("$.completedCalls", is(4)))
                .andExpect(jsonPath("$.averageDurationSeconds", is(400.0)));
    }
}
