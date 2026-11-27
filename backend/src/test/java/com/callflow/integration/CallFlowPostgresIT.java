package com.callflow.integration;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.callflow.dto.AddCallNoteRequest;
import com.callflow.dto.AgentRequest;
import com.callflow.dto.AssignCallRequest;
import com.callflow.dto.CreateCallRequest;
import com.callflow.dto.CustomerRequest;
import com.callflow.dto.UpdateCallStatusRequest;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.entity.CallStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestPropertySource(properties = {
        "spring.profiles.active=dev",
        "DB_PASSWORD=testcontainers_placeholder",
        "app.security.jwt.secret=testcontainers_jwt_secret_key_minimum_32_bytes_long",
        "app.seed.enabled=false"
})
class CallFlowPostgresIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("callflow")
            .withUsername("callflow_user")
            .withPassword("callflow_test_pass");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "admin@callflow.local", roles = "ADMIN")
    void containerizedPostgresRunsFlywayAndEndToEndApiFlow() throws Exception {
        CustomerRequest customerRequest = new CustomerRequest(
                "Container",
                "Customer",
                "container.customer@example.com",
                "+1-555-0299"
        );
        MvcResult customerRes = mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(customerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("container.customer@example.com")))
                .andReturn();
        Long customerId = objectMapper.readTree(customerRes.getResponse().getContentAsString()).get("id").asLong();

        AgentRequest agentRequest = new AgentRequest(
                "Container",
                "Agent",
                "container.agent@callflow.local",
                AgentAvailabilityStatus.AVAILABLE
        );
        MvcResult agentRes = mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(agentRequest)))
                .andExpect(status().isCreated())
                .andReturn();
        Long agentId = objectMapper.readTree(agentRes.getResponse().getContentAsString()).get("id").asLong();

        CreateCallRequest callRequest = new CreateCallRequest(
                customerId, null, null, null, null, null, "Containerized test call"
        );
        MvcResult callRes = mockMvc.perform(post("/api/calls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(callRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("QUEUED")))
                .andReturn();
        Long callId = objectMapper.readTree(callRes.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/calls/{id}/assign", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignCallRequest(agentId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentId", is(agentId.intValue())));

        Instant start = Instant.parse("2026-11-26T15:00:00Z");
        mockMvc.perform(patch("/api/calls/{id}/status", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateCallStatusRequest(CallStatus.IN_PROGRESS, start, null, null)
                        )))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/calls/{id}/notes", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AddCallNoteRequest("Resolved in container test", agentId)
                        )))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()));

        mockMvc.perform(patch("/api/calls/{id}/status", callId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateCallStatusRequest(CallStatus.COMPLETED, null, start.plusSeconds(180), null)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.durationSeconds", is(180)));

        mockMvc.perform(get("/api/analytics/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalls", is(8)))
                .andExpect(jsonPath("$.completedCalls", is(4)));
    }
}
