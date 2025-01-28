-- Table for storing fraudulent orders
CREATE TABLE fraudulent_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL,           -- Original order number from the platform
    platform_type TEXT NOT NULL,          -- 'shopify' or 'magento'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Order details
    customer_email TEXT,
    customer_name TEXT,
    total_amount DECIMAL(10,2),
    
    -- Shipping information
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_country TEXT NOT NULL,
    
    -- IP details
    client_ip TEXT,
    ip_city TEXT,
    ip_country TEXT,
    
    -- Fraud detection details
    fraud_score INTEGER NOT NULL,         -- Overall fraud score (0-100)
    fraud_reasons TEXT NOT NULL,          -- JSON array of reasons why order was flagged
    status TEXT DEFAULT 'pending_review', -- pending_review, confirmed_fraud, false_positive
    reviewed_at TIMESTAMP,
    reviewed_by TEXT,
    
    -- Metadata
    duoplane_id TEXT NOT NULL,
    UNIQUE(order_number, platform_type)
);

-- Table for blocked addresses
CREATE TABLE blocked_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    expires_at TIMESTAMP,              -- NULL means never expires
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure we don't block the same address twice
    UNIQUE(address, city, country)
);

-- Index for faster address lookups
CREATE INDEX idx_blocked_addresses_lookup 
ON blocked_addresses(address, city, country) 
WHERE is_active = true;

-- Index for order queries
CREATE INDEX idx_fraudulent_orders_status 
ON fraudulent_orders(status, created_at);