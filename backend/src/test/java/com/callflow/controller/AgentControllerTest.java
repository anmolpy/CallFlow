package com.callflow.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.callflow.dto.AgentRequest;
import com.callflow.dto.UpdateAgentAvailabilityRequest;
import com.callflow.entity.AgentAvailabilityStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class AgentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void unauthenticatedAccessReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/agents"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createAndRetrieveAgentSucceeds() throws Exception {
        AgentRequest request = new AgentRequest(
                "  Elena ",
                " Navarro ",
                "Elena.Navarro@CallFlow.local",
                null
        );

        MvcResult result = mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/agents/")))
                .andExpect(jsonPath("$.firstName", is("Elena")))
                .andExpect(jsonPath("$.lastName", is("Navarro")))
                .andExpect(jsonPath("$.email", is("elena.navarro@callflow.local")))
                .andExpect(jsonPath("$.availabilityStatus", is("AVAILABLE")))
                .andReturn();

        Long createdId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/agents/{id}", createdId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(createdId.intValue())))
                .andExpect(jsonPath("$.email", is("elena.navarro@callflow.local")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createAgentValidatesInputAndRejectsDuplicateEmail() throws Exception {
        AgentRequest invalid = new AgentRequest("", "", "bad-email", null);
        mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.fieldErrors", hasSize(3)));

        AgentRequest duplicate = new AgentRequest(
                "Jordan", "Clone", "JORDAN.TAYLOR@callflow.local", AgentAvailabilityStatus.AVAILABLE
        );
        mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateAgentAndAvailabilityWorkAndValidateErrors() throws Exception {
        AgentRequest update = new AgentRequest(
                "Jordan", "Taylor-Senior", "jordan.taylor@callflow.local", AgentAvailabilityStatus.BUSY
        );
        mockMvc.perform(put("/api/agents/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastName", is("Taylor-Senior")))
                .andExpect(jsonPath("$.availabilityStatus", is("BUSY")));

        UpdateAgentAvailabilityRequest availabilityUpdate =
                new UpdateAgentAvailabilityRequest(AgentAvailabilityStatus.OFFLINE);
        mockMvc.perform(patch("/api/agents/{id}/availability", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(availabilityUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availabilityStatus", is("OFFLINE")));

        mockMvc.perform(patch("/api/agents/{id}/availability", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")));

        mockMvc.perform(patch("/api/agents/{id}/availability", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"availabilityStatus\":\"ON_VACATION\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));

        mockMvc.perform(patch("/api/agents/{id}/availability", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(availabilityUpdate)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void listAgentsSupportsPaginationSearchAndAvailabilityFilter() throws Exception {
        mockMvc.perform(get("/api/agents")
                        .param("page", "0")
                        .param("size", "2")
                        .param("sort", "firstName,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(4)));

        mockMvc.perform(get("/api/agents")
                        .param("availabilityStatus", "BUSY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("maya.lin@callflow.local")));

        mockMvc.perform(get("/api/agents")
                        .param("query", "maya")
                        .param("availabilityStatus", "AVAILABLE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        mockMvc.perform(get("/api/agents")
                        .param("sort", "nonExistent,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));
    }
}
