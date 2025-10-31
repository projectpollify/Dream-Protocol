-- Migration 003: Create identity-related tables
-- DIDs, DualityTokens, UTXO Pools, Sessions, and History

-- ============================================
-- DECENTRALIZED IDENTIFIERS
-- ============================================
CREATE TABLE decentralized_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES dual_wallets(id) ON DELETE CASCADE,

  -- The DID itself
  did VARCHAR(255) NOT NULL UNIQUE,

  -- DID Document (W3C standard format)
  did_document JSONB NOT NULL,

  -- Resolution
  resolvable BOOLEAN DEFAULT true,
  resolver_endpoint VARCHAR(500),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0
);

CREATE INDEX idx_dids_user_id ON decentralized_identifiers(user_id);
CREATE INDEX idx_dids_wallet_id ON decentralized_identifiers(wallet_id);
CREATE UNIQUE INDEX idx_dids_did ON decentralized_identifiers(did);
CREATE INDEX idx_dids_resolvable ON decentralized_identifiers(resolvable) WHERE resolvable = true;
CREATE INDEX idx_dids_document_gin ON decentralized_identifiers USING gin(did_document);

COMMENT ON TABLE decentralized_identifiers IS 'W3C-compliant Decentralized Identifiers for both identities';

-- ============================================
-- DUALITY TOKENS (CRITICAL SECURITY)
-- ============================================
CREATE ROLE IF NOT EXISTS identity_system_internal;

CREATE TABLE duality_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- The linkage proof (ENCRYPTED with master key)
  true_self_private_key_encrypted TEXT NOT NULL,
  shadow_private_key_encrypted TEXT NOT NULL,

  -- Encryption metadata
  master_key_id VARCHAR(255) NOT NULL,
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  encryption_version INTEGER DEFAULT 1,

  -- Proof of legitimacy
  creation_proof JSONB NOT NULL,

  -- Backup/Recovery
  backup_seed_encrypted TEXT,
  backup_created_at TIMESTAMPTZ,

  -- Access audit (append-only log)
  access_log JSONB DEFAULT '[]'::jsonb,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'compromised', 'rotated')),
  compromised BOOLEAN DEFAULT false,
  compromised_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revoke public access
REVOKE ALL ON duality_tokens FROM public;
GRANT SELECT ON duality_tokens TO identity_system_internal;

CREATE INDEX idx_duality_tokens_user_id ON duality_tokens(user_id);
CREATE INDEX idx_duality_tokens_status ON duality_tokens(status) WHERE status = 'active';

COMMENT ON TABLE duality_tokens IS 'CRITICAL: Stores encrypted linkage between True Self and Shadow identities';

-- ============================================
-- UTXO POOLS
-- ============================================
CREATE TABLE utxo_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES dual_wallets(id) ON DELETE CASCADE,

  -- Pool identification
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('true_self', 'shadow')),

  -- UTXO data (JSONB for flexibility)
  utxo_data JSONB NOT NULL DEFAULT '{"utxos": [], "totalUnspent": 0}'::jsonb,

  -- Transaction history (append-only)
  transaction_history JSONB DEFAULT '[]'::jsonb,

  -- Statistics
  total_received BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  current_balance BIGINT DEFAULT 0,
  utxo_count INTEGER DEFAULT 0,

  -- Sync status
  synced BOOLEAN DEFAULT true,
  last_synced TIMESTAMPTZ,
  sync_block_height BIGINT,

  -- Hygiene tracking
  utxo_fragmentation_ratio DECIMAL(5,2) DEFAULT 0.0,
  consolidation_recommended BOOLEAN DEFAULT false,
  last_consolidation TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_wallet_mode UNIQUE(user_id, wallet_id, mode)
);

CREATE INDEX idx_utxo_pools_user_id ON utxo_pools(user_id);
CREATE INDEX idx_utxo_pools_wallet_id ON utxo_pools(wallet_id);
CREATE INDEX idx_utxo_pools_mode ON utxo_pools(mode);
CREATE INDEX idx_utxo_pools_synced ON utxo_pools(synced) WHERE synced = false;
CREATE INDEX idx_utxo_pools_consolidation ON utxo_pools(consolidation_recommended) WHERE consolidation_recommended = true;

COMMENT ON TABLE utxo_pools IS 'Tracks UTXO sets for each identity to prevent transaction linking';

-- ============================================
-- IDENTITY SESSIONS
-- ============================================
CREATE TABLE identity_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session identification
  session_token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) UNIQUE,

  -- Active identity for this session
  active_identity_mode VARCHAR(20) NOT NULL CHECK (active_identity_mode IN ('true_self', 'shadow')),

  -- Session metadata
  ip_address_hash VARCHAR(255),
  device_fingerprint VARCHAR(255),
  user_agent VARCHAR(500),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Activity tracking
  total_requests INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'logged_out')),
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(255)
);

CREATE INDEX idx_identity_sessions_user_id ON identity_sessions(user_id);
CREATE UNIQUE INDEX idx_identity_sessions_token ON identity_sessions(session_token) WHERE status = 'active';
CREATE INDEX idx_identity_sessions_expires ON identity_sessions(expires_at);
CREATE INDEX idx_identity_sessions_status ON identity_sessions(status) WHERE status = 'active';
CREATE INDEX idx_identity_sessions_device ON identity_sessions(device_fingerprint);

COMMENT ON TABLE identity_sessions IS 'Tracks active sessions per identity mode';

-- ============================================
-- IDENTITY MODE HISTORY
-- ============================================
CREATE TABLE identity_mode_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Mode switch
  from_mode VARCHAR(20) CHECK (from_mode IN ('true_self', 'shadow')),
  to_mode VARCHAR(20) NOT NULL CHECK (to_mode IN ('true_self', 'shadow')),

  -- Context
  session_id UUID REFERENCES identity_sessions(id) ON DELETE SET NULL,
  ip_address_hash VARCHAR(255),
  device_fingerprint VARCHAR(255),
  reason VARCHAR(255),

  -- Duration in previous mode (seconds)
  duration_in_previous_mode INTEGER,

  -- Timestamp
  switched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_identity_mode_history_user_id ON identity_mode_history(user_id);
CREATE INDEX idx_identity_mode_history_switched_at ON identity_mode_history(switched_at DESC);
CREATE INDEX idx_identity_mode_history_session ON identity_mode_history(session_id);
CREATE INDEX idx_identity_mode_history_from_to ON identity_mode_history(from_mode, to_mode);

COMMENT ON TABLE identity_mode_history IS 'Audit trail of identity mode switches';
