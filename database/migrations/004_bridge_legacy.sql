-- =====================================================
-- Module 2: Bridge Legacy - Database Schema
-- Migration for zero-downtime MVP to Dream Protocol
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== Table 1: Migration Status Tracking ==========
-- Tracks the migration status of each entity from legacy to new system

CREATE TABLE IF NOT EXISTS migration_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Entity identification
  legacy_system_id INT,           -- ID in MVP legacy system
  new_system_id UUID,             -- ID in new Dream Protocol system
  entity_type VARCHAR(50) NOT NULL, -- 'user', 'post', 'poll', 'vote', etc.

  -- Migration metadata
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  migrated_by VARCHAR(100),       -- System or user performing migration

  -- Status tracking
  status VARCHAR(50) DEFAULT 'success', -- 'pending', 'success', 'failed', 'rolled_back'
  error_message TEXT,

  -- Data validation
  validation_passed BOOLEAN DEFAULT true,
  validation_errors JSONB,        -- Array of validation issues

  -- Versioning
  migration_batch_id UUID,        -- Group related migrations
  schema_version VARCHAR(20),     -- Track schema used for migration

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_status_entity ON migration_status(entity_type);
CREATE INDEX idx_migration_status_status ON migration_status(status);
CREATE INDEX idx_migration_status_legacy_id ON migration_status(legacy_system_id);
CREATE INDEX idx_migration_status_new_id ON migration_status(new_system_id);
CREATE INDEX idx_migration_status_batch ON migration_status(migration_batch_id);

-- ========== Table 2: Feature Flags ==========
-- Controls gradual rollout of new features

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Flag identification
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Global flag status
  enabled BOOLEAN DEFAULT false,

  -- Rollout configuration
  rollout_percentage INT DEFAULT 0,  -- 0-100, % of users to enable for
  rollout_strategy VARCHAR(50),      -- 'percentage', 'whitelist', 'time-based'

  -- Scheduling
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,

  -- Rollout schedule (JSON)
  rollout_schedule JSONB,
  -- Example: {
  --   "start_date": "2025-01-30",
  --   "stages": [
  --     {"percentage": 5, "date": "2025-01-30"},
  --     {"percentage": 10, "date": "2025-02-01"},
  --     {"percentage": 25, "date": "2025-02-03"},
  --     {"percentage": 50, "date": "2025-02-05"},
  --     {"percentage": 100, "date": "2025-02-07"}
  --   ]
  -- }

  -- Metadata
  created_by UUID,                   -- Will reference users(id) later
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  status VARCHAR(50) DEFAULT 'active' -- 'active', 'paused', 'completed'
);

CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- ========== Table 3: Feature Flag Assignments (Per User) ==========
-- Tracks which users have which features enabled

CREATE TABLE IF NOT EXISTS feature_flag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,             -- Will reference users(id) later
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,

  -- Assignment status
  enabled BOOLEAN DEFAULT true,
  override BOOLEAN DEFAULT false,    -- Admin override

  -- Timing
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(user_id, flag_id)
);

CREATE INDEX idx_feature_flag_assignments_user ON feature_flag_assignments(user_id);
CREATE INDEX idx_feature_flag_assignments_flag ON feature_flag_assignments(flag_id);

-- ========== Table 4: Migration Logs (Detailed Audit Trail) ==========
-- Detailed logs of all migration operations

CREATE TABLE IF NOT EXISTS migration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was migrated
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,                     -- Legacy ID
  new_entity_id UUID,                -- New ID

  -- Action performed
  action VARCHAR(50) NOT NULL,       -- 'migrate', 'validate', 'rollback', 'retry'

  -- Result
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  details JSONB,                     -- Additional info

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  -- Context
  initiated_by VARCHAR(100),         -- 'system', 'user', 'admin'
  batch_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_logs_entity ON migration_logs(entity_type);
CREATE INDEX idx_migration_logs_batch ON migration_logs(batch_id);
CREATE INDEX idx_migration_logs_action ON migration_logs(action);
CREATE INDEX idx_migration_logs_success ON migration_logs(success);

-- ========== Table 5: Schema Mappings ==========
-- How legacy fields map to new schema

CREATE TABLE IF NOT EXISTS legacy_schema_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source (legacy)
  legacy_entity VARCHAR(50) NOT NULL,  -- 'users_legacy'
  legacy_field VARCHAR(100) NOT NULL,  -- 'user_id'

  -- Destination (new)
  new_entity VARCHAR(50) NOT NULL,     -- 'users'
  new_field VARCHAR(100) NOT NULL,     -- 'id'

  -- Transformation
  transformation_rule TEXT,             -- SQL or code to transform value

  -- Validation
  data_type_legacy VARCHAR(50),
  data_type_new VARCHAR(50),
  required BOOLEAN DEFAULT false,
  nullable BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(legacy_entity, legacy_field)
);

CREATE INDEX idx_schema_mappings_legacy ON legacy_schema_mappings(legacy_entity);
CREATE INDEX idx_schema_mappings_new ON legacy_schema_mappings(new_entity);

-- ========== Table 6: Feature Rollout Schedule ==========
-- Detailed schedule for feature rollouts

CREATE TABLE IF NOT EXISTS feature_rollout_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Feature being rolled out
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,

  -- Rollout stage
  stage_number INT NOT NULL,         -- 1, 2, 3, ...
  percentage INT NOT NULL,           -- 5, 10, 25, 50, 100

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'failed'

  -- Monitoring
  user_count INT,                    -- How many users affected
  error_count INT DEFAULT 0,
  monitored_metrics JSONB,           -- {engagement, errors, performance}

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(flag_id, stage_number)
);

CREATE INDEX idx_rollout_schedule_flag ON feature_rollout_schedule(flag_id);
CREATE INDEX idx_rollout_schedule_status ON feature_rollout_schedule(status);

-- ========== Table 7: User Migration Tracking ==========
-- Track individual user migration status

CREATE TABLE IF NOT EXISTS user_migration_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  legacy_user_id INT NOT NULL,       -- From MVP
  new_user_id UUID NOT NULL,         -- Will reference users(id) later

  -- Status
  migration_status VARCHAR(50),      -- 'pending', 'in_progress', 'completed'

  -- Feature rollout
  on_new_system BOOLEAN DEFAULT false,
  new_system_percentage INT DEFAULT 0, -- 0-100

  -- Dates
  migrated_at TIMESTAMPTZ,
  first_new_system_login TIMESTAMPTZ,

  -- Validation
  data_validated BOOLEAN DEFAULT false,
  data_validation_errors JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(legacy_user_id)
);

CREATE INDEX idx_user_migration_legacy ON user_migration_tracking(legacy_user_id);
CREATE INDEX idx_user_migration_new ON user_migration_tracking(new_user_id);
CREATE INDEX idx_user_migration_status ON user_migration_tracking(migration_status);

-- ========== Insert Default Feature Flags ==========
-- Create initial feature flags for gradual rollout

INSERT INTO feature_flags (flag_name, description, rollout_strategy, enabled, rollout_percentage)
VALUES
  ('new_system', 'Enable new Dream Protocol system (master flag)', 'percentage', false, 0),
  ('dual_identity', 'Enable dual-identity (True Self + Shadow)', 'percentage', false, 0),
  ('new_governance', 'Enable new governance module with Shadow Consensus', 'percentage', false, 0)
ON CONFLICT (flag_name) DO NOTHING;

-- ========== Insert Default Schema Mappings ==========
-- Define how legacy fields map to new schema

INSERT INTO legacy_schema_mappings (legacy_entity, legacy_field, new_entity, new_field, data_type_legacy, data_type_new, required)
VALUES
  ('users_legacy', 'id', 'users', 'id', 'INT', 'UUID', true),
  ('users_legacy', 'email', 'users', 'email', 'VARCHAR', 'VARCHAR', true),
  ('users_legacy', 'username', 'users', 'username', 'VARCHAR', 'VARCHAR', true),
  ('users_legacy', 'password_hash', 'users', 'password_hash', 'VARCHAR', 'VARCHAR', true),
  ('users_legacy', 'display_name', 'users', 'display_name', 'VARCHAR', 'VARCHAR', false),
  ('users_legacy', 'avatar_url', 'users', 'avatar_url', 'TEXT', 'TEXT', false),
  ('users_legacy', 'bio', 'users', 'bio', 'TEXT', 'TEXT', false)
ON CONFLICT (legacy_entity, legacy_field) DO NOTHING;

-- ========== Comments for Documentation ==========

COMMENT ON TABLE migration_status IS 'Tracks migration status of each entity from legacy MVP to Dream Protocol';
COMMENT ON TABLE feature_flags IS 'Controls gradual rollout of new features to users';
COMMENT ON TABLE feature_flag_assignments IS 'Per-user feature flag assignments and overrides';
COMMENT ON TABLE migration_logs IS 'Detailed audit trail of all migration operations';
COMMENT ON TABLE legacy_schema_mappings IS 'Maps legacy schema fields to new Dream Protocol schema';
COMMENT ON TABLE feature_rollout_schedule IS 'Scheduled stages for feature rollouts';
COMMENT ON TABLE user_migration_tracking IS 'Tracks individual user migration progress and status';

-- ========== Grant Permissions ==========
-- Note: Adjust these based on your user roles

-- Grant permissions to application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dreamprotocol_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dreamprotocol_app;
