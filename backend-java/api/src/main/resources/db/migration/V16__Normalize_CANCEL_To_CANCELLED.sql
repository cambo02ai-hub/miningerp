-- ============================================================================
-- JPM ERP - MIGRATION V16: Normalize CANCEL → CANCELLED in work_orders
-- Standardizes the cancelled status spelling across all entities.
-- GoodsShipment already uses 'CANCELLED'; this aligns work_orders.
-- ============================================================================

-- Drop the existing CHECK constraint (auto-named by PostgreSQL)
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- Update existing rows from old spelling to new
UPDATE work_orders SET status = 'CANCELLED' WHERE status = 'CANCEL';

-- Re-create CHECK constraint with normalized spelling
ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_PART', 'CANCELLED', 'CLOSED'));
