-- Migration 009: Create Epistemic Factors Table
-- Module 09: Verification - Session 2
--
-- Detailed breakdown of individual factors within each epistemic layer.
-- Enables granular analysis and provides explainability for scores.

CREATE TABLE IF NOT EXISTS epistemic_factors (
  id VARCHAR(255) PRIMARY KEY,
  score_id VARCHAR(255) NOT NULL REFERENCES epistemic_scores(id) ON DELETE CASCADE,
  layer VARCHAR(50) NOT NULL CHECK (layer IN ('surface', 'contextual', 'analytical', 'synthesis', 'meta')),
  factor_type VARCHAR(255) NOT NULL,
  value DECIMAL(5, 2) NOT NULL,
  weight DECIMAL(5, 4) NOT NULL,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_epistemic_factors_score_id ON epistemic_factors(score_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_factors_layer ON epistemic_factors(layer);
CREATE INDEX IF NOT EXISTS idx_epistemic_factors_factor_type ON epistemic_factors(factor_type);

COMMENT ON TABLE epistemic_factors IS 'Detailed factors contributing to epistemic layer scores';
COMMENT ON COLUMN epistemic_factors.value IS 'Factor value contribution (typically 0-100)';
COMMENT ON COLUMN epistemic_factors.weight IS 'Weight of this factor within its layer';
COMMENT ON COLUMN epistemic_factors.evidence IS 'Supporting evidence or details for this factor';
