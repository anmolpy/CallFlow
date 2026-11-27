package com.callflow.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.callflow.dto.AgentRequest;
import com.callflow.dto.CustomerRequest;
import com.callflow.dto.LoginRequest;
import com.callflow.dto.UpdateAgentAvailabilityRequest;
import com.callflow.entity.AgentAvailabilityStatus;
import com.callflow.entity.User;
import com.callflow.entity.UserRole;
import com.callflow.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthAndSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminEmail;
    private String agentEmail;
    private String disabledEmail;

    @BeforeEach
    void setUpUsers() {
        adminEmail = "sec-admin@callflow.local";
        agentEmail = "sec-agent@callflow.local";
        disabledEmail = "sec-disabled@callflow.local";

        saveUser(adminEmail, "Sec Admin", "AdminSecret123!", UserRole.ADMIN, true);
        saveUser(agentEmail, "Sec Agent", "AgentSecret123!", UserRole.AGENT, true);
        saveUser(disabledEmail, "Disabled User", "DisabledSecret123!", UserRole.AGENT, false);
    }

    @Test
    void bcryptPasswordHashingAndLoginFlowWorkAndRejectInvalidCredentials() throws Exception {
        User savedAdmin = userRepository.findByEmailIgnoreCase(adminEmail).orElseThrow();
        assertThat(savedAdmin.getPasswordHash()).startsWith("$2");
        assertThat(passwordEncoder.matches("AdminSecret123!", savedAdmin.getPasswordHash())).isTrue();

        // Successful login returns JWT and user profile
        String adminToken = loginAndExtractToken(adminEmail, "AdminSecret123!", UserRole.ADMIN);

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is(adminEmail)))
                .andExpect(jsonPath("$.fullName", is("Sec Admin")))
                .andExpect(jsonPath("$.role", is("ADMIN")));

        // Wrong password -> 401
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(adminEmail, "WrongPass!"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));

        // Disabled user -> 401
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(disabledEmail, "DisabledSecret123!"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));

        // Blank login payload -> 400
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-email\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")));
    }

    @Test
    void protectedEndpointsRejectMissingOrInvalidJwtAndPermitPublicEndpoints() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));

        mockMvc.perform(get("/api/customers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));

        mockMvc.perform(get("/api/calls")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer "))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    void roleBasedAuthorizationSeparatesAdminAndAgentCapabilities() throws Exception {
        String adminToken = loginAndExtractToken(adminEmail, "AdminSecret123!", UserRole.ADMIN);
        String agentToken = loginAndExtractToken(agentEmail, "AgentSecret123!", UserRole.AGENT);

        AgentRequest newAgent = new AgentRequest(
                "Security", "TestAgent", "sec.created.agent@callflow.local", AgentAvailabilityStatus.AVAILABLE
        );

        // AGENT cannot create or update agents -> 403 Forbidden
        mockMvc.perform(post("/api/agents")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAgent)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));

        mockMvc.perform(put("/api/agents/{id}", 1L)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAgent)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("FORBIDDEN")));

        // ADMIN can create and update agents -> 201 / 200
        MvcResult createdAgent = mockMvc.perform(post("/api/agents")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAgent)))
                .andExpect(status().isCreated())
                .andReturn();
        Long createdAgentId = objectMapper.readTree(createdAgent.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/agents/{id}", createdAgentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AgentRequest("Security", "Updated", "sec.created.agent@callflow.local", AgentAvailabilityStatus.BUSY)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastName", is("Updated")));

        // AGENT can access operational endpoints (customers, calls, availability, analytics)
        mockMvc.perform(patch("/api/agents/{id}/availability", createdAgentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateAgentAvailabilityRequest(AgentAvailabilityStatus.AVAILABLE)
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availabilityStatus", is("AVAILABLE")));

        mockMvc.perform(post("/api/customers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CustomerRequest("Auth", "Customer", "auth.customer@example.com", "+1-555-0399")
                        )))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/analytics/overview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + agentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCalls", notNullValue()));
    }

    private String loginAndExtractToken(String email, String password, UserRole expectedRole) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.user.role", is(expectedRole.name())))
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken")
                .asText();
    }

    private void saveUser(String email, String fullName, String rawPassword, UserRole role, boolean enabled) {
        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setEnabled(enabled);
        userRepository.saveAndFlush(user);
    }
}
