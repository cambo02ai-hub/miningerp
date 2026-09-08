-- ============================================================================
-- JPM ERP - MODULE: CORE (IAM Extension)
-- Add employee_id, department, site, and permission_overrides to users table
-- ============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department VARCHAR(150),
    ADD COLUMN IF NOT EXISTS site VARCHAR(150),
    ADD COLUMN IF NOT EXISTS permission_overrides JSONB DEFAULT '[]'::jsonb;
