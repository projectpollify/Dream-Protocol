-- Migration 001: Create users table with dual identity support
-- This is the foundation table that all other identity tables reference

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- Dual identity tracking
  has_dual_identity BOOLEAN DEFAULT false,
  identity_created_at TIMESTAMPTZ,
  current_identity_mode VARCHAR(20) CHECK (current_identity_mode IN ('true_self', 'shadow')),
  last_identity_switch TIMESTAMPTZ,

  -- Account status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  email_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_has_dual_identity ON users(has_dual_identity) WHERE has_dual_identity = true;
CREATE INDEX idx_users_current_mode ON users(current_identity_mode);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';

-- Comments
COMMENT ON TABLE users IS 'Core user accounts with dual identity support';
COMMENT ON COLUMN users.has_dual_identity IS 'Indicates if user has completed dual identity setup';
COMMENT ON COLUMN users.current_identity_mode IS 'Active identity mode: true_self or shadow';
