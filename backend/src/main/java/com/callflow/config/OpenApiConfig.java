package com.callflow.config;

import com.callflow.exception.ApiErrorResponse;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.prepost.PreAuthorize;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";
    private static final String ERROR_SCHEMA_REF = "#/components/schemas/ApiErrorResponse";

    @Bean
    public OpenAPI callFlowOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("CallFlow API")
                        .version("1.0.0")
                        .description("Customer-support call management, agent operations, authentication, and analytics REST API")
                        .contact(new Contact().name("CallFlow Engineering")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local development server")
                ))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    @Bean
    public OpenApiCustomizer errorSchemaCustomizer() {
        return openApi -> {
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            ModelConverters.getInstance()
                    .readAll(ApiErrorResponse.class)
                    .forEach((name, schema) -> openApi.getComponents().addSchemas(name, schema));
        };
    }

    @Bean
    public OperationCustomizer securityResponsesCustomizer() {
        return (operation, handlerMethod) -> {
            boolean isPublicLogin = "login".equals(handlerMethod.getMethod().getName())
                    && handlerMethod.getBeanType().getSimpleName().equals("AuthController");
            if (isPublicLogin) {
                operation.setSecurity(List.of());
                return operation;
            }
            operation.getResponses().putIfAbsent("401", errorApiResponse("Missing, expired, or invalid JWT bearer token"));

            boolean hasPreAuthorize = handlerMethod.hasMethodAnnotation(PreAuthorize.class)
                    || handlerMethod.getBeanType().isAnnotationPresent(PreAuthorize.class);
            if (hasPreAuthorize) {
                operation.getResponses().putIfAbsent("403", errorApiResponse("Insufficient role permissions for this operation"));
            }
            return operation;
        };
    }

    private ApiResponse errorApiResponse(String description) {
        return new ApiResponse()
                .description(description)
                .content(new Content().addMediaType(
                        org.springframework.http.MediaType.APPLICATION_JSON_VALUE,
                        new MediaType().schema(new Schema<>().$ref(ERROR_SCHEMA_REF))
                ));
    }
}
