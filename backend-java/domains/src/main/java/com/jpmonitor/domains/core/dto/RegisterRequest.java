package com.jpmonitor.domains.core.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record RegisterRequest(
        String username,
        String password,
        @JsonProperty("fullName")
        @JsonAlias("full_name")
        String fullName,
        @JsonProperty("fatherName")
        @JsonAlias("father_name")
        String fatherName,
        String email,
        @JsonProperty("employeeId")
        @JsonAlias("employee_id")
        String employeeId,
        String department,
        String site,
        String role,
        String status,
        List<String> permissions,
        @JsonProperty("permissionOverrides")
        @JsonAlias("permission_overrides")
        List<PermissionOverrideDTO> permissionOverrides,
        String phone,
        String nrc,
        String address,
        String position,
        @JsonProperty("photoUrl")
        @JsonAlias("photo_url")
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
