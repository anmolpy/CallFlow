package com.callflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddCallNoteRequest(
        @NotBlank(message = "Note content is required")
        @Size(max = 2000, message = "Note content must not exceed 2000 characters")
        String content,

        Long authorAgentId
) {
}
