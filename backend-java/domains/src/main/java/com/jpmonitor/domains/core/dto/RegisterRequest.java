package com.jpmonitor.domains.core.dto;

import java.util.List;

public record RegisterRequest(
        String username,
        String password,
        String fullName,
        String email,
        String employeeId,
        String department,
        String site,
        String role,
        String status,
        List<String> permissions
) {}
