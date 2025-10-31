-- Migration 002: Create dual_wallets table
-- Stores the dual Cardano wallets for True Self and Shadow identities

CREATE TABLE dual_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity mode
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('true_self', 'shadow')),

  -- Cardano wallet info
  cardano_address VARCHAR(255) NOT NULL UNIQUE,
  public_key VARCHAR(255) NOT NULL UNIQUE,

  -- Key material (encrypted at rest)
  encrypted_private_key TEXT NOT NULL,
  encryption_salt VARCHAR(255) NOT NULL,
  encryption_iv VARCHAR(255) NOT NULL,

  -- DID
  did VARCHAR(255) NOT NULL UNIQUE,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  verified BOOLEAN DEFAULT false,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  accessed_count INTEGER DEFAULT 0,

  CONSTRAINT unique_user_mode UNIQUE(user_id, mode)
);

-- Indexes
CREATE INDEX idx_dual_wallets_user_id ON dual_wallets(user_id);
CREATE INDEX idx_dual_wallets_did ON dual_wallets(did);
CREATE INDEX idx_dual_wallets_cardano_address ON dual_wallets(cardano_address);
CREATE INDEX idx_dual_wallets_mode ON dual_wallets(mode);
CREATE INDEX idx_dual_wallets_status ON dual_wallets(status) WHERE status = 'active';
CREATE INDEX idx_dual_wallets_user_mode_status ON dual_wallets(user_id, mode, status) WHERE status = 'active';

-- Comments
COMMENT ON TABLE dual_wallets IS 'Stores dual Cardano wallets for True Self and Shadow identities';
COMMENT ON COLUMN dual_wallets.encrypted_private_key IS 'Private key encrypted with user password-derived key using AES-256-GCM';
COMMENT ON COLUMN dual_wallets.did IS 'Decentralized Identifier in format: did:agoranet:{userId}_{mode}';
