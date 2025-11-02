-- Migration 008: Create Epistemic Scores Table
-- Module 09: Verification - Session 2
--
-- Stores the complete 5-layer epistemic funnel scores for posts, comments, claims, etc.
-- Provides comprehensive truth discovery through multi-dimensional analysis.

CREATE TABLE IF NOT EXISTS epistemic_scores (
  id VARCHAR(255) PRIMARY KEY,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('user', 'post', 'comment', 'claim', 'market')),
  target_id VARCHAR(255) NOT NULL,

  -- 5-layer funnel scores (0-100 each)
  surface_score INT NOT NULL CHECK (surface_score >= 0 AND surface_score <= 100),
  contextual_score INT NOT NULL CHECK (contextual_score >= 0 AND contextual_score <= 100),
  analytical_score INT NOT NULL CHECK (analytical_score >= 0 AND analytical_score <= 100),
  synthesis_score INT NOT NULL CHECK (synthesis_score >= 0 AND synthesis_score <= 100),
  meta_score INT NOT NULL CHECK (meta_score >= 0 AND meta_score <= 100),

  -- Final weighted score (0-100)
  final_score INT NOT NULL CHECK (final_score >= 0 AND final_score <= 100),

  -- Confidence in the score itself (0-100)
  -- High confidence: layers agree, low: layers diverge
  confidence INT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

  -- Detailed factors used in scoring
  factors JSONB NOT NULL DEFAULT '{}',

  -- Timing
  calculated_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_epistemic_scores_target ON epistemic_scores(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_scores_final_score ON epistemic_scores(final_score);
CREATE INDEX IF NOT EXISTS idx_epistemic_scores_calculated_at ON epistemic_scores(calculated_at);
CREATE INDEX IF NOT EXISTS idx_epistemic_scores_expires_at ON epistemic_scores(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_epistemic_scores_latest ON epistemic_scores(target_type, target_id, calculated_at);

COMMENT ON TABLE epistemic_scores IS '5-layer epistemic funnel truth discovery scores';
COMMENT ON COLUMN epistemic_scores.surface_score IS 'Grammar, readability, formatting (10% weight)';
COMMENT ON COLUMN epistemic_scores.contextual_score IS 'Author credibility, sources, timeliness (15% weight)';
COMMENT ON COLUMN epistemic_scores.analytical_score IS 'Logic, evidence, argumentation (25% weight)';
COMMENT ON COLUMN epistemic_scores.synthesis_score IS 'Integration, creativity, insights (25% weight)';
COMMENT ON COLUMN epistemic_scores.meta_score IS 'Self-awareness, humility, uncertainty (25% weight)';
COMMENT ON COLUMN epistemic_scores.confidence IS 'Confidence in final score based on layer agreement';
