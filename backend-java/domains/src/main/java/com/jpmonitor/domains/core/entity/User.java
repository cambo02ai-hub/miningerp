package com.jpmonitor.domains.core.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jpmonitor.domains.core.dto.PermissionOverrideDTO;
import com.jpmonitor.platform.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "employee_id")
    private String employeeId;

    @Column(name = "department")
    private String department;

    @Column(name = "site")
    private String site;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "role_id", insertable = false, updatable = false)
    private UUID roleId;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "permission_overrides", columnDefinition = "JSONB DEFAULT '[]'::jsonb")
    private String permissionOverrides;

    // Manual Getters for Spring Security Compatibility
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public Boolean getIsActive() { return isActive; }
    public Role getRole() { return role; }

    public List<PermissionOverrideDTO> getParsedPermissionOverrides() {
        if (permissionOverrides == null || permissionOverrides.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return MAPPER.readValue(permissionOverrides, new TypeReference<List<PermissionOverrideDTO>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void setParsedPermissionOverrides(List<PermissionOverrideDTO> overrides) {
        if (overrides == null || overrides.isEmpty()) {
            this.permissionOverrides = "[]";
            return;
        }
        try {
            this.permissionOverrides = MAPPER.writeValueAsString(overrides);
        } catch (Exception e) {
            this.permissionOverrides = "[]";
        }
    }
}
