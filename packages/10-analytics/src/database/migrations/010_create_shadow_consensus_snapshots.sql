-- Module 10: Analytics - Shadow Consensus Snapshots Table
-- Stores calculated Shadow Consensus for each poll at regular intervals

CREATE TABLE IF NOT EXISTS shadow_consensus_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE,

    -- Snapshot Timing
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    hours_since_poll_start INTEGER NOT NULL,
    snapshot_type VARCHAR(20) NOT NULL CHECK (snapshot_type IN (
        'hourly', 'daily', 'final', 'milestone'
    )),

    -- Vote Counts
    true_self_yes_count INTEGER DEFAULT 0,
    true_self_no_count INTEGER DEFAULT 0,
    true_self_abstain_count INTEGER DEFAULT 0,
    shadow_yes_count INTEGER DEFAULT 0,
    shadow_no_count INTEGER DEFAULT 0,
    shadow_abstain_count INTEGER DEFAULT 0,

    -- Percentages
    true_self_yes_percent DECIMAL(5,2),
    true_self_no_percent DECIMAL(5,2),
    true_self_abstain_percent DECIMAL(5,2),
    shadow_yes_percent DECIMAL(5,2),
    shadow_no_percent DECIMAL(5,2),
    shadow_abstain_percent DECIMAL(5,2),

    -- THE KEY METRIC: Shadow Consensus Delta
    consensus_delta DECIMAL(5,2) NOT NULL,
    delta_direction VARCHAR(50) NOT NULL CHECK (delta_direction IN (
        'ALIGNED',
        'PUBLIC_SUPPORT_PRIVATE_OPPOSITION',
        'PUBLIC_OPPOSITION_PRIVATE_SUPPORT'
    )),

    -- Social Pressure Score (0-100)
    social_pressure_score DECIMAL(5,2),

    -- Statistical Confidence
    confidence_interval DECIMAL(4,2),
    sample_size INTEGER,
    statistical_significance BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_shadow_consensus_poll ON shadow_consensus_snapshots(poll_id);
CREATE INDEX idx_shadow_consensus_timestamp ON shadow_consensus_snapshots(snapshot_timestamp DESC);
CREATE INDEX idx_shadow_consensus_delta ON shadow_consensus_snapshots(consensus_delta DESC);
CREATE INDEX idx_shadow_consensus_direction ON shadow_consensus_snapshots(delta_direction);
