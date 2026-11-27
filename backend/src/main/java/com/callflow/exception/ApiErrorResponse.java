package com.callflow.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

@Schema(description = "Standardized API error payload")
public record ApiErrorResponse(
        @Schema(description = "UTC timestamp when the error occurred", example = "2026-11-26T22:30:00Z")
        Instant timestamp,

        @Schema(description = "HTTP status code", example = "400")
        int status,

        @Schema(description = "HTTP status reason phrase", example = "Bad Request")
        String error,

        @Schema(description = "Machine-readable CallFlow error code", example = "VALIDATION_FAILED")
        String code,

        @Schema(description = "Human-readable error summary", example = "Request validation failed")
        String message,

        @Schema(description = "Request URI path", example = "/api/customers")
        String path,

        @Schema(description = "Optional list of field-level validation failures")
        List<FieldValidationError> fieldErrors
) {
    @Schema(description = "Field-level validation error detail")
    public record FieldValidationError(
            @Schema(description = "Request field name", example = "email")
            String field,
            @Schema(description = "Validation error message", example = "Email must be a valid email address")
            String message
    ) {
    }
}
