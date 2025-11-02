-- Migration 004: Create Bond Challenges table
-- Module 09: Verification

CREATE TABLE IF NOT EXISTS bond_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bond_id UUID NOT NULL REFERENCES veracity_bonds(id) ON DELETE CASCADE,
    challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    challenge_amount BIGINT NOT NULL,
    challenge_reason TEXT NOT NULL,
    evidence JSONB DEFAULT '{}',

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bc_bond
    ON bond_challenges(bond_id, status);

CREATE INDEX IF NOT EXISTS idx_bc_challenger
    ON bond_challenges(challenger_id);

CREATE INDEX IF NOT EXISTS idx_bc_pending
    ON bond_challenges(status, created_at DESC) WHERE status = 'pending';
