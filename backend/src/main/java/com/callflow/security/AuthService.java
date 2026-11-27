package com.callflow.security;

import com.callflow.dto.AuthResponse;
import com.callflow.dto.LoginRequest;
import com.callflow.dto.UserProfileResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim(), request.password())
        );
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtService.generateToken(principal);
        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs(),
                toProfile(principal)
        );
    }

    public UserProfileResponse toProfile(UserPrincipal principal) {
        return new UserProfileResponse(
                principal.getId(),
                principal.getEmail(),
                principal.getFullName(),
                principal.getRole()
        );
    }
}
