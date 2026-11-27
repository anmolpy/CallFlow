package com.callflow.mapper;

import com.callflow.dto.CallDetailResponse;
import com.callflow.dto.CallNoteResponse;
import com.callflow.dto.CallSummaryResponse;
import com.callflow.entity.Agent;
import com.callflow.entity.Call;
import com.callflow.entity.CallNote;
import com.callflow.entity.Customer;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CallMapper {

    public CallSummaryResponse toSummaryResponse(Call call, long noteCount) {
        Customer customer = call.getCustomer();
        Agent agent = call.getAgent();
        return new CallSummaryResponse(
                call.getId(),
                customer.getId(),
                formatName(customer.getFirstName(), customer.getLastName()),
                customer.getEmail(),
                agent != null ? agent.getId() : null,
                agent != null ? formatName(agent.getFirstName(), agent.getLastName()) : null,
                call.getStatus(),
                call.getStartedAt(),
                call.getEndedAt(),
                call.getDurationSeconds(),
                noteCount,
                call.getCreatedAt(),
                call.getUpdatedAt()
        );
    }

    public CallDetailResponse toDetailResponse(Call call) {
        Customer customer = call.getCustomer();
        Agent agent = call.getAgent();
        List<CallNoteResponse> notes = call.getNotes().stream()
                .map(this::toNoteResponse)
                .toList();
        return new CallDetailResponse(
                call.getId(),
                customer.getId(),
                formatName(customer.getFirstName(), customer.getLastName()),
                customer.getEmail(),
                customer.getPhoneNumber(),
                agent != null ? agent.getId() : null,
                agent != null ? formatName(agent.getFirstName(), agent.getLastName()) : null,
                agent != null ? agent.getEmail() : null,
                call.getStatus(),
                call.getStartedAt(),
                call.getEndedAt(),
                call.getDurationSeconds(),
                notes,
                call.getCreatedAt(),
                call.getUpdatedAt()
        );
    }

    public CallNoteResponse toNoteResponse(CallNote note) {
        return new CallNoteResponse(
                note.getId(),
                note.getAuthorAgent() != null ? note.getAuthorAgent().getId() : null,
                note.getAuthorName(),
                note.getContent(),
                note.getCreatedAt()
        );
    }

    private String formatName(String firstName, String lastName) {
        return firstName + " " + lastName;
    }
}
