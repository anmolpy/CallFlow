package com.callflow.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload for creating or updating a customer")
public record CustomerRequest(
        @Schema(description = "Customer first name", example = "Elena")
        @NotBlank(message = "First name is required")
        @Size(max = 100, message = "First name must not exceed 100 characters")
        String firstName,

        @Schema(description = "Customer last name", example = "Rostova")
        @NotBlank(message = "Last name is required")
        @Size(max = 100, message = "Last name must not exceed 100 characters")
        String lastName,

        @Schema(description = "Unique customer email address", example = "elena.rostova@example.com")
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @Schema(description = "Unique customer phone number (7-30 characters)", example = "+1-555-0101")
        @NotBlank(message = "Phone number is required")
        @Pattern(
                regexp = "^[+0-9()\\s-]{7,30}$",
                message = "Phone number must be 7-30 characters and contain only digits, spaces, +, -, or parentheses"
        )
        String phoneNumber
) {
}
