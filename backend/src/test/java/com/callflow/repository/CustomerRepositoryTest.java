package com.callflow.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.callflow.entity.Customer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CustomerRepositoryTest {

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void searchMatchesByNameFullNameEmailAndPhone() {
        Page<Customer> byFirstName = customerRepository.search("elena", PageRequest.of(0, 10));
        assertThat(byFirstName.getContent())
                .extracting(Customer::getEmail)
                .contains("elena.rostova@example.com");

        Page<Customer> byFullName = customerRepository.search("marcus vance", PageRequest.of(0, 10));
        assertThat(byFullName.getContent())
                .extracting(Customer::getEmail)
                .containsExactly("marcus.vance@example.com");

        Page<Customer> byEmail = customerRepository.search("PRIYA.PATEL@", PageRequest.of(0, 10));
        assertThat(byEmail.getContent())
                .extracting(Customer::getLastName)
                .containsExactly("Patel");

        Page<Customer> byPhone = customerRepository.search("555-0105", PageRequest.of(0, 10));
        assertThat(byPhone.getContent())
                .extracting(Customer::getFirstName)
                .containsExactly("Sofia");
    }

    @Test
    void uniquenessQueriesIgnoreCaseAndExcludeSelf() {
        Customer saved = new Customer();
        saved.setFirstName("Alan");
        saved.setLastName("Turing");
        saved.setEmail("alan.turing@example.com");
        saved.setPhoneNumber("+1-555-0999");
        saved = customerRepository.saveAndFlush(saved);

        assertThat(customerRepository.existsByEmailIgnoreCase("ALAN.TURING@EXAMPLE.COM")).isTrue();
        assertThat(customerRepository.existsByPhoneNumber("+1-555-0999")).isTrue();
        assertThat(customerRepository.existsByEmailIgnoreCaseAndIdNot("ALAN.TURING@EXAMPLE.COM", saved.getId())).isFalse();
        assertThat(customerRepository.existsByPhoneNumberAndIdNot("+1-555-0999", saved.getId())).isFalse();
        assertThat(customerRepository.existsByEmailIgnoreCaseAndIdNot("elena.rostova@example.com", saved.getId())).isTrue();
    }
}
