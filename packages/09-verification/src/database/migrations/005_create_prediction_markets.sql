-- Migration 005: Create Prediction Markets Table
-- Module 09: Verification - Session 2
--
-- LMSR-based binary prediction markets for staking on outcomes.
-- Each market has YES/NO outcomes with separate share counts.

CREATE TABLE IF NOT EXISTS prediction_markets (
  id VARCHAR(255) PRIMARY KEY,
  creator_id UUID NOT NULL,
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(255),

  -- LMSR Algorithm Parameters
  liquidity_parameter DECIMAL(20, 10) NOT NULL DEFAULT 100,

  -- Probabilities (0.0 to 1.0)
  initial_probability DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
  current_probability DECIMAL(5, 4) NOT NULL DEFAULT 0.5,

  -- Share quantities (in LMSR terms, q_yes and q_no)
  outcome_yes_shares BIGINT NOT NULL DEFAULT 0,
  outcome_no_shares BIGINT NOT NULL DEFAULT 0,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved', 'cancelled')),
  resolution VARCHAR(50),
  resolved_at TIMESTAMP,
  resolution_source VARCHAR(255),

  -- Volume tracking
  total_volume BIGINT NOT NULL DEFAULT 0,
  unique_traders INTEGER NOT NULL DEFAULT 0,
  last_trade_at TIMESTAMP,

  -- Timestamps
  opens_at TIMESTAMP NOT NULL,
  closes_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prediction_markets_creator_id ON prediction_markets(creator_id);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_category ON prediction_markets(category);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_closes_at ON prediction_markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_created_at ON prediction_markets(created_at);

COMMENT ON TABLE prediction_markets IS 'Binary prediction markets using LMSR pricing algorithm';
COMMENT ON COLUMN prediction_markets.liquidity_parameter IS 'LMSR liquidity parameter "b" - controls price sensitivity';
COMMENT ON COLUMN prediction_markets.outcome_yes_shares IS 'Total YES shares issued (q_yes in LMSR formula)';
COMMENT ON COLUMN prediction_markets.outcome_no_shares IS 'Total NO shares issued (q_no in LMSR formula)';
