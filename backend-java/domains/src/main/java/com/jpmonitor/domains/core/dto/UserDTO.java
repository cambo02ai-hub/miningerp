package com.jpmonitor.domains.core.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;

public record UserDTO(
        UUID id,
        String username,
        String email,
        @JsonProperty("fullName")
        @JsonAlias("full_name")
        String fullName,
        @JsonProperty("fatherName")
        @JsonAlias("father_name")
        String fatherName,
        String role,
        @JsonProperty("employeeId")
        @JsonAlias("employee_id")
        String employeeId,
        String department,
        String site,
        String status,
        List<String> permissions,
        @JsonProperty("permissionOverrides")
        @JsonAlias("permission_overrides")
        List<PermissionOverrideDTO> permissionOverrides,
        String createdAt,
        String createdBy,
        String lastLoginAt,
        String phone,
        String nrc,
        String address,
        String position,
        @JsonProperty("photoUrl")
        @JsonAlias("photo_url")
        String photoUrl
) {
    public UserDTO(UUID id, String username, String email, String fullName, String role, List<String> permissions) {
        this(id, username, email, fullName, null, role, null, null, null, "ACTIVE", permissions, List.of(), null, null, null, null, null, null, null, null);
    }

    public UserDTO(UUID id, String username, String email, String fullName, String role, List<String> permissions, List<PermissionOverrideDTO> permissionOverrides) {
        this(id, username, email, fullName, null, role, null, null, null, "ACTIVE", permissions, permissionOverrides, null, null, null, null, null, null, null, null);
    }
}
