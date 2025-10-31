-- ============================================================================
-- Module 04: Economy - Database Schema
-- ============================================================================
-- Creates tables for the 4-token economy:
-- - PollCoin (governance currency)
-- - Gratium (tipping/staking currency)
-- - Light Score (reputation metric)
-- - Spot-only enforcement (no lending/leverage)
-- ============================================================================

-- Table 1: Token Ledger (Master balances for all users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,

    -- Token Balances (stored as bigint for precision, divide by 10^18 for display)
    pollcoin_balance BIGINT DEFAULT 0 CHECK (pollcoin_balance >= 0),
    gratium_balance BIGINT DEFAULT 0 CHECK (gratium_balance >= 0),

    -- Locked Balances (staked in governance, veracity bonds, etc.)
    pollcoin_locked BIGINT DEFAULT 0 CHECK (pollcoin_locked >= 0),
    gratium_locked BIGINT DEFAULT 0 CHECK (gratium_locked >= 0),

    -- Available Balances (balance - locked) - Computed columns
    pollcoin_available BIGINT GENERATED ALWAYS AS (pollcoin_balance - pollcoin_locked) STORED,
    gratium_available BIGINT GENERATED ALWAYS AS (gratium_balance - gratium_locked) STORED,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, identity_mode),
    CHECK (pollcoin_balance >= pollcoin_locked),
    CHECK (gratium_balance >= gratium_locked)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_ledger_user ON token_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_token_ledger_mode ON token_ledger(identity_mode);
CREATE INDEX IF NOT EXISTS idx_token_ledger_balances ON token_ledger(pollcoin_balance, gratium_balance);

-- Table 2: Token Transactions (Complete transaction history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction Details
    transaction_type VARCHAR(30) CHECK (transaction_type IN (
        'transfer', 'tip', 'stake', 'unstake', 'burn',
        'reward', 'purchase', 'poll_creation', 'vote_cost',
        'veracity_bond', 'prediction_market'
    )) NOT NULL,

    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),

    -- Parties (nullable for system transactions)
    from_user_id UUID REFERENCES users(id),
    from_identity_mode VARCHAR(10) CHECK (from_identity_mode IN ('true_self', 'shadow')),
    to_user_id UUID REFERENCES users(id),
    to_identity_mode VARCHAR(10) CHECK (to_identity_mode IN ('true_self', 'shadow')),

    -- Transaction Fees
    fee_amount BIGINT DEFAULT 0 CHECK (fee_amount >= 0),
    burn_amount BIGINT DEFAULT 0 CHECK (burn_amount >= 0),

    -- Context (what was this transaction for?)
    reference_type VARCHAR(50), -- 'poll', 'post', 'comment', 'verification', etc.
    reference_id UUID,
    memo TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'failed', 'reversed'
    )),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Blockchain Integration (future)
    blockchain_tx_hash VARCHAR(66),
    blockchain_confirmed BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_tx_from_user ON token_transactions(from_user_id, from_identity_mode);
CREATE INDEX IF NOT EXISTS idx_token_tx_to_user ON token_transactions(to_user_id, to_identity_mode);
CREATE INDEX IF NOT EXISTS idx_token_tx_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_tx_reference ON token_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_token_tx_created ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_tx_status ON token_transactions(status);

-- Table 3: Token Locks (Track locked tokens for staking, bonds, escrow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,

    -- Lock Details
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),

    -- Lock Context
    lock_type VARCHAR(30) CHECK (lock_type IN (
        'governance_stake', 'veracity_bond', 'prediction_market',
        'poll_stake', 'escrow', 'penalty', 'cooldown'
    )) NOT NULL,

    reference_type VARCHAR(50),
    reference_id UUID,

    -- Lock Timing
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_at TIMESTAMPTZ, -- When tokens become available (can be NULL for indefinite locks)
    released_at TIMESTAMPTZ, -- When actually released

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'released', 'slashed', 'expired'
    )),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_locks_user ON token_locks(user_id, identity_mode);
CREATE INDEX IF NOT EXISTS idx_token_locks_type ON token_locks(lock_type);
CREATE INDEX IF NOT EXISTS idx_token_locks_reference ON token_locks(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_token_locks_status ON token_locks(status);
CREATE INDEX IF NOT EXISTS idx_token_locks_unlock ON token_locks(unlock_at) WHERE status = 'active';

-- Table 4: Light Scores (Reputation metric - managed by Pentos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS light_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Current Score (0-100 scale)
    current_score DECIMAL(5,2) DEFAULT 50.00 CHECK (current_score >= 0 AND current_score <= 100),

    -- Score History (for trending)
    score_7d_ago DECIMAL(5,2) CHECK (score_7d_ago IS NULL OR (score_7d_ago >= 0 AND score_7d_ago <= 100)),
    score_30d_ago DECIMAL(5,2) CHECK (score_30d_ago IS NULL OR (score_30d_ago >= 0 AND score_30d_ago <= 100)),
    score_90d_ago DECIMAL(5,2) CHECK (score_90d_ago IS NULL OR (score_90d_ago >= 0 AND score_90d_ago <= 100)),

    -- Score Trends
    trend_direction VARCHAR(10) CHECK (trend_direction IN ('up', 'down', 'stable')),
    trend_velocity DECIMAL(5,2) DEFAULT 0.00,

    -- Component Breakdown (for Pentos to manage)
    quality_score DECIMAL(5,2) DEFAULT 50.00 CHECK (quality_score >= 0 AND quality_score <= 100),
    helpfulness_score DECIMAL(5,2) DEFAULT 50.00 CHECK (helpfulness_score >= 0 AND helpfulness_score <= 100),
    consistency_score DECIMAL(5,2) DEFAULT 50.00 CHECK (consistency_score >= 0 AND consistency_score <= 100),
    trust_score DECIMAL(5,2) DEFAULT 50.00 CHECK (trust_score >= 0 AND trust_score <= 100),

    -- Metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_light_scores_user ON light_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_light_scores_score ON light_scores(current_score DESC);
CREATE INDEX IF NOT EXISTS idx_light_scores_trend ON light_scores(trend_direction);

-- Table 5: Light Score Events (Audit log of score changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS light_score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Event Details
    event_type VARCHAR(50) CHECK (event_type IN (
        'post_created', 'helpful_comment', 'verification_completed',
        'governance_participation', 'bond_created', 'prediction_correct',
        'spam_detected', 'violation', 'helpful_vote', 'quality_contribution'
    )) NOT NULL,

    -- Impact
    score_change DECIMAL(5,2) NOT NULL,
    old_score DECIMAL(5,2) NOT NULL CHECK (old_score >= 0 AND old_score <= 100),
    new_score DECIMAL(5,2) NOT NULL CHECK (new_score >= 0 AND new_score <= 100),

    -- Context
    reference_type VARCHAR(50),
    reference_id UUID,

    -- Pentos Decision
    pentos_reasoning TEXT,
    pentos_confidence DECIMAL(3,2) CHECK (pentos_confidence IS NULL OR (pentos_confidence >= 0 AND pentos_confidence <= 1)),

    -- Metadata
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_light_score_events_user ON light_score_events(user_id);
CREATE INDEX IF NOT EXISTS idx_light_score_events_type ON light_score_events(event_type);
CREATE INDEX IF NOT EXISTS idx_light_score_events_occurred ON light_score_events(occurred_at DESC);

-- Table 6: Token Supply (Track total supply, circulating, burned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_supply (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL UNIQUE,

    -- Supply Metrics (in smallest unit - wei equivalent)
    total_minted BIGINT DEFAULT 0 CHECK (total_minted >= 0),
    total_burned BIGINT DEFAULT 0 CHECK (total_burned >= 0),
    circulating_supply BIGINT GENERATED ALWAYS AS (total_minted - total_burned) STORED,

    -- Locked Supply (staked, bonded, etc.)
    total_locked BIGINT DEFAULT 0 CHECK (total_locked >= 0),
    available_supply BIGINT GENERATED ALWAYS AS (total_minted - total_burned - total_locked) STORED,

    -- Emission Schedule
    emission_rate DECIMAL(5,4) NOT NULL,
    last_emission_at TIMESTAMPTZ,
    next_emission_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: can't burn more than minted
    CHECK (total_burned <= total_minted),
    CHECK (total_locked <= (total_minted - total_burned))
);

-- Initialize with starting supply
-- PollCoin: 1 billion tokens = 1,000,000,000 * 10^18 = 1000000000000000000000000000
-- Gratium: 500 million tokens = 500,000,000 * 10^18 = 500000000000000000000000000
INSERT INTO token_supply (token_type, total_minted, emission_rate, next_emission_at)
VALUES
    ('pollcoin', 1000000000000000000000000000, 0.0500, NOW() + INTERVAL '1 year'),
    ('gratium', 500000000000000000000000000, 0.0300, NOW() + INTERVAL '1 year')
ON CONFLICT (token_type) DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE token_ledger IS 'Master ledger tracking PollCoin and Gratium balances for all users (dual identity support)';
COMMENT ON TABLE token_transactions IS 'Complete transaction history for all token movements';
COMMENT ON TABLE token_locks IS 'Tracks locked tokens (stakes, bonds, escrow) with unlock conditions';
COMMENT ON TABLE light_scores IS 'User reputation scores (0-100) managed by Pentos AI';
COMMENT ON TABLE light_score_events IS 'Audit log of all Light Score changes with Pentos reasoning';
COMMENT ON TABLE token_supply IS 'Global token supply metrics (minted, burned, circulating, locked)';

COMMENT ON COLUMN token_ledger.pollcoin_balance IS 'Total PollCoin balance in wei (divide by 10^18 for display)';
COMMENT ON COLUMN token_ledger.gratium_balance IS 'Total Gratium balance in wei (divide by 10^18 for display)';
COMMENT ON COLUMN token_ledger.pollcoin_locked IS 'PollCoin locked in stakes/bonds (unavailable for transfer)';
COMMENT ON COLUMN token_ledger.gratium_locked IS 'Gratium locked in stakes/bonds (unavailable for transfer)';

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '   ✓ Module 04: Economy - Schema Created Successfully';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '   Tables Created: 6';
    RAISE NOTICE '   - token_ledger (user balances)';
    RAISE NOTICE '   - token_transactions (transaction history)';
    RAISE NOTICE '   - token_locks (staked/locked tokens)';
    RAISE NOTICE '   - light_scores (reputation metric)';
    RAISE NOTICE '   - light_score_events (score change audit log)';
    RAISE NOTICE '   - token_supply (global supply metrics)';
    RAISE NOTICE '';
    RAISE NOTICE '   Initial Supply:';
    RAISE NOTICE '   - PollCoin: 1,000,000,000 POLL (5%% inflation)';
    RAISE NOTICE '   - Gratium: 500,000,000 GRAT (3%% inflation)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
