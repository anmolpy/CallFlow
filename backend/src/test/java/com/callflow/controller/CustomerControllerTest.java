package com.callflow.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.callflow.dto.CustomerRequest;
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
class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void unauthenticatedAccessReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void createAndRetrieveCustomerSucceeds() throws Exception {
        CustomerRequest request = new CustomerRequest(
                "  Clara  ",
                " Oswald ",
                "Clara.Oswald@Example.com",
                " +1-555-0188 "
        );

        MvcResult result = mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/customers/")))
                .andExpect(jsonPath("$.firstName", is("Clara")))
                .andExpect(jsonPath("$.lastName", is("Oswald")))
                .andExpect(jsonPath("$.email", is("clara.oswald@example.com")))
                .andExpect(jsonPath("$.phoneNumber", is("+1-555-0188")))
                .andExpect(jsonPath("$.id").isNumber())
                .andReturn();

        Long createdId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/customers/{id}", createdId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(createdId.intValue())))
                .andExpect(jsonPath("$.email", is("clara.oswald@example.com")));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void createCustomerValidatesPayloadAndRejectsDuplicates() throws Exception {
        CustomerRequest invalid = new CustomerRequest("", "Smith", "not-an-email", "123");

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.fieldErrors", hasSize(3)));

        CustomerRequest duplicateEmail = new CustomerRequest(
                "Elena", "Clone", "ELENA.ROSTOVA@example.com", "+1-555-0991"
        );
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateEmail)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")));

        CustomerRequest duplicatePhone = new CustomerRequest(
                "Unique", "User", "unique.user@example.com", " +1-555-0101 "
        );
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicatePhone)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateCustomerHandlesSuccessNotFoundAndConflict() throws Exception {
        CustomerRequest updateSameEmail = new CustomerRequest(
                "Elena", "Rostova-Updated", "elena.rostova@example.com", "+1-555-0101"
        );
        mockMvc.perform(put("/api/customers/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateSameEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastName", is("Rostova-Updated")));

        CustomerRequest conflictWithCustomer2 = new CustomerRequest(
                "Elena", "Rostova", "marcus.vance@example.com", "+1-555-0101"
        );
        mockMvc.perform(put("/api/customers/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictWithCustomer2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("DUPLICATE_RESOURCE")));

        mockMvc.perform(put("/api/customers/{id}", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateSameEmail)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    @Test
    @WithMockUser(roles = "AGENT")
    void searchAndPaginateCustomersWorksAndRejectsInvalidSort() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .param("page", "0")
                        .param("size", "2")
                        .param("sort", "lastName,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(5)))
                .andExpect(jsonPath("$.first", is(true)));

        mockMvc.perform(get("/api/customers")
                        .param("query", "priya patel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("priya.patel@example.com")));

        mockMvc.perform(get("/api/customers")
                        .param("sort", "unknownField,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")));
    }
}
