package com.callflow.dto;

import java.time.Instant;

public record CallNoteResponse(
        Long id,
        Long authorAgentId,
        String authorName,
        String content,
        Instant createdAt
) {
}
