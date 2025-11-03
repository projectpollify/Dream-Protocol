-- Module 10: Analytics - Trend Predictions Table
-- Stores predictive analytics about future opinion shifts

CREATE TABLE IF NOT EXISTS trend_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE,

    -- Prediction Details
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN (
        'opinion_shift',
        'consensus_convergence',
        'tipping_point',
        'cascade_effect'
    )),

    -- Current State
    current_delta DECIMAL(5,2) NOT NULL,
    current_direction VARCHAR(50) NOT NULL,

    -- Prediction
    predicted_delta_7d DECIMAL(5,2),
    predicted_delta_30d DECIMAL(5,2),
    predicted_convergence_date DATE,
    confidence_score DECIMAL(3,2) NOT NULL,

    -- Historical Basis
    similar_historical_patterns INTEGER DEFAULT 0,
    average_convergence_days INTEGER,

    -- Reasoning (JSON for ML model features)
    prediction_reasoning JSONB,
    key_factors TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_trend_predictions_poll ON trend_predictions(poll_id);
CREATE INDEX idx_trend_predictions_confidence ON trend_predictions(confidence_score DESC);
CREATE INDEX idx_trend_predictions_type ON trend_predictions(prediction_type);
CREATE INDEX idx_trend_predictions_created ON trend_predictions(created_at DESC);
