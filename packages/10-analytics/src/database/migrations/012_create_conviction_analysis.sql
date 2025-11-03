-- Module 10: Analytics - Conviction Analysis Table
-- Analyzes relationship between reputation (Light Score) and voting patterns

CREATE TABLE IF NOT EXISTS conviction_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE,

    -- Reputation Segment Thresholds
    high_light_score_threshold DECIMAL(5,2) DEFAULT 70,
    mid_light_score_threshold DECIMAL(5,2) DEFAULT 40,

    -- Voting Patterns by Reputation Segment: High
    high_reputation_true_yes DECIMAL(5,2),
    high_reputation_shadow_yes DECIMAL(5,2),
    high_reputation_delta DECIMAL(5,2),
    high_reputation_count INTEGER DEFAULT 0,

    -- Voting Patterns by Reputation Segment: Medium
    mid_reputation_true_yes DECIMAL(5,2),
    mid_reputation_shadow_yes DECIMAL(5,2),
    mid_reputation_delta DECIMAL(5,2),
    mid_reputation_count INTEGER DEFAULT 0,

    -- Voting Patterns by Reputation Segment: Low
    low_reputation_true_yes DECIMAL(5,2),
    low_reputation_shadow_yes DECIMAL(5,2),
    low_reputation_delta DECIMAL(5,2),
    low_reputation_count INTEGER DEFAULT 0,

    -- Key Insights
    reputation_correlation DECIMAL(4,3),
    interpretation VARCHAR(255),

    -- Stakes Analysis
    average_stake_yes DECIMAL(10,2),
    average_stake_no DECIMAL(10,2),
    stake_conviction_ratio DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_conviction_poll ON conviction_analysis(poll_id);
CREATE INDEX idx_conviction_correlation ON conviction_analysis(reputation_correlation);
CREATE INDEX idx_conviction_created ON conviction_analysis(created_at DESC);
