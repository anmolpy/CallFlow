package com.callflow.validation;

import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
public class PaginationValidator {

    public static final int MAX_PAGE_SIZE = 100;

    public Pageable sanitize(Pageable pageable, Set<String> allowedSortFields, String defaultSortField) {
        int page = Math.max(0, pageable.getPageNumber());
        int size = pageable.getPageSize() <= 0 ? 20 : Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);

        Sort sort = pageable.getSort();
        if (sort.isUnsorted()) {
            return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, defaultSortField));
        }

        for (Sort.Order order : sort) {
            if (!allowedSortFields.contains(order.getProperty())) {
                throw new IllegalArgumentException(
                        "Unsupported sort field '" + order.getProperty() + "'. Allowed fields: " + allowedSortFields
                );
            }
        }
        return PageRequest.of(page, size, sort);
    }
}
