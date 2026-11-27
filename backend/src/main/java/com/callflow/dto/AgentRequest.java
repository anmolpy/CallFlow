package com.callflow.dto;

import com.callflow.entity.AgentAvailabilityStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for creating or updating a support agent")
public record AgentRequest(
        @Schema(description = "Agent first name", example = "Jordan")
        @NotBlank(message = "First name is required")
        @Size(max = 100, message = "First name must not exceed 100 characters")
        String firstName,

        @Schema(description = "Agent last name", example = "Taylor")
        @NotBlank(message = "Last name is required")
        @Size(max = 100, message = "Last name must not exceed 100 characters")
        String lastName,

        @Schema(description = "Unique agent email address", example = "jordan.taylor@callflow.local")
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @Schema(description = "Optional availability status (defaults to AVAILABLE on creation)", example = "AVAILABLE")
        AgentAvailabilityStatus availabilityStatus
) {
}
