package com.callflow.repository;

import com.callflow.entity.Agent;
import com.callflow.entity.AgentAvailabilityStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgentRepository extends JpaRepository<Agent, Long> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    Optional<Agent> findByUserId(Long userId);

    Page<Agent> findByAvailabilityStatus(AgentAvailabilityStatus status, Pageable pageable);

    @Query("""
            SELECT a FROM Agent a
            WHERE LOWER(a.firstName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(a.lastName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(CONCAT(a.firstName, ' ', a.lastName)) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(a.email) LIKE LOWER(CONCAT('%', :query, '%'))
            """)
    Page<Agent> search(@Param("query") String query, Pageable pageable);
}
