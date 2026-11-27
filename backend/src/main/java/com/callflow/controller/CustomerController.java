package com.callflow.controller;

import com.callflow.dto.CallSummaryResponse;
import com.callflow.dto.CustomerRequest;
import com.callflow.dto.CustomerResponse;
import com.callflow.dto.PageResponse;
import com.callflow.exception.ApiErrorResponse;
import com.callflow.service.CallService;
import com.callflow.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAnyRole('ADMIN', 'AGENT')")
@Tag(name = "Customers", description = "Customer profile creation, retrieval, updating, and search")
public class CustomerController {

    private final CustomerService customerService;
    private final CallService callService;

    public CustomerController(CustomerService customerService, CallService callService) {
        this.customerService = customerService;
        this.callService = callService;
    }

    @PostMapping
    @Operation(summary = "Create a new customer")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Customer created"),
            @ApiResponse(responseCode = "400", description = "Invalid customer request payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Customer email or phone number already exists",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CustomerResponse> createCustomer(@Valid @RequestBody CustomerRequest request) {
        CustomerResponse created = customerService.createCustomer(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a customer by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Customer found"),
            @ApiResponse(responseCode = "404", description = "Customer not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CustomerResponse> getCustomerById(
            @Parameter(description = "Customer ID", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing customer")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Customer updated"),
            @ApiResponse(responseCode = "400", description = "Invalid customer update payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Customer not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Updated email or phone conflicts with another customer",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<CustomerResponse> updateCustomer(
            @Parameter(description = "Customer ID", example = "1") @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(customerService.updateCustomer(id, request));
    }

    @GetMapping
    @Operation(summary = "Search and list customers with pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paginated customer list"),
            @ApiResponse(responseCode = "400", description = "Invalid pagination or sort parameter",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PageResponse<CustomerResponse>> searchCustomers(
            @Parameter(description = "Optional search term matching name, email, or phone")
            @RequestParam(required = false) String query,
            @ParameterObject
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(customerService.searchCustomers(query, pageable));
    }

    @GetMapping("/{id}/calls")
    @Operation(summary = "Retrieve paginated call history for a customer")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paginated customer call history"),
            @ApiResponse(responseCode = "404", description = "Customer not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<PageResponse<CallSummaryResponse>> getCustomerCalls(
            @Parameter(description = "Customer ID", example = "1") @PathVariable Long id,
            @ParameterObject
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(callService.getCustomerCalls(id, pageable));
    }
}
