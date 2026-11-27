package com.callflow.service;

import com.callflow.dto.CustomerRequest;
import com.callflow.dto.CustomerResponse;
import com.callflow.dto.PageResponse;
import com.callflow.entity.Customer;
import com.callflow.exception.DuplicateResourceException;
import com.callflow.exception.ResourceNotFoundException;
import com.callflow.mapper.CustomerMapper;
import com.callflow.repository.CustomerRepository;
import com.callflow.validation.PaginationValidator;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CustomerService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "firstName", "lastName", "email", "phoneNumber", "createdAt", "updatedAt"
    );

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;
    private final PaginationValidator paginationValidator;

    public CustomerService(
            CustomerRepository customerRepository,
            CustomerMapper customerMapper,
            PaginationValidator paginationValidator) {
        this.customerRepository = customerRepository;
        this.customerMapper = customerMapper;
        this.paginationValidator = paginationValidator;
    }

    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedPhone = request.phoneNumber().trim();

        if (customerRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException("A customer with email '" + normalizedEmail + "' already exists");
        }
        if (customerRepository.existsByPhoneNumber(normalizedPhone)) {
            throw new DuplicateResourceException("A customer with phone number '" + normalizedPhone + "' already exists");
        }

        Customer saved = customerRepository.save(customerMapper.toEntity(request));
        return customerMapper.toResponse(saved);
    }

    public CustomerResponse getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
        return customerMapper.toResponse(customer);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request) {
        Customer existing = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));

        String normalizedEmail = normalizeEmail(request.email());
        String normalizedPhone = request.phoneNumber().trim();

        if (customerRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, id)) {
            throw new DuplicateResourceException("A customer with email '" + normalizedEmail + "' already exists");
        }
        if (customerRepository.existsByPhoneNumberAndIdNot(normalizedPhone, id)) {
            throw new DuplicateResourceException("A customer with phone number '" + normalizedPhone + "' already exists");
        }

        customerMapper.updateEntity(existing, request);
        Customer updated = customerRepository.save(existing);
        return customerMapper.toResponse(updated);
    }

    public PageResponse<CustomerResponse> searchCustomers(String query, Pageable pageable) {
        Pageable sanitized = paginationValidator.sanitize(pageable, ALLOWED_SORT_FIELDS, "createdAt");
        Page<Customer> page = (query == null || query.isBlank())
                ? customerRepository.findAll(sanitized)
                : customerRepository.search(query.trim(), sanitized);
        return PageResponse.from(page.map(customerMapper::toResponse));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
