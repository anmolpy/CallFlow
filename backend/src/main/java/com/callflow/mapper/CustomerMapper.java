package com.callflow.mapper;

import com.callflow.dto.CustomerRequest;
import com.callflow.dto.CustomerResponse;
import com.callflow.entity.Customer;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper {

    public Customer toEntity(CustomerRequest request) {
        Customer customer = new Customer();
        updateEntity(customer, request);
        return customer;
    }

    public void updateEntity(Customer customer, CustomerRequest request) {
        customer.setFirstName(request.firstName().trim());
        customer.setLastName(request.lastName().trim());
        customer.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        customer.setPhoneNumber(request.phoneNumber().trim());
    }

    public CustomerResponse toResponse(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getFirstName(),
                customer.getLastName(),
                customer.getEmail(),
                customer.getPhoneNumber(),
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }
}
