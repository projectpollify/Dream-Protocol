-- ============================================================================
-- Module 05: Token Exchange Integration - Database Schema
-- ============================================================================
--
-- This schema defines 5 core tables for token exchange functionality:
-- 1. token_purchase_orders - Track all fiat-to-token purchases
-- 2. dex_listings - Monitor external DEX listings for compliance
-- 3. purchase_limits - Enforce tier-based purchase limits
-- 4. price_history - Historical pricing for analytics
-- 5. compliance_alerts - Track spot-only violations
--
-- Dependencies: Module 04 (Economy) - requires token_ledger table
-- ============================================================================

-- ============================================================================
-- TABLE 1: token_purchase_orders
-- Purpose: Track all fiat-to-token purchases through the platform
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References users(id) from Module 03
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,

    -- Purchase Details
    fiat_amount DECIMAL(15,2) NOT NULL, -- USD/EUR/etc amount
    fiat_currency VARCHAR(3) NOT NULL DEFAULT 'USD', -- ISO currency code

    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    token_amount BIGINT NOT NULL, -- In wei (smallest unit)

    -- Pricing
    price_per_token DECIMAL(20,10) NOT NULL, -- What the user paid per token
    premium_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- Our markup

    -- Payment Provider
    payment_provider VARCHAR(50) NOT NULL, -- 'stripe', 'moonpay', 'wyre'
    provider_transaction_id VARCHAR(100) NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    )),

    -- KYC/AML
    kyc_verified BOOLEAN DEFAULT FALSE,
    aml_check_result VARCHAR(20), -- 'pass', 'fail', 'pending', 'manual_review'
    geographic_region VARCHAR(50), -- For compliance tracking

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    refund_reason TEXT, -- If refunded

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_purchase_orders_user ON token_purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_status ON token_purchase_orders(status);
CREATE INDEX idx_purchase_orders_provider ON token_purchase_orders(payment_provider);
CREATE INDEX idx_purchase_orders_created ON token_purchase_orders(created_at DESC);
CREATE INDEX idx_purchase_orders_kyc ON token_purchase_orders(kyc_verified);
CREATE INDEX idx_purchase_orders_token_type ON token_purchase_orders(token_type);

-- ============================================================================
-- TABLE 2: dex_listings
-- Purpose: Monitor external DEX listings for spot-only compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS dex_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- DEX Info
    dex_name VARCHAR(50) NOT NULL, -- 'uniswap', 'sushiswap', 'curve', etc.
    dex_chain VARCHAR(50) NOT NULL, -- 'ethereum', 'cardano', etc.

    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    pool_address VARCHAR(66) NOT NULL, -- Smart contract address

    -- Listing Details
    trading_pair VARCHAR(30) NOT NULL, -- 'POLL/USDC', 'GRAT/ETH', etc.
    liquidity_usd DECIMAL(20,2) NOT NULL, -- Total liquidity in pool

    -- Spot-Only Compliance
    is_leverage_pool BOOLEAN DEFAULT FALSE, -- Margin trading enabled?
    is_shorting_enabled BOOLEAN DEFAULT FALSE, -- Shorts allowed?
    has_lending_integration BOOLEAN DEFAULT FALSE, -- Aave/Compound?

    compliance_status VARCHAR(20) NOT NULL DEFAULT 'monitoring' CHECK (
        compliance_status IN ('compliant', 'violation_detected', 'monitoring', 'blocked')
    ),

    -- Pricing
    price_usd DECIMAL(20,10),
    volume_24h DECIMAL(20,2),
    price_change_24h DECIMAL(5,2),

    -- Metadata
    listed_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one listing per DEX pool
    UNIQUE(dex_name, pool_address)
);

-- Indexes for performance
CREATE INDEX idx_dex_listings_token ON dex_listings(token_type);
CREATE INDEX idx_dex_listings_dex ON dex_listings(dex_name);
CREATE INDEX idx_dex_listings_compliance ON dex_listings(compliance_status);
CREATE INDEX idx_dex_listings_price ON dex_listings(price_usd);
CREATE INDEX idx_dex_listings_checked ON dex_listings(last_checked_at DESC);

-- ============================================================================
-- TABLE 3: purchase_limits
-- Purpose: Enforce tier-based purchase limits per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- One limit record per user

    -- Tier System
    verification_tier VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (
        verification_tier IN ('unverified', 'basic', 'verified', 'premium', 'institutional')
    ),

    -- Daily/Monthly Limits (in tokens)
    daily_limit BIGINT NOT NULL,
    monthly_limit BIGINT NOT NULL,
    yearly_limit BIGINT NOT NULL,

    -- Current Period Totals
    purchased_today BIGINT DEFAULT 0,
    purchased_this_month BIGINT DEFAULT 0,
    purchased_this_year BIGINT DEFAULT 0,

    -- Tracking
    last_purchase_at TIMESTAMPTZ,
    last_reset_daily TIMESTAMPTZ DEFAULT NOW(),
    last_reset_monthly TIMESTAMPTZ DEFAULT NOW(),
    last_reset_yearly TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_purchase_limits_user ON purchase_limits(user_id);
CREATE INDEX idx_purchase_limits_tier ON purchase_limits(verification_tier);

-- ============================================================================
-- TABLE 4: price_history
-- Purpose: Track historical pricing for analytics and trends
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'on_platform', 'uniswap', 'sushiswap', etc.

    -- Pricing Data
    price_usd DECIMAL(20,10) NOT NULL,
    volume_24h DECIMAL(20,2),
    market_cap DECIMAL(25,2),

    -- On-Platform Stats
    platform_sales_24h BIGINT DEFAULT 0, -- Tokens sold on-platform
    platform_revenue_24h DECIMAL(15,2) DEFAULT 0, -- USD collected

    -- Metadata
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_price_history_token ON price_history(token_type);
CREATE INDEX idx_price_history_source ON price_history(source);
CREATE INDEX idx_price_history_date ON price_history(recorded_at DESC);
CREATE INDEX idx_price_history_token_date ON price_history(token_type, recorded_at DESC);

-- ============================================================================
-- TABLE 5: compliance_alerts
-- Purpose: Monitor and track spot-only violations
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Alert Details
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'lending_integration_detected',
        'shorting_enabled_on_pool',
        'margin_trading_enabled',
        'flash_loan_enabled',
        'unusual_volume_spike',
        'price_manipulation_suspected',
        'whale_accumulation',
        'regulatory_concern'
    )),

    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

    -- Context
    token_type VARCHAR(10),
    dex_name VARCHAR(50),
    pool_address VARCHAR(66),

    description TEXT NOT NULL,
    recommended_action TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'investigating', 'resolved', 'dismissed')
    ),

    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX idx_compliance_alerts_type ON compliance_alerts(alert_type);
CREATE INDEX idx_compliance_alerts_created ON compliance_alerts(created_at DESC);
CREATE INDEX idx_compliance_alerts_token ON compliance_alerts(token_type);

-- ============================================================================
-- INITIAL DATA: Purchase Tier Defaults
-- ============================================================================

-- This data will be inserted when a user first registers
-- The application will create a purchase_limit record for each new user
-- with tier = 'unverified' and these default limits

-- Tier: Unverified (Email verified only)
-- Daily: 500 tokens, Monthly: 5,000, Yearly: 50,000

-- Tier: Basic (Phone + ID verified)
-- Daily: 2,500 tokens, Monthly: 25,000, Yearly: 250,000

-- Tier: Verified (Full KYC + AML pass)
-- Daily: 10,000 tokens, Monthly: 100,000, Yearly: 1,000,000

-- Tier: Premium (Verified + $500K+ net worth)
-- Daily: 50,000 tokens, Monthly: 500,000, Yearly: 5,000,000

-- Tier: Institutional (Corporate verification)
-- Daily: 9223372036854775807 (No limit)
-- Monthly: 9223372036854775807 (No limit)
-- Yearly: 9223372036854775807 (No limit)

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Auto-update updated_at on token_purchase_orders
CREATE OR REPLACE FUNCTION update_token_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_token_purchase_orders_updated_at
    BEFORE UPDATE ON token_purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_token_purchase_orders_updated_at();

-- Auto-update updated_at on dex_listings
CREATE OR REPLACE FUNCTION update_dex_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dex_listings_updated_at
    BEFORE UPDATE ON dex_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_dex_listings_updated_at();

-- Auto-update updated_at on purchase_limits
CREATE OR REPLACE FUNCTION update_purchase_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_limits_updated_at
    BEFORE UPDATE ON purchase_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_limits_updated_at();

-- Auto-update updated_at on compliance_alerts
CREATE OR REPLACE FUNCTION update_compliance_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_alerts_updated_at
    BEFORE UPDATE ON compliance_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_alerts_updated_at();

-- ============================================================================
-- COMMENTS: Table and column documentation
-- ============================================================================

COMMENT ON TABLE token_purchase_orders IS 'Tracks all fiat-to-token purchases made through the platform';
COMMENT ON TABLE dex_listings IS 'Monitors external DEX listings for spot-only compliance';
COMMENT ON TABLE purchase_limits IS 'Enforces tier-based purchase limits per user';
COMMENT ON TABLE price_history IS 'Historical token pricing for analytics';
COMMENT ON TABLE compliance_alerts IS 'Tracks spot-only violations and regulatory concerns';

COMMENT ON COLUMN token_purchase_orders.premium_percentage IS 'Platform markup percentage (usually 15%)';
COMMENT ON COLUMN token_purchase_orders.provider_transaction_id IS 'Transaction ID from payment provider (Stripe, MoonPay, etc.)';
COMMENT ON COLUMN dex_listings.compliance_status IS 'Spot-only compliance: compliant, violation_detected, monitoring, or blocked';
COMMENT ON COLUMN purchase_limits.verification_tier IS 'User KYC tier: unverified, basic, verified, premium, or institutional';
COMMENT ON COLUMN compliance_alerts.alert_type IS 'Type of violation detected (lending, shorting, margin, etc.)';
