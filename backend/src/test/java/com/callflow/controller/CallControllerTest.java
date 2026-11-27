package com.callflow.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.callflow.dto.AddCallNoteRequest;
import com.callflow.dto.AssignCallRequest;
import com.callflow.dto.CreateCallRequest;
import com.callflow.dto.UpdateCallStatusRequest;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CallControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void unauthenticatedAccessReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/calls"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    @WithMockUser(username = "agent@callflow.local", roles = "AGENT")
    void fullCallLifecycleAssignmentNotesAndDurationCalculation() throws Exception {
        CreateCallRequest createRequest = new CreateCallRequest(
                1L, null, null, null, null, null, "Customer called about invoice discrepancy."
        );

        MvcResult createdResult = mockMvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/calls/")))
                .andExpect(jsonPath("$.status", is("QUEUED")))
                .andExpect(jsonPath("$.customerId", is(1)))
                .andExpect(jsonPath("$.notes", hasSize(1)))
                .andExpect(jsonPath("$.notes[0].authorName", is("agent@callflow.local")))
                .andReturn();

        Long callId = objectMapper.readTree(createdResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/calls/{id}/assign", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCallRequest(1L))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentId", is(1)))
                .andExpect(jsonPath("$.agentName", is("Jordan Taylor")));

        Instant startTime = Instant.parse("2026-11-26T10:00:00Z");
        mockMvc.perform(patch("/api/calls/{id}/status", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateCallStatusRequest(CallStatus.IN_PROGRESS, startTime, null, null)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.startedAt", is("2026-11-26T10:00:00Z")));

        mockMvc.perform(post("/api/calls/{id}/notes", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AddCallNoteRequest("Verified account and applied credit.", 1L)
                        )))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.authorAgentId", is(1)))
                .andExpect(jsonPath("$.authorName", is("Jordan Taylor")))
                .andExpect(jsonPath("$.createdAt", notNullValue()));

        Instant endTime = Instant.parse("2026-11-26T10:05:30Z");
        mockMvc.perform(patch("/api/calls/{id}/status", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateCallStatusRequest(CallStatus.COMPLETED, null, endTime, null)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.durationSeconds", is(330)));

        mockMvc.perform(get("/api/calls/{id}", callId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.durationSeconds", is(330)))
                .andExpect(jsonPath("$.notes", hasSize(2)));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void completingInProgressCallWithoutExplicitEndedAtDefaultsTimestamp() throws Exception {
        CreateCallRequest startNow = new CreateCallRequest(
                2L, 1L, CallStatus.IN_PROGRESS, Instant.now().minusSeconds(90), null, null, null
        );
        MvcResult res = mockMvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startNow)))
                .andExpect(status().isCreated())
                .andReturn();

        Long callId = objectMapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/calls/{id}/status", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateCallStatusRequest(CallStatus.COMPLETED, null, null, null)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.endedAt", notNullValue()))
                .andExpect(jsonPath("$.durationSeconds", greaterThanOrEqualTo(89)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidTransitionsAndBusinessRulesReturn422AndValidationReturns400() throws Exception {
        // Seeded call 5 is QUEUED
        mockMvc.perform(patch("/api/calls/{id}/status", 5L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateCallStatusRequest(CallStatus.COMPLETED, null, null, null)
                        )))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("INVALID_STATE_TRANSITION")));

        // Seeded agent 4 is OFFLINE
        mockMvc.perform(patch("/api/calls/{id}/assign", 5L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCallRequest(4L))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // Seeded call 1 is COMPLETED
        mockMvc.perform(patch("/api/calls/{id}/assign", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCallRequest(1L))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // Missing customerId triggers Bean Validation 400
        mockMvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")));

        mockMvc.perform(get("/api/calls/{id}", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void searchFilterPaginationAndCustomerAgentCallEndpointsWork() throws Exception {
        mockMvc.perform(get("/api/calls")
                        .param("status", "COMPLETED")
                        .param("search", "jordan")
                        .param("page", "0")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].status", hasItem("COMPLETED")))
                .andExpect(jsonPath("$.content[*].agentName", hasItem("Jordan Taylor")))
                .andExpect(jsonPath("$.content[0].noteCount", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/calls")
                        .param("fromDate", "2026-12-01T00:00:00Z")
                        .param("toDate", "2026-11-01T00:00:00Z"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        mockMvc.perform(get("/api/calls")
                        .param("sort", "invalidField,desc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));

        mockMvc.perform(get("/api/customers/{id}/calls", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(2)));

        mockMvc.perform(get("/api/agents/{id}/calls", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(2)));

        mockMvc.perform(get("/api/customers/{id}/calls", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));

        mockMvc.perform(get("/api/calls/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));

        mockMvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{malformed-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));
    }
}
