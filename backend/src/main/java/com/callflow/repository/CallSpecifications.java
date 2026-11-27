package com.callflow.repository;

import com.callflow.entity.Agent;
import com.callflow.entity.Call;
import com.callflow.entity.CallStatus;
import com.callflow.entity.Customer;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class CallSpecifications {

    private CallSpecifications() {
    }

    public static Specification<Call> withFilters(
            CallStatus status,
            Long agentId,
            Long customerId,
            String search,
            Instant fromDate,
            Instant toDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (agentId != null) {
                predicates.add(cb.equal(root.get("agent").get("id"), agentId));
            }
            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDate));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                Join<Call, Customer> customer = root.join("customer", JoinType.INNER);
                Join<Call, Agent> agent = root.join("agent", JoinType.LEFT);

                Predicate customerMatch = cb.or(
                        cb.like(cb.lower(customer.get("firstName")), pattern),
                        cb.like(cb.lower(customer.get("lastName")), pattern),
                        cb.like(cb.lower(cb.concat(cb.concat(customer.get("firstName"), " "), customer.get("lastName"))), pattern),
                        cb.like(cb.lower(customer.get("email")), pattern),
                        cb.like(customer.get("phoneNumber"), pattern)
                );

                Predicate agentMatch = cb.and(
                        cb.isNotNull(agent.get("id")),
                        cb.or(
                                cb.like(cb.lower(agent.get("firstName")), pattern),
                                cb.like(cb.lower(agent.get("lastName")), pattern),
                                cb.like(cb.lower(cb.concat(cb.concat(agent.get("firstName"), " "), agent.get("lastName"))), pattern),
                                cb.like(cb.lower(agent.get("email")), pattern)
                        )
                );

                predicates.add(cb.or(customerMatch, agentMatch));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
