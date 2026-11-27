package com.callflow.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class PaginationValidatorTest {

    private static final Set<String> ALLOWED_FIELDS = Set.of("id", "createdAt", "lastName");
    private final PaginationValidator validator = new PaginationValidator();

    @Test
    void sanitizeAppliesDefaultSortAndClampsPageSize() {
        Pageable input = PageRequest.of(0, 500);
        Pageable sanitized = validator.sanitize(input, ALLOWED_FIELDS, "createdAt");

        assertThat(sanitized.getPageNumber()).isZero();
        assertThat(sanitized.getPageSize()).isEqualTo(PaginationValidator.MAX_PAGE_SIZE);
        assertThat(sanitized.getSort().getOrderFor("createdAt")).isNotNull();
        assertThat(sanitized.getSort().getOrderFor("createdAt").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void sanitizePreservesValidSortAndRejectsUnsupportedField() {
        Pageable valid = PageRequest.of(2, 15, Sort.by(Sort.Direction.ASC, "lastName"));
        Pageable sanitized = validator.sanitize(valid, ALLOWED_FIELDS, "createdAt");

        assertThat(sanitized.getPageNumber()).isEqualTo(2);
        assertThat(sanitized.getPageSize()).isEqualTo(15);
        assertThat(sanitized.getSort().getOrderFor("lastName").getDirection()).isEqualTo(Sort.Direction.ASC);

        Pageable invalid = PageRequest.of(0, 10, Sort.by("passwordHash"));
        assertThatThrownBy(() -> validator.sanitize(invalid, ALLOWED_FIELDS, "createdAt"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported sort field");
    }
}
