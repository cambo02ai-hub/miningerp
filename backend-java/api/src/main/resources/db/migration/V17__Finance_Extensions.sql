-- Migration V17: Finance Extensions for Mining ERP (7 Mining Finance Features)

-- 1. Sales Invoices (Accounts Receivable)
CREATE TABLE IF NOT EXISTS sales_invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_tonnage NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_per_ton NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    royalty_tax NUMERIC(14, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID, OVERDUE
    payment_terms VARCHAR(100),
    coal_grade VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mining Royalty & Tax Logs
CREATE TABLE IF NOT EXISTS mining_royalties (
    id VARCHAR(36) PRIMARY KEY,
    period_name VARCHAR(50) NOT NULL, -- e.g. "2025-Q1" or "2025-05"
    production_volume_tons NUMERIC(12, 2) NOT NULL,
    royalty_rate_percent NUMERIC(5, 2) NOT NULL,
    royalty_amount NUMERIC(14, 2) NOT NULL,
    environmental_tax NUMERIC(14, 2) DEFAULT 0,
    total_tax_due NUMERIC(14, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID
    due_date DATE,
    paid_date DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Budget Plans (Budgeting & Variance Analysis)
CREATE TABLE IF NOT EXISTS budget_plans (
    id VARCHAR(36) PRIMARY KEY,
    budget_year INT NOT NULL,
    category_name VARCHAR(100) NOT NULL, -- e.g. "Fuel", "Maintenance", "Contractor", "Royalty", "Labor"
    allocated_budget NUMERIC(14, 2) NOT NULL,
    actual_spent NUMERIC(14, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. General Ledger Entries
CREATE TABLE IF NOT EXISTS general_ledger_entries (
    id VARCHAR(36) PRIMARY KEY,
    entry_date DATE NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- REVENUE, COGS, OPEX, ASSET, LIABILITY
    debit_amount NUMERIC(14, 2) DEFAULT 0,
    credit_amount NUMERIC(14, 2) DEFAULT 0,
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
