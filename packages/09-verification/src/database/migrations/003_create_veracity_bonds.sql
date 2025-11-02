-- Migration 003: Create Veracity Bonds table
-- Module 09: Verification

CREATE TABLE IF NOT EXISTS veracity_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),

    -- What is being bonded
    bond_type VARCHAR(20) NOT NULL CHECK (bond_type IN ('claim', 'post', 'comment', 'prediction')),
    target_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,

    -- Bond details
    gratium_amount BIGINT NOT NULL CHECK (gratium_amount >= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'resolved_truthful', 'resolved_false', 'expired', 'challenged')
    ),

    -- Resolution
    resolved_at TIMESTAMP,
    resolution_evidence JSONB,
    slashed_amount BIGINT DEFAULT 0,

    -- Metadata
    claim_text TEXT,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 10),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vb_user
    ON veracity_bonds(user_id, identity_mode, status);

CREATE INDEX IF NOT EXISTS idx_vb_target
    ON veracity_bonds(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_vb_status
    ON veracity_bonds(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_vb_active
    ON veracity_bonds(status, user_id) WHERE status = 'active';
