/**
 * Authentication Module - Database Schema
 * Creates users table for authentication
 */

-- Users Table (Core Authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  shadow_hash VARCHAR(255) NOT NULL,
  current_mode VARCHAR(20) DEFAULT 'true_self' CHECK (current_mode IN ('true_self', 'shadow')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Mode History (Track identity switches)
CREATE TABLE IF NOT EXISTS user_mode_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_mode VARCHAR(20),
  to_mode VARCHAR(20) NOT NULL,
  switched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_shadow_hash ON users(shadow_hash);
CREATE INDEX IF NOT EXISTS idx_mode_history_user_id ON user_mode_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_history_switched_at ON user_mode_history(switched_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
