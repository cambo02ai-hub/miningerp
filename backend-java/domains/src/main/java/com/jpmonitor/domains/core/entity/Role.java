package com.jpmonitor.domains.core.entity;

import com.jpmonitor.platform.common.BaseEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "roles")
public class Role extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB DEFAULT '[]'::jsonb")
    private String permissions;

    public List<String> getPermissions() {
        if (permissions == null || permissions.isBlank()) {
            return new ArrayList<>();
        }
        // JSON array stored as string like: ["READ_*", "WRITE_*"]
        String trimmed = permissions.trim();
        if (trimmed.equals("[\"*\"]") || trimmed.equals("[\"*\",]")) {
            return List.of("*");
        }
        // Simple parse for JSON array of strings
        List<String> result = new ArrayList<>();
        String content = trimmed.substring(1, trimmed.length() - 1);
        if (content.isBlank()) return result;
        for (String s : content.split(",")) {
            s = s.trim();
            if (s.startsWith("\"") && s.endsWith("\"")) {
                result.add(s.substring(1, s.length() - 1));
            }
        }
        return result;
    }
}
