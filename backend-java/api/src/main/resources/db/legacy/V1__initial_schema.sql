CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE
-- ============================================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed')),
    start_date DATE,
    end_date DATE,
    budget_limit NUMERIC(15,2) DEFAULT 0,
    current_spend NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Site' CHECK (type IN ('Site', 'Warehouse', 'Office', 'Port', 'Workshop', 'Camp')),
    address TEXT,
    city VARCHAR(100),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_locations_project_id ON locations(project_id);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    username VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    entity_name VARCHAR(255),
    description TEXT,
    details TEXT,
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- HR / EMPLOYEE
-- ============================================================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'OnLeave', 'Resigned')),
    user_id UUID REFERENCES users(id),
    current_project_id UUID REFERENCES projects(id),
    location_id UUID REFERENCES locations(id),
    joined_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_current_project_id ON employees(current_project_id);
CREATE INDEX idx_employees_location_id ON employees(location_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);

-- ============================================================================
-- FLEET
-- ============================================================================
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Operational'
        CHECK (status IN ('Operational', 'Standby', 'Breakdown', 'Maintenance', 'Sold', 'Scrapped')),
    serial_number VARCHAR(100),
    engine_number VARCHAR(100),
    chassis_number VARCHAR(100),
    plate_number VARCHAR(50),
    manufacture_year INTEGER,
    hour_meter NUMERIC(10,1) NOT NULL DEFAULT 0 CHECK (hour_meter >= 0),
    kilometer NUMERIC(10,1),
    owner VARCHAR(100),
    location_id UUID REFERENCES locations(id),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_equipment_location_id ON equipment(location_id);
CREATE INDEX idx_equipment_project_id ON equipment(project_id);
CREATE INDEX idx_equipment_code ON equipment(code);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_type ON equipment(type);

CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_date DATE NOT NULL,
    shift VARCHAR(10) NOT NULL CHECK (shift IN ('Day', 'Night')),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    operator_id UUID REFERENCES employees(id),
    start_hm NUMERIC(10,1) NOT NULL,
    end_hm NUMERIC(10,1) NOT NULL,
    total_hours NUMERIC(10,1) GENERATED ALWAYS AS (end_hm - start_hm) STORED,
    activity_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_daily_logs_equipment_id ON daily_logs(equipment_id);
CREATE INDEX idx_daily_logs_operator_id ON daily_logs(operator_id);
CREATE INDEX idx_daily_logs_date ON daily_logs(log_date);

CREATE TABLE fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    project_id UUID REFERENCES projects(id),
    liters NUMERIC(10,2) NOT NULL,
    hour_meter NUMERIC(10,1),
    price_per_liter NUMERIC(12,2),
    total_cost NUMERIC(14,2) GENERATED ALWAYS AS (liters * price_per_liter) STORED,
    supplier_id UUID REFERENCES suppliers(id),
    reference_doc VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fuel_logs_equipment_id ON fuel_logs(equipment_id);

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    project_id UUID REFERENCES projects(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('Preventive', 'Corrective', 'Inspection')),
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_PART', 'CANCEL', 'CLOSED')),
    description TEXT,
    assigned_mechanic_id UUID REFERENCES employees(id),
    scheduled_date DATE,
    completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_work_orders_equipment_id ON work_orders(equipment_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);

CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    service_date DATE NOT NULL,
    description TEXT,
    parts_cost NUMERIC(14,2) DEFAULT 0,
    mechanic_labor_cost NUMERIC(14,2) DEFAULT 0,
    driver_labor_cost NUMERIC(14,2) DEFAULT 0,
    meal_allowance_cost NUMERIC(14,2) DEFAULT 0,
    transport_fuel_cost NUMERIC(14,2) DEFAULT 0,
    external_service_cost NUMERIC(14,2) DEFAULT 0,
    external_invoice_number VARCHAR(100),
    total_cost NUMERIC(14,2) GENERATED ALWAYS AS (
        COALESCE(parts_cost,0) + COALESCE(mechanic_labor_cost,0) +
        COALESCE(driver_labor_cost,0) + COALESCE(meal_allowance_cost,0) +
        COALESCE(transport_fuel_cost,0) + COALESCE(external_service_cost,0)
    ) STORED,
    hm_at_service NUMERIC(10,1),
    technician_notes TEXT,
    hm_reset_occurred BOOLEAN DEFAULT FALSE,
    final_hm_reading NUMERIC(10,1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_maintenance_records_equipment_id ON maintenance_records(equipment_id);
CREATE INDEX idx_maintenance_records_work_order_id ON maintenance_records(work_order_id);

CREATE TABLE maintenance_external_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_record_id UUID NOT NULL REFERENCES maintenance_records(id),
    external_service_id UUID NOT NULL REFERENCES external_services(id),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    applied_price NUMERIC(14,2),
    total_line_cost NUMERIC(14,2) GENERATED ALWAYS AS (quantity * COALESCE(applied_price,0)) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mnt_ext_svc_record ON maintenance_external_services(maintenance_record_id);

CREATE TABLE unit_mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mutation_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ACQUISITION', 'TRANSFER', 'DISPOSAL')),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    equipment_code VARCHAR(50),
    departure_date DATE,
    arrival_date DATE,
    mutation_hm NUMERIC(10,1),
    source_location_id UUID REFERENCES locations(id),
    target_location_id UUID REFERENCES locations(id),
    reference_document VARCHAR(100),
    value NUMERIC(15,2),
    notes TEXT,
    driver_name VARCHAR(100),
    transport_unit VARCHAR(100),
    transport_pol_number VARCHAR(50),
    sender_company VARCHAR(200),
    sender_name VARCHAR(100),
    recipient_company VARCHAR(200),
    recipient_name VARCHAR(100),
    performed_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_unit_mutations_equipment_id ON unit_mutations(equipment_id);
CREATE INDEX idx_unit_mutations_source_location ON unit_mutations(source_location_id);
CREATE INDEX idx_unit_mutations_target_location ON unit_mutations(target_location_id);

-- ============================================================================
-- PRODUCTION
-- ============================================================================
CREATE TABLE pits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    block VARCHAR(50),
    strip_ratio_plan NUMERIC(8,2),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Closed')),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pits_project_id ON pits(project_id);

CREATE TABLE production_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    shift VARCHAR(10) NOT NULL CHECK (shift IN ('Day', 'Night')),
    pit_id UUID NOT NULL REFERENCES pits(id),
    supervisor_id UUID REFERENCES employees(id),
    overburden_bcm NUMERIC(12,2) NOT NULL DEFAULT 0,
    coal_mt NUMERIC(12,2) NOT NULL DEFAULT 0,
    stripping_ratio NUMERIC(10,2) GENERATED ALWAYS AS (
        CASE WHEN coal_mt > 0 THEN overburden_bcm / coal_mt ELSE 0 END
    ) STORED,
    status VARCHAR(10) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_production_records_pit_id ON production_records(pit_id);
CREATE INDEX idx_production_records_date ON production_records(date);

CREATE TABLE stockpiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    location_id UUID REFERENCES locations(id),
    capacity_mt NUMERIC(12,2),
    current_volume_mt NUMERIC(12,2) DEFAULT 0 CHECK (current_volume_mt >= 0),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stockpiles_location_id ON stockpiles(location_id);

CREATE TABLE hauling_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trx_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    operator_id UUID REFERENCES employees(id),
    origin_pit_id UUID REFERENCES pits(id),
    destination_stockpile_id UUID REFERENCES stockpiles(id),
    distance_km NUMERIC(8,2),
    gross_weight NUMERIC(12,2),
    tare_weight NUMERIC(12,2),
    net_weight NUMERIC(12,2) GENERATED ALWAYS AS (gross_weight - tare_weight) STORED,
    loader_equipment_id UUID REFERENCES equipment(id),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Verified')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_hauling_logs_equipment_id ON hauling_logs(equipment_id);
CREATE INDEX idx_hauling_logs_origin_pit ON hauling_logs(origin_pit_id);
CREATE INDEX idx_hauling_logs_dest_stockpile ON hauling_logs(destination_stockpile_id);

CREATE TABLE coal_quality_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_date DATE NOT NULL,
    reference_code VARCHAR(50),
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('PIT', 'STOCKPILE')),
    pit_id UUID REFERENCES pits(id),
    stockpile_id UUID REFERENCES stockpiles(id),
    tm_ar NUMERIC(8,2),
    im_adb NUMERIC(8,2),
    ash_adb NUMERIC(8,2),
    vm_adb NUMERIC(8,2),
    fc_adb NUMERIC(8,2),
    ts_adb NUMERIC(8,2),
    gcv_adb NUMERIC(10,2),
    gcv_ar NUMERIC(10,2),
    surveyor_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coal_quality_pit_id ON coal_quality_logs(pit_id);
CREATE INDEX idx_coal_quality_stockpile_id ON coal_quality_logs(stockpile_id);

-- ============================================================================
-- INVENTORY
-- ============================================================================
CREATE TABLE spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100),
    category VARCHAR(50) CHECK (category IN ('Engine', 'Hydraulic', 'Undercarriage', 'Consumable', 'Electrical')),
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_level NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    location_id UUID REFERENCES locations(id),
    rack_code VARCHAR(50),
    preferred_supplier_id UUID REFERENCES suppliers(id),
    current_price_cash NUMERIC(14,2),
    current_price_credit NUMERIC(14,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_spare_parts_location_id ON spare_parts(location_id);
CREATE INDEX idx_spare_parts_preferred_supplier ON spare_parts(preferred_supplier_id);
CREATE INDEX idx_spare_parts_category ON spare_parts(category);

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trx_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PURCHASE', 'USAGE', 'CANNIBAL_HARVEST', 'RETURN_VENDOR', 'RESTOCK_UNUSED', 'TRANSFER_OUT')),
    part_id UUID NOT NULL REFERENCES spare_parts(id),
    quantity NUMERIC(10,2) NOT NULL,
    applied_price NUMERIC(14,2),
    payment_method VARCHAR(10) CHECK (payment_method IN ('CASH', 'CREDIT')),
    due_date DATE,
    paid_date DATE,
    equipment_id UUID REFERENCES equipment(id),
    supplier_id UUID REFERENCES suppliers(id),
    project_id UUID REFERENCES projects(id),
    notes TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_transactions_part_id ON inventory_transactions(part_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(date);

CREATE TABLE part_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES spare_parts(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    price_cash NUMERIC(14,2),
    price_credit NUMERIC(14,2),
    currency VARCHAR(10) DEFAULT 'IDR',
    effective_from DATE NOT NULL,
    effective_to DATE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_part_price_history_part_id ON part_price_history(part_id);

-- ============================================================================
-- PROCUREMENT
-- ============================================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    is_active BOOLEAN DEFAULT TRUE,
    sla_response_time_hours INTEGER,
    api_integration_enabled BOOLEAN DEFAULT FALSE,
    api_endpoint_url VARCHAR(500),
    api_auth_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE external_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    service_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    uom VARCHAR(20) DEFAULT 'JOB' CHECK (uom IN ('JOB', 'HOUR')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, service_code)
);
CREATE INDEX idx_external_services_supplier_id ON external_services(supplier_id);

CREATE TABLE service_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES external_services(id),
    price_cash NUMERIC(14,2),
    price_credit NUMERIC(14,2),
    currency VARCHAR(10) DEFAULT 'IDR',
    effective_from DATE NOT NULL,
    effective_to DATE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_price_history_service_id ON service_price_history(service_id);

-- ============================================================================
-- FINANCE
-- ============================================================================
CREATE TABLE cash_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BANK', 'CASH')),
    currency VARCHAR(10) DEFAULT 'IDR',
    balance NUMERIC(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cash_accounts_project_id ON cash_accounts(project_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
    supplier_id UUID REFERENCES suppliers(id),
    amount NUMERIC(15,2) NOT NULL,
    payment_method VARCHAR(20),
    reference_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_cash_account_id ON payments(cash_account_id);
CREATE INDEX idx_payments_supplier_id ON payments(supplier_id);

CREATE TABLE cost_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('OPEX', 'CAPEX')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ap_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    project_id UUID REFERENCES projects(id),
    cost_category_id UUID REFERENCES cost_categories(id),
    source_module VARCHAR(50),
    reference_id UUID,
    reference_doc_number VARCHAR(100),
    transaction_date DATE NOT NULL,
    due_date DATE,
    total_amount NUMERIC(15,2) NOT NULL,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    outstanding_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_accounts_payable_supplier_id ON accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_project_id ON accounts_payable(project_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    ap_id UUID NOT NULL REFERENCES accounts_payable(id),
    allocated_amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_ap_id ON payment_allocations(ap_id);

-- ============================================================================
-- LOGISTICS
-- ============================================================================
CREATE TABLE goods_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    do_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    source_location_id UUID REFERENCES locations(id),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('LOCATION', 'VENDOR', 'OTHER')),
    target_location_id UUID REFERENCES locations(id),
    target_supplier_id UUID REFERENCES suppliers(id),
    target_name VARCHAR(200),
    target_address TEXT,
    transport_provider VARCHAR(100),
    driver_employee_id UUID REFERENCES employees(id),
    vehicle_equipment_id UUID REFERENCES equipment(id),
    external_driver_name VARCHAR(100),
    external_vehicle_number VARCHAR(50),
    external_police_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'SHIPPED',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_goods_shipments_source_location ON goods_shipments(source_location_id);

CREATE TABLE shipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES goods_shipments(id),
    part_id UUID REFERENCES spare_parts(id),
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(14,2),
    unit_code_snapshot VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shipment_items_shipment_id ON shipment_items(shipment_id);

-- ============================================================================
-- HSE
-- ============================================================================
CREATE TABLE hse_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME,
    type VARCHAR(30) NOT NULL CHECK (type IN ('Near Miss', 'Property Damage', 'Injury', 'Environmental')),
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    location_id UUID REFERENCES locations(id),
    project_id UUID REFERENCES projects(id),
    location_detail VARCHAR(200),
    description TEXT NOT NULL,
    immediate_action TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Investigating', 'Closed')),
    reported_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_hse_incidents_location_id ON hse_incidents(location_id);
CREATE INDEX idx_hse_incidents_project_id ON hse_incidents(project_id);
CREATE INDEX idx_hse_incidents_status ON hse_incidents(status);

CREATE TABLE hse_investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID UNIQUE NOT NULL REFERENCES hse_incidents(id),
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    investigator_id UUID REFERENCES employees(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_hse_investigations_incident_id ON hse_investigations(incident_id);
