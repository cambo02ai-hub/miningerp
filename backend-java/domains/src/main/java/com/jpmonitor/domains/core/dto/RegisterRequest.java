package com.jpmonitor.domains.core.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public record RegisterRequest(
        String username,
        String password,
        @JsonAlias("fullName")
        String fullName,
        @JsonAlias("fatherName")
        String fatherName,
        String email,
        @JsonAlias("employeeId")
        String employeeId,
        String department,
        String site,
        String role,
        String status,
        List<String> permissions,
        @JsonAlias("permissionOverrides")
        List<PermissionOverrideDTO> permissionOverrides,
        String phone,
        String nrc,
        String address,
        String position,
        @JsonAlias("photoUrl")
        String photoUrl
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
        this(username, password, fullName, fatherName, email, employeeId, department, site, role, status, permissions, List.of(), null, null, null, null, null);
    }

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
            List<String> permissions,
            List<PermissionOverrideDTO> permissionOverrides
    ) {
        this(username, password, fullName, fatherName, email, employeeId, department, site, role, status, permissions, permissionOverrides, null, null, null, null, null);
    }
}
