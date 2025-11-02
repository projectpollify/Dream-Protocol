-- Migration 001: Create Proof of Humanity table
-- Module 09: Verification

CREATE TABLE IF NOT EXISTS proof_of_humanity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),

    -- Verification levels (0-5)
    level INTEGER NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),

    -- Multi-factor scores (0.00 to 1.00)
    behavioral_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (behavioral_score BETWEEN 0 AND 1),
    biometric_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (biometric_score BETWEEN 0 AND 1),
    social_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (social_score BETWEEN 0 AND 1),
    temporal_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (temporal_score BETWEEN 0 AND 1),
    economic_score DECIMAL(3, 2) DEFAULT 0.00 CHECK (economic_score BETWEEN 0 AND 1),

    -- Verification methods used
    methods_completed TEXT[] DEFAULT '{}',

    -- Timing
    last_verified TIMESTAMP,
    next_reverification TIMESTAMP,
    expires_at TIMESTAMP,

    -- Metadata
    verification_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, identity_mode),
    CHECK (level >= 0)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_poh_user_lookup
    ON proof_of_humanity(user_id, identity_mode, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_poh_status
    ON proof_of_humanity(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_poh_level
    ON proof_of_humanity(level, is_active);

CREATE INDEX IF NOT EXISTS idx_poh_expiring
    ON proof_of_humanity(expires_at) WHERE expires_at IS NOT NULL;
