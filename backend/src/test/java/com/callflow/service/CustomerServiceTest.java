package com.callflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.callflow.dto.CustomerRequest;
import com.callflow.dto.CustomerResponse;
import com.callflow.dto.PageResponse;
import com.callflow.entity.Customer;
import com.callflow.exception.DuplicateResourceException;
import com.callflow.exception.ResourceNotFoundException;
import com.callflow.mapper.CustomerMapper;
import com.callflow.repository.CustomerRepository;
import com.callflow.validation.PaginationValidator;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    private CustomerService customerService;

    @BeforeEach
    void setUp() {
        customerService = new CustomerService(
                customerRepository,
                new CustomerMapper(),
                new PaginationValidator()
        );
    }

    @Test
    void createCustomerNormalizesAndPersists() {
        CustomerRequest request = new CustomerRequest("  Ada  ", "  Lovelace ", " ADA@Example.COM ", " +1-555-0199 ");
        when(customerRepository.existsByEmailIgnoreCase("ada@example.com")).thenReturn(false);
        when(customerRepository.existsByPhoneNumber("+1-555-0199")).thenReturn(false);
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> {
            Customer entity = invocation.getArgument(0);
            entity.setId(10L);
            entity.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            entity.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            return entity;
        });

        CustomerResponse response = customerService.createCustomer(request);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        Customer savedArg = captor.getValue();
        assertThat(savedArg.getFirstName()).isEqualTo("Ada");
        assertThat(savedArg.getLastName()).isEqualTo("Lovelace");
        assertThat(savedArg.getEmail()).isEqualTo("ada@example.com");
        assertThat(savedArg.getPhoneNumber()).isEqualTo("+1-555-0199");

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.email()).isEqualTo("ada@example.com");
    }

    @Test
    void createCustomerRejectsDuplicateEmail() {
        CustomerRequest request = new CustomerRequest("Ada", "Lovelace", "ADA@Example.COM", "+1-555-0199");
        when(customerRepository.existsByEmailIgnoreCase("ada@example.com")).thenReturn(true);

        assertThatThrownBy(() -> customerService.createCustomer(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("ada@example.com");

        verify(customerRepository, never()).save(any());
    }

    @Test
    void createCustomerRejectsDuplicatePhone() {
        CustomerRequest request = new CustomerRequest("Ada", "Lovelace", "ada@example.com", " +1-555-0199 ");
        when(customerRepository.existsByEmailIgnoreCase("ada@example.com")).thenReturn(false);
        when(customerRepository.existsByPhoneNumber("+1-555-0199")).thenReturn(true);

        assertThatThrownBy(() -> customerService.createCustomer(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("+1-555-0199");

        verify(customerRepository, never()).save(any());
    }

    @Test
    void getCustomerByIdReturnsCustomerOrThrowsNotFound() {
        Customer existing = buildCustomer(5L, "Grace", "Hopper", "grace@example.com", "+1-555-0155");
        when(customerRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());

        CustomerResponse found = customerService.getCustomerById(5L);
        assertThat(found.id()).isEqualTo(5L);
        assertThat(found.firstName()).isEqualTo("Grace");

        assertThatThrownBy(() -> customerService.getCustomerById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void updateCustomerValidatesUniquenessAndUpdatesEntity() {
        Customer existing = buildCustomer(7L, "Old", "Name", "old@example.com", "+1-555-0100");
        CustomerRequest update = new CustomerRequest(" New ", " Name ", " NEW@Example.com ", " +1-555-0200 ");

        when(customerRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(customerRepository.existsByEmailIgnoreCaseAndIdNot("new@example.com", 7L)).thenReturn(false);
        when(customerRepository.existsByPhoneNumberAndIdNot("+1-555-0200", 7L)).thenReturn(false);
        when(customerRepository.save(existing)).thenReturn(existing);

        CustomerResponse response = customerService.updateCustomer(7L, update);

        assertThat(response.firstName()).isEqualTo("New");
        assertThat(response.lastName()).isEqualTo("Name");
        assertThat(response.email()).isEqualTo("new@example.com");
        assertThat(response.phoneNumber()).isEqualTo("+1-555-0200");
    }

    @Test
    void updateCustomerThrowsWhenNotFoundOrDuplicate() {
        CustomerRequest request = new CustomerRequest("A", "B", "a@example.com", "+1-555-0100");
        when(customerRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.updateCustomer(404L, request))
                .isInstanceOf(ResourceNotFoundException.class);

        Customer existing = buildCustomer(8L, "A", "B", "a@example.com", "+1-555-0100");
        when(customerRepository.findById(8L)).thenReturn(Optional.of(existing));
        when(customerRepository.existsByEmailIgnoreCaseAndIdNot("a@example.com", 8L)).thenReturn(true);

        assertThatThrownBy(() -> customerService.updateCustomer(8L, request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void searchCustomersUsesFindAllForBlankQueryAndSearchForTerm() {
        Customer customer = buildCustomer(1L, "Elena", "Rostova", "elena@example.com", "+1-555-0101");
        Pageable expectedDefault = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));

        when(customerRepository.findAll(expectedDefault))
                .thenReturn(new PageImpl<>(List.of(customer), expectedDefault, 1));
        PageResponse<CustomerResponse> allResult = customerService.searchCustomers("   ", PageRequest.of(0, 20));
        assertThat(allResult.totalElements()).isEqualTo(1);
        verify(customerRepository).findAll(expectedDefault);

        Pageable clampedPageable = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt"));
        when(customerRepository.search(eq("elena"), eq(clampedPageable)))
                .thenReturn(new PageImpl<>(List.of(customer), clampedPageable, 1));

        PageResponse<CustomerResponse> searchResult = customerService.searchCustomers(" elena ", PageRequest.of(0, 250));
        assertThat(searchResult.content()).hasSize(1);
        verify(customerRepository).search("elena", clampedPageable);
    }

    @Test
    void searchCustomersRejectsUnsupportedSortField() {
        Pageable badSort = PageRequest.of(0, 10, Sort.by("passwordHash"));

        assertThatThrownBy(() -> customerService.searchCustomers(null, badSort))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported sort field");
    }

    private Customer buildCustomer(Long id, String first, String last, String email, String phone) {
        Customer c = new Customer();
        c.setId(id);
        c.setFirstName(first);
        c.setLastName(last);
        c.setEmail(email);
        c.setPhoneNumber(phone);
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        return c;
    }
}
