-- V2__seed_data.sql
-- Default roles, admin user, and reference data

-- ============================================================================
-- ROLES
-- ============================================================================
INSERT INTO roles (id, code, name, description, permissions) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ROLE_SUPER_ADMIN', 'Super Admin', 'Akses penuh ke seluruh sistem',
     '["*"]'::jsonb),
    ('a0000000-0000-0000-0000-000000000002', 'ROLE_ADMIN', 'Admin', 'Akses administrasi sistem',
     '["READ_*", "WRITE_MASTER_DATA", "WRITE_INVENTORY", "WRITE_FLEET", "WRITE_PRODUCTION", "MANAGE_USERS"]'::jsonb),
    ('a0000000-0000-0000-0000-000000000003', 'ROLE_MANAGER', 'Manager', 'Akses manajerial dan laporan',
     '["READ_*", "WRITE_INVENTORY", "WRITE_FLEET", "WRITE_PRODUCTION", "VIEW_REPORTS"]'::jsonb),
    ('a0000000-0000-0000-0000-000000000004', 'ROLE_ENGINEER', 'Engineer', 'Akses teknis dan maintenance',
     '["READ_EQUIPMENT", "READ_INVENTORY", "WRITE_WORK_ORDER", "WRITE_MAINTENANCE"]'::jsonb),
    ('a0000000-0000-0000-0000-000000000005', 'ROLE_OPERATOR', 'Operator', 'Akses operasional dasar',
     '["READ_EQUIPMENT", "WRITE_DAILY_LOG", "READ_PRODUCTION"]'::jsonb);

-- ============================================================================
-- DEFAULT PROJECT
-- ============================================================================
INSERT INTO projects (id, code, name, description, status) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'JPM-SATUI', 'JPM Site Satui', 'Main project site Satui', 'Active');

-- ============================================================================
-- DEFAULT LOCATIONS
-- ============================================================================
INSERT INTO locations (id, code, name, type, address, city, project_id) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'KJS', 'Site Satui', 'Site', 'Satui, Tanah Bumbu', 'Satui', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000002', 'JKT', 'Jakarta HO', 'Office', 'Jakarta', 'Jakarta', NULL),
    ('c0000000-0000-0000-0000-000000000003', 'PORT', 'Port Batulicin', 'Port', 'Batulicin', 'Batulicin', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000004', 'WRK', 'Workshop Satui', 'Workshop', 'Satui Workshop Area', 'Satui', 'b0000000-0000-0000-0000-000000000001');

-- ============================================================================
-- DEFAULT ADMIN USER
-- Password: admin123 (BCrypt hash)
-- ============================================================================
INSERT INTO users (id, username, email, password_hash, full_name, role_id, is_active) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'admin', 'admin@jpmonitor.com',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     'Administrator', 'a0000000-0000-0000-0000-000000000001', true);
