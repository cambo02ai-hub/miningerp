package com.jpmonitor.domains.core.dto;

import java.util.List;

public record RegisterRequest(
        String username,
        String password,
        String fullName,
        String fatherName,
        String email,
        String employeeId,
        String department,
        String site,
        String role,
        String status,
        List<String> permissions,
        List<PermissionOverrideDTO> permissionOverrides
) {
    public RegisterRequest(
            String username,
            String password,
            String fullName,
            String fatherName,
            String email,
            String employeeId,
            String department,
            String site,
            String role,
            String status,
            List<String> permissions
    ) {
        this(username, password, fullName, fatherName, email, employeeId, department, site, role, status, permissions, List.of());
    }
}
