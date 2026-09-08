package com.jpmonitor.domains.core.dto;

import java.util.List;
import java.util.UUID;

public record UserDTO(
        UUID id,
        String username,
        String email,
        String fullName,
        String role,
        String employeeId,
        String department,
        String site,
        String status,
        List<String> permissions,
        List<PermissionOverrideDTO> permissionOverrides,
        String createdAt,
        String createdBy,
        String lastLoginAt
) {
    public UserDTO(UUID id, String username, String email, String fullName, String role, List<String> permissions) {
        this(id, username, email, fullName, role, null, null, null, "ACTIVE", permissions, List.of(), null, null, null);
    }

    public UserDTO(UUID id, String username, String email, String fullName, String role, List<String> permissions, List<PermissionOverrideDTO> permissionOverrides) {
        this(id, username, email, fullName, role, null, null, null, "ACTIVE", permissions, permissionOverrides, null, null, null);
    }
}
