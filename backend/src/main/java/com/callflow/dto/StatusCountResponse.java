package com.callflow.dto;

import com.callflow.entity.CallStatus;

public record StatusCountResponse(
        CallStatus status,
        long count
) {
}
