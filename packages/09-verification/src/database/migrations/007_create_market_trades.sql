-- Migration 007: Create Market Trades Table
-- Module 09: Verification - Session 2
--
-- Complete transaction history for all prediction market trades.
-- Immutable record of all buy/sell activity for audit and analysis.

CREATE TABLE IF NOT EXISTS market_trades (
  id VARCHAR(255) PRIMARY KEY,
  market_id VARCHAR(255) NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  identity_mode VARCHAR(50) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),

  -- Trade details
  trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('yes', 'no')),

  -- Quantities and pricing
  shares BIGINT NOT NULL,
  price DECIMAL(5, 4) NOT NULL,
  gratium_amount BIGINT NOT NULL,

  -- Market state before/after
  probability_before DECIMAL(5, 4) NOT NULL,
  probability_after DECIMAL(5, 4) NOT NULL,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analysis
CREATE INDEX IF NOT EXISTS idx_market_trades_market_id ON market_trades(market_id);
CREATE INDEX IF NOT EXISTS idx_market_trades_user_id ON market_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_market_trades_market_user ON market_trades(market_id, user_id);
CREATE INDEX IF NOT EXISTS idx_market_trades_outcome ON market_trades(outcome);
CREATE INDEX IF NOT EXISTS idx_market_trades_created_at ON market_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_market_trades_trade_type ON market_trades(trade_type);

COMMENT ON TABLE market_trades IS 'Immutable transaction history for prediction market trades';
COMMENT ON COLUMN market_trades.price IS 'Price per share at time of execution (0-1)';
COMMENT ON COLUMN market_trades.gratium_amount IS 'Total Gratium exchanged';
COMMENT ON COLUMN market_trades.probability_before IS 'Market probability before this trade';
COMMENT ON COLUMN market_trades.probability_after IS 'Market probability after this trade (from LMSR)';
