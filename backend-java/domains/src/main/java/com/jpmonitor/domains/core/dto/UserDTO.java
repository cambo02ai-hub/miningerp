package com.jpmonitor.domains.core.dto;

import java.util.List;
import java.util.UUID;

public record UserDTO(
        UUID id,
        String username,
        String email,
        String fullName,
        String role,
        List<String> permissions,
        List<PermissionOverrideDTO> permissionOverrides
) {
    public UserDTO(UUID id, String username, String email, String fullName, String role, List<String> permissions) {
        this(id, username, email, fullName, role, permissions, List.of());
    }
}
