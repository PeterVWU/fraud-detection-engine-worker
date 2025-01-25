-- Orders Table (already provided)
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    platform_type TEXT NOT NULL,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL,
    customer_data JSON NOT NULL,
    shipping_address JSON NOT NULL,
    billing_address JSON NOT NULL,
    payment_data JSON NOT NULL,
    items JSON NOT NULL,
    total_amount DECIMAL NOT NULL,
    fraud_score DECIMAL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud Rules Table
CREATE TABLE fraud_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    config JSON NOT NULL,
    priority INTEGER NOT NULL,
    score_impact DECIMAL NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud Checks Table (already provided)
CREATE TABLE fraud_checks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    result TEXT NOT NULL,
    score DECIMAL NOT NULL,
    details TEXT,
    metadata JSON,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (rule_id) REFERENCES fraud_rules(id)
);

-- Blocklist Table
CREATE TABLE blocklist_entries (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,  -- 'ip', 'email', 'address', 'pattern'
    value TEXT NOT NULL,
    reason TEXT,
    added_by TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, value)
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT,
    changes JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_platform ON orders(platform_type, platform_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_fraud_checks_order_id ON fraud_checks(order_id);
CREATE INDEX idx_fraud_checks_created_at ON fraud_checks(created_at);
CREATE INDEX idx_blocklist_type_value ON blocklist_entries(type, value);
CREATE INDEX idx_blocklist_active_expires ON blocklist_entries(is_active, expires_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);