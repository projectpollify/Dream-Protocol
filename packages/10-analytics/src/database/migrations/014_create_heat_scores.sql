-- Module 10: Analytics - Heat Scores Table
-- Tracks discussion intensity and engagement heat for various content types

CREATE TABLE IF NOT EXISTS heat_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to content (poll, post, chamber, pillar, topic)
    reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN (
        'poll', 'post', 'chamber', 'pillar', 'topic'
    )),
    reference_id UUID NOT NULL,

    -- Heat Calculation Inputs
    view_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Velocity Metrics (per hour)
    views_per_hour DECIMAL(8,2) DEFAULT 0,
    comments_per_hour DECIMAL(8,2) DEFAULT 0,
    acceleration DECIMAL(6,2) DEFAULT 0,

    -- Heat Score (0-100)
    current_heat_score DECIMAL(5,2) DEFAULT 0,
    peak_heat_score DECIMAL(5,2) DEFAULT 0,
    heat_trend VARCHAR(20) NOT NULL CHECK (heat_trend IN (
        'heating', 'cooling', 'stable', 'explosive'
    )) DEFAULT 'stable',

    -- Time Tracking
    first_activity TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    peak_activity TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_heat_scores_reference ON heat_scores(reference_type, reference_id);
CREATE INDEX idx_heat_scores_current ON heat_scores(current_heat_score DESC);
CREATE INDEX idx_heat_scores_trend ON heat_scores(heat_trend);
CREATE INDEX idx_heat_scores_updated ON heat_scores(updated_at DESC);
