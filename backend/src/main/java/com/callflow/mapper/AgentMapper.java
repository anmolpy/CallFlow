package com.callflow.mapper;

import com.callflow.dto.AgentRequest;
import com.callflow.dto.AgentResponse;
import com.callflow.entity.Agent;
import com.callflow.entity.AgentAvailabilityStatus;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class AgentMapper {

    public Agent toEntity(AgentRequest request) {
        Agent agent = new Agent();
        agent.setFirstName(request.firstName().trim());
        agent.setLastName(request.lastName().trim());
        agent.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        agent.setAvailabilityStatus(
                request.availabilityStatus() != null
                        ? request.availabilityStatus()
                        : AgentAvailabilityStatus.AVAILABLE
        );
        return agent;
    }

    public void updateEntity(Agent agent, AgentRequest request) {
        agent.setFirstName(request.firstName().trim());
        agent.setLastName(request.lastName().trim());
        agent.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        if (request.availabilityStatus() != null) {
            agent.setAvailabilityStatus(request.availabilityStatus());
        }
    }

    public AgentResponse toResponse(Agent agent) {
        return new AgentResponse(
                agent.getId(),
                agent.getFirstName(),
                agent.getLastName(),
                agent.getEmail(),
                agent.getAvailabilityStatus(),
                agent.getCreatedAt(),
                agent.getUpdatedAt()
        );
    }
}
