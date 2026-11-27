package com.callflow.controller;

import com.callflow.dto.AuthResponse;
import com.callflow.dto.LoginRequest;
import com.callflow.dto.UserProfileResponse;
import com.callflow.exception.ApiErrorResponse;
import com.callflow.security.AuthService;
import com.callflow.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "JWT authentication and current user profile")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate with email and password to receive a JWT token")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authentication succeeded"),
            @ApiResponse(responseCode = "400", description = "Invalid login payload",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials or disabled user",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Retrieve the currently authenticated user profile")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated user profile returned")
    })
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.toProfile(principal));
    }
}
