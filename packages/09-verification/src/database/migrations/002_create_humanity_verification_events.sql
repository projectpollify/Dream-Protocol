-- Migration 002: Create Humanity Verification Events table
-- Module 09: Verification

CREATE TABLE IF NOT EXISTS humanity_verification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poh_id UUID NOT NULL REFERENCES proof_of_humanity(id) ON DELETE CASCADE,

    method VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('passed', 'failed', 'inconclusive')),
    score DECIMAL(3, 2),

    -- Evidence
    evidence JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hve_poh
    ON humanity_verification_events(poh_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hve_method
    ON humanity_verification_events(method, result);

CREATE INDEX IF NOT EXISTS idx_hve_recent
    ON humanity_verification_events(created_at DESC);
