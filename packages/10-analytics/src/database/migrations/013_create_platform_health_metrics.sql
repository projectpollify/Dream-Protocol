-- Module 10: Analytics - Platform Health Metrics Table
-- Real-time platform health tracking and monitoring

CREATE TABLE IF NOT EXISTS platform_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Time Window
    metric_timestamp TIMESTAMPTZ NOT NULL,
    window_type VARCHAR(20) NOT NULL CHECK (window_type IN (
        'realtime', 'hourly', 'daily', 'weekly'
    )),

    -- User Metrics
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    verified_humans INTEGER DEFAULT 0,
    dual_identity_users INTEGER DEFAULT 0,

    -- Engagement Metrics
    total_votes_cast INTEGER DEFAULT 0,
    shadow_participation_rate DECIMAL(5,2) DEFAULT 0,
    average_session_duration INTEGER DEFAULT 0,
    polls_created INTEGER DEFAULT 0,

    -- Economic Health
    pollcoin_velocity DECIMAL(10,2) DEFAULT 0,
    gratium_staked DECIMAL(12,2) DEFAULT 0,
    average_light_score DECIMAL(5,2) DEFAULT 0,
    economic_participation_rate DECIMAL(5,2) DEFAULT 0,

    -- Content Metrics
    posts_created INTEGER DEFAULT 0,
    comments_created INTEGER DEFAULT 0,
    reactions_given INTEGER DEFAULT 0,
    content_quality_score DECIMAL(5,2) DEFAULT 0,

    -- System Performance
    api_response_time_ms INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,

    -- Bot Detection
    suspected_bot_accounts INTEGER DEFAULT 0,
    sybil_attack_probability DECIMAL(3,2) DEFAULT 0,

    -- Health Score (0-100)
    overall_health_score DECIMAL(5,2) DEFAULT 0,
    health_status VARCHAR(20) NOT NULL CHECK (health_status IN (
        'healthy', 'monitoring', 'concern', 'critical'
    )) DEFAULT 'healthy',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_health_metrics_timestamp ON platform_health_metrics(metric_timestamp DESC);
CREATE INDEX idx_health_metrics_status ON platform_health_metrics(health_status);
CREATE INDEX idx_health_metrics_window ON platform_health_metrics(window_type);
