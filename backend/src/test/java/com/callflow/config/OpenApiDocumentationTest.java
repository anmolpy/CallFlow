package com.callflow.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void openApiDocsExposeAllEndpointsSchemasSecurityAndErrorResponses() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title", is("CallFlow API")))
                .andExpect(jsonPath("$.info.version", is("1.0.0")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type", is("http")))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme", is("bearer")))
                .andExpect(jsonPath("$.components.schemas.ApiErrorResponse", notNullValue()))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Authentication")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Customers")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Agents")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Calls")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Analytics")))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.security", hasSize(0)))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.responses['401']", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/customers'].post.responses['401']", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/customers'].post.responses['403']", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/customers'].post.responses['409']", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/agents'].post.responses['403']", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/calls/{id}/status'].patch.responses['422']", notNullValue()))
                .andExpect(jsonPath("$.paths['/api/analytics/overview'].get.responses['200']", notNullValue()));
    }

    @Test
    void swaggerUiIsAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("/swagger-ui/index.html")));

        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/html")));
    }
}
