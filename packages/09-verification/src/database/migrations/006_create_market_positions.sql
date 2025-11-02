-- Migration 006: Create Market Positions Table
-- Module 09: Verification - Session 2
--
-- Tracks user positions (share holdings) in prediction markets.
-- Separate positions for each outcome to support tracking average cost basis.

CREATE TABLE IF NOT EXISTS market_positions (
  id VARCHAR(255) PRIMARY KEY,
  market_id VARCHAR(255) NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  identity_mode VARCHAR(50) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),
  outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('yes', 'no')),

  -- Share holding
  shares BIGINT NOT NULL DEFAULT 0,

  -- Cost tracking for P&L calculations
  average_price DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
  invested_gratium BIGINT NOT NULL DEFAULT 0,
  current_value BIGINT NOT NULL DEFAULT 0,
  realized_profit BIGINT NOT NULL DEFAULT 0,

  -- Activity tracking
  last_trade_at TIMESTAMP NOT NULL,
  trades_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_positions_market_id ON market_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_market_positions_user_id ON market_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_market_positions_market_user ON market_positions(market_id, user_id);
CREATE INDEX IF NOT EXISTS idx_market_positions_market_outcome ON market_positions(market_id, outcome);

COMMENT ON TABLE market_positions IS 'User positions (share holdings) in prediction markets';
COMMENT ON COLUMN market_positions.average_price IS 'Average entry price for position (0-1 probability)';
COMMENT ON COLUMN market_positions.shares IS 'Number of shares held (can be 0)';
COMMENT ON COLUMN market_positions.invested_gratium IS 'Total Gratium spent acquiring these shares';
COMMENT ON COLUMN market_positions.current_value IS 'Current value of position in Gratium';
COMMENT ON COLUMN market_positions.realized_profit IS 'P&L from closed positions';
