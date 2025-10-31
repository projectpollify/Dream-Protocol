# Module 2: Bridge Legacy
## MVP to Dream Protocol Migration Architecture

**Module ID**: 02-bridge-legacy  
**Classification**: Integration Layer - Critical Infrastructure  
**Status**: Design Phase → Implementation Ready  
**Build Priority**: PRIORITY 1 (Weeks 4-5, right after Module 1)  
**Complexity**: High (Data migration + Dual system orchestration)  
**Team Size Recommended**: 2 developers  
**Estimated Implementation**: 2 weeks  

---

## 🎯 Executive Summary

Module 2: Bridge Legacy is the **critical infrastructure that enables zero-downtime migration** from your existing MVP to Dream Protocol. It allows both systems to operate simultaneously while gradually transitioning users to the new platform.

**What This Module Delivers:**
- Connect to existing MVP database (read-only and write)
- Automated data migration (users, posts, polls, chambers, votes)
- Feature flags for gradual rollout (10% → 25% → 50% → 100%)
- API adapter patterns (translate old calls to new system)
- Dual-database queries (serve from legacy OR new, configurable per user)
- Migration status tracking and validation
- Rollback capabilities if issues arise
- Zero downtime for users during transition

**Why This Matters:**
You have an **active user base** with polls, content, and data. You can't shut it down while you build the new system. Bridge Legacy lets you:
1. Keep the MVP running 100% functional
2. Build new modules alongside it
3. Gradually migrate users to new features
4. Keep rollback options open
5. Test new features with small user segments first

**The Business Value:**
- Zero downtime (users don't even notice the migration)
- Risk mitigation (rollback if needed)
- Data validation before full commitment
- Gradual revenue transition
- Proven success before full cutover

---

## 🏗️ Architecture Overview

### System Diagram: Dual Operation

```
┌────────────────────────────────────────────────────────────────┐
│                        User Request                            │
│                   (API / Web / Mobile)                         │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Bridge Legacy Router      │
                    │                             │
                    │ 1. Check feature flag       │
                    │ 2. Check migration status   │
                    │ 3. Route to system          │
                    └─────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
      LEGACY = false              LEGACY = true
    (use new system)            (use old MVP)
            │                             │
            ▼                             ▼
    ┌─────────────────┐         ┌──────────────────┐
    │ Dream Protocol  │         │  MVP Database    │
    │ (New Tables)    │         │  (Legacy Schema) │
    │                 │         │                  │
    │ ├─ users        │         │ ├─ users_legacy  │
    │ ├─ posts        │         │ ├─ posts_legacy  │
    │ ├─ polls        │         │ ├─ polls_legacy  │
    │ └─ votes        │         │ └─ votes_legacy  │
    └────────┬────────┘         └────────┬─────────┘
             │                           │
             └──────────────┬────────────┘
                            ▼
                  ┌─────────────────────┐
                  │  Response to User   │
                  │  (Unified Format)   │
                  └─────────────────────┘
```

### Data Flow: Migration Pipeline

```
MVP Database                Bridge Module              Dream Protocol
(PostgreSQL)                                          (PostgreSQL)

users_legacy ─────────┐
                      │
                      ├─→ BatchMigrationService ─→ Validate ─→ users
                      │                                        
posts_legacy ─────────┤                              posts
                      │
                      ├─→ FeatureFlagService ───→   ├─ active for 10% users
                      │   (Gate new features)       │- active for 25% users
                      │                              │- etc...
chambers_legacy ──────┤
                      │
votes_legacy ─────────┴─→ AdapterService ────→ Transform ─→ votes
                           (Format conversion)
                           
Status: migration_status_log
        (Track: started_at, completed_at, rows_migrated, errors, user_id)
```

### Three Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Bridge Legacy Module                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Feature Flag Service                              │  │
│  │ ├─ Determine which system user uses                 │  │
│  │ ├─ Gradual rollout (10% → 25% → 50% → 100%)        │  │
│  │ ├─ A/B testing ready                                │  │
│  │ └─ Override for testing/debugging                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. Data Migration Service                            │  │
│  │ ├─ Background job: Copy data MVP → Dream Protocol   │  │
│  │ ├─ Schema mapping / validation                      │  │
│  │ ├─ Conflict resolution                              │  │
│  │ ├─ Auditing & rollback                              │  │
│  │ └─ Progress tracking                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. Adapter Service                                   │  │
│  │ ├─ MVP → Protocol API adapters                      │  │
│  │ ├─ Request transformation                           │  │
│  │ ├─ Response normalization                           │  │
│  │ ├─ Error handling / fallback                        │  │
│  │ └─ Logging & metrics                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Migration Strategy: 4 Phases

### Phase 1: Silent Migration (Week 1)
```
Activity: Background data copy (no user-facing changes)

Timeline:
├─ Mon-Tue: Set up bridge infrastructure
├─ Wed-Thu: Start nightly migrations
├─ Fri: Validate data integrity
└─ Weekend: Monitor logs

Operations:
├─ Copy users_legacy → users (new schema)
├─ Copy posts_legacy → posts (transform data)
├─ Copy polls_legacy → polls (adapt fields)
├─ Copy votes_legacy → votes (dual-identity mapping)
└─ Create migration_status records for each entity

Monitoring:
├─ Row counts (legacy vs new)
├─ Data validation checks
├─ Schema mapping verification
├─ Error logging
└─ Performance metrics (time to migrate X users)

Success Criteria:
├─ 100% of users copied to new schema
├─ All data validates against new schema
├─ 0 data loss
└─ No performance impact on MVP
```

### Phase 2: Feature Flag Rollout (Week 2)
```
Activity: Enable new features for percentage of users

Week 2-3 Rollout Schedule:

Day 1-2: 5% of active users (your team + beta testers)
├─ Enable: New identity system (dual wallets)
├─ Test: Identity creation for 5%
├─ Monitor: No errors, fast performance
└─ Decision: Proceed or rollback

Day 3-4: 10% of users
├─ Expand: Random 10% sample
├─ Watch: Engagement metrics, error rates
├─ Feedback: Collect from user segment
└─ Decision: Scale to 25% or pause

Day 5-6: 25% of users
├─ Expand: New features stable
├─ Test: All modules working
├─ Optimize: Performance tuning
└─ Decision: Proceed to 50%

Day 7: 50% of users
├─ Expand: Major milestone
├─ Monitor: 48-hour watch period
├─ Prepare: Customer support for questions
└─ Decision: Go to 100% or investigate issues

Day 8-9: 75% of users
├─ Expand: Final phase
├─ Support: Heavy monitoring
└─ Prepare: Bridge deprecation

Day 10+: 100% of users
├─ All users on new system
├─ MVP system can be deprecated
├─ Bridge module transitions to read-only
└─ Begin archival of legacy data
```

### Phase 3: Validation & Bug Fixes (Weeks 2-3)
```
At each rollout stage, validate:

Data Validation:
├─ Users can log in with migrated credentials
├─ Posts appear in correct order
├─ Polls have correct vote counts
├─ Comments/threads intact
└─ User settings preserved

Functional Testing:
├─ Create new poll (in new system)
├─ Vote on poll
├─ Comment on post
├─ Create chamber
├─ Invite users
└─ View analytics

Performance Validation:
├─ Page load time < 1 second
├─ API response time < 200ms
├─ Database query time < 100ms
└─ Error rate < 0.1%

User Experience:
├─ Collect feedback via survey
├─ Monitor support tickets
├─ Track engagement metrics
├─ Note any confusion/friction
└─ Iterate on UX
```

### Phase 4: Full Migration & Cleanup (Week 4)
```
Activity: Complete transition, archive legacy system

Cutover:
├─ Day 1: 100% of traffic on new system
├─ Day 2: Archive MVP database (don't delete)
├─ Day 3: Disable legacy API endpoints
├─ Week 2: Deprecate Bridge module
└─ Month 1: Delete archived MVP data (after validation period)

Validation:
├─ Spot check random users on new system
├─ Verify no data loss
├─ Test all critical paths
├─ Monitor error logs
└─ 48-hour observation period

Cleanup:
├─ Remove MVP database connections from code
├─ Archive Bridge Legacy module
├─ Update documentation
├─ Celebrate! 🎉
└─ Post-mortem & lessons learned

Rollback Plan:
├─ If critical issue found
├─ Can restore from MVP backup
├─ Can re-enable Bridge module
├─ Can route traffic back to MVP
└─ Timeline: Can do within 24 hours
```

---

## 📊 Database Schema

### MVP Schema (Read-Only References)

The Bridge module connects to the existing MVP database. Here's what data exists:

```sql
-- MVP Legacy Database (postgresql://legacy-mvp-server/...)

-- Existing MVP tables (what we're migrating FROM)
CREATE TABLE users_legacy (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  light_score INT DEFAULT 0,
  reputation_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts_legacy (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users_legacy(id),
  content TEXT NOT NULL,
  chamber_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE polls_legacy (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users_legacy(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  poll_type VARCHAR(50),  -- 'single_choice', 'multi_choice', etc.
  chamber_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE poll_options_legacy (
  id SERIAL PRIMARY KEY,
  poll_id INT NOT NULL REFERENCES polls_legacy(id),
  option_text VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE votes_legacy (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users_legacy(id),
  poll_id INT NOT NULL REFERENCES polls_legacy(id),
  option_id INT NOT NULL REFERENCES poll_options_legacy(id),
  weight DECIMAL(10,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chambers_legacy (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT NOT NULL REFERENCES users_legacy(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chamber_members_legacy (
  id SERIAL PRIMARY KEY,
  chamber_id INT NOT NULL REFERENCES chambers_legacy(id),
  user_id INT NOT NULL REFERENCES users_legacy(id),
  joined_at TIMESTAMP DEFAULT NOW()
);
```

### Bridge Module Schema (NEW - The Bridge)

```sql
-- Dream Protocol Database (NEW SCHEMA for tracking migration)

-- Table 1: Migration Status Tracking
CREATE TABLE migration_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_system_id INT,  -- e.g., user id in MVP
  new_system_id UUID,    -- e.g., user id in new Dream Protocol
  
  entity_type VARCHAR(50) NOT NULL,  -- 'user', 'post', 'poll', 'vote', etc.
  
  -- Migration metadata
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  migrated_by VARCHAR(100),  -- System or user performing migration
  
  -- Status
  status VARCHAR(50) DEFAULT 'success',  -- 'pending', 'success', 'failed', 'rolled_back'
  error_message TEXT,
  
  -- Data validation
  validation_passed BOOLEAN DEFAULT true,
  validation_errors JSONB,  -- Array of validation issues
  
  -- Versioning
  migration_batch_id UUID,  -- Group related migrations
  schema_version VARCHAR(20),  -- Track schema used
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_status_entity ON migration_status(entity_type);
CREATE INDEX idx_migration_status_status ON migration_status(status);
CREATE INDEX idx_migration_status_legacy_id ON migration_status(legacy_system_id);

-- Table 2: Feature Flags
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Flag identification
  flag_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Global flag status
  enabled BOOLEAN DEFAULT false,
  
  -- Rollout configuration
  rollout_percentage INT DEFAULT 0,  -- 0-100, % of users to enable for
  rollout_strategy VARCHAR(50),  -- 'percentage', 'whitelist', 'time-based'
  
  -- Scheduling
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  
  -- Rollout schedule
  rollout_schedule JSONB,  -- {
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  status VARCHAR(50) DEFAULT 'active'  -- 'active', 'paused', 'completed'
);

CREATE INDEX idx_feature_flags_name ON feature_flags(flag_name);

-- Table 3: Feature Flag Assignments (per user)
CREATE TABLE feature_flag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  
  -- Assignment
  enabled BOOLEAN DEFAULT true,
  override BOOLEAN DEFAULT false,  -- Admin override
  
  -- Tracking
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(user_id, flag_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (flag_id) REFERENCES feature_flags(id)
);

CREATE INDEX idx_feature_flag_assignments_user ON feature_flag_assignments(user_id);
CREATE INDEX idx_feature_flag_assignments_flag ON feature_flag_assignments(flag_id);

-- Table 4: Migration Logs (Detailed audit trail)
CREATE TABLE migration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What was migrated
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,  -- Legacy ID
  new_entity_id UUID,  -- New ID
  
  -- Action
  action VARCHAR(50) NOT NULL,  -- 'migrate', 'validate', 'rollback', 'retry'
  
  -- Result
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  details JSONB,  -- Additional info
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  -- Context
  initiated_by VARCHAR(100),  -- 'system', 'user', 'admin'
  batch_id UUID REFERENCES migration_status(migration_batch_id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_logs_entity ON migration_logs(entity_type);
CREATE INDEX idx_migration_logs_batch ON migration_logs(batch_id);

-- Table 5: Schema Mappings (How legacy fields map to new)
CREATE TABLE legacy_schema_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What we're mapping
  legacy_entity VARCHAR(50) NOT NULL,  -- 'users_legacy'
  legacy_field VARCHAR(100) NOT NULL,  -- 'user_id'
  
  -- Where it maps to
  new_entity VARCHAR(50) NOT NULL,  -- 'users'
  new_field VARCHAR(100) NOT NULL,  -- 'id'
  
  -- Transformation rules
  transformation_rule TEXT,  -- SQL or code to transform value
  
  -- Validation
  data_type_legacy VARCHAR(50),
  data_type_new VARCHAR(50),
  required BOOLEAN DEFAULT false,
  nullable BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(legacy_entity, legacy_field)
);

-- Table 6: Feature Rollout Schedule
CREATE TABLE feature_rollout_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Feature being rolled out
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  
  -- Rollout stage
  stage_number INT NOT NULL,  -- 1, 2, 3, ...
  percentage INT NOT NULL,    -- 5, 10, 25, 50, 100
  
  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled',  -- 'scheduled', 'in_progress', 'completed', 'failed'
  
  -- Monitoring
  user_count INT,  -- How many users affected
  error_count INT DEFAULT 0,
  monitored_metrics JSONB,  -- {engagement, errors, performance}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(flag_id, stage_number)
);

-- Table 7: User Migration Tracking
CREATE TABLE user_migration_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  legacy_user_id INT NOT NULL,  -- From MVP
  new_user_id UUID NOT NULL REFERENCES users(id),
  
  -- Status
  migration_status VARCHAR(50),  -- 'pending', 'in_progress', 'completed'
  
  -- Feature rollout
  on_new_system BOOLEAN DEFAULT false,
  new_system_percentage INT DEFAULT 0,  -- 0-100
  
  -- Dates
  migrated_at TIMESTAMPTZ,
  first_new_system_login TIMESTAMPTZ,
  
  -- Validation
  data_validated BOOLEAN DEFAULT false,
  data_validation_errors JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_migration_legacy ON user_migration_tracking(legacy_user_id);
CREATE INDEX idx_user_migration_new ON user_migration_tracking(new_user_id);
```

---

## 💻 Implementation: Core Services

### Service 1: FeatureFlagService

```typescript
// src/modules/bridge-legacy/feature-flags/feature-flag.service.ts

import { db } from '../../../config/database';

class FeatureFlagService {
  /**
   * Check if a user should use the new system for a feature
   * This is THE central routing decision
   */
  async isFeatureEnabledForUser(
    userId: string,
    featureName: string
  ): Promise<boolean> {
    try {
      // Step 1: Check explicit user assignment (admin override)
      const userAssignment = await db.query(
        `SELECT enabled FROM feature_flag_assignments 
         WHERE user_id = $1 AND flag_id = (
           SELECT id FROM feature_flags WHERE flag_name = $2
         ) AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId, featureName]
      );
      
      if (userAssignment.rows.length > 0) {
        return userAssignment.rows[0].enabled;
      }
      
      // Step 2: Check global flag status
      const flag = await db.query(
        `SELECT 
           enabled, 
           rollout_percentage,
           rollout_strategy
         FROM feature_flags 
         WHERE flag_name = $1 AND status = 'active'`,
        [featureName]
      );
      
      if (!flag.rows[0]) {
        // Feature doesn't exist, default to disabled (use legacy)
        return false;
      }
      
      const { enabled, rollout_percentage, rollout_strategy } = flag.rows[0];
      
      // Step 3: Global flag disabled? Return false
      if (!enabled) {
        return false;
      }
      
      // Step 4: Apply rollout strategy
      if (rollout_strategy === 'percentage') {
        return this.shouldEnableByPercentage(userId, rollout_percentage);
      } else if (rollout_strategy === 'whitelist') {
        return await this.isUserWhitelisted(userId, featureName);
      } else if (rollout_strategy === 'time-based') {
        return this.isTimeBasedEnabledNow(featureName);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking feature flag:', error);
      // On error, use legacy system (safer)
      return false;
    }
  }

  /**
   * Determine if user is in rollout percentage
   * Uses deterministic hashing so same user always gets same result
   */
  private shouldEnableByPercentage(userId: string, percentage: number): boolean {
    if (percentage === 0) return false;
    if (percentage === 100) return true;
    
    // Hash user ID to get consistent result
    const hash = this.hashUserId(userId);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  /**
   * Hash user ID to get stable bucket assignment
   * Same user always hashes to same bucket
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;  // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if user is on whitelist
   * Used for beta testers, internal team
   */
  private async isUserWhitelisted(userId: string, featureName: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM feature_flag_assignments 
       WHERE user_id = $1 
       AND flag_id = (SELECT id FROM feature_flags WHERE flag_name = $2)
       AND enabled = true`,
      [userId, featureName]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if feature is enabled at current time
   * Used for scheduled rollouts
   */
  private async isTimeBasedEnabledNow(featureName: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM feature_rollout_schedule 
       WHERE flag_id = (SELECT id FROM feature_flags WHERE flag_name = $1)
       AND scheduled_for <= NOW()
       AND (completed_at IS NULL OR completed_at >= NOW())`,
      [featureName]
    );
    return result.rows.length > 0;
  }

  /**
   * Update rollout percentage (admin action)
   */
  async updateRolloutPercentage(
    featureName: string,
    newPercentage: number
  ): Promise<void> {
    await db.query(
      `UPDATE feature_flags 
       SET rollout_percentage = $1, updated_at = NOW()
       WHERE flag_name = $2`,
      [newPercentage, featureName]
    );
    
    // Log the change
    await db.query(
      `INSERT INTO migration_logs (entity_type, action, details)
       VALUES ($1, $2, $3)`,
      ['feature_flag', 'rollout_percentage_updated', JSON.stringify({
        featureName,
        newPercentage,
        timestamp: new Date().toISOString()
      })]
    );
  }

  /**
   * Whitelist a user for a feature (override)
   * Used for VIP testing, support testing, etc.
   */
  async whitelistUserForFeature(
    userId: string,
    featureName: string,
    expiresAt?: Date
  ): Promise<void> {
    const flagResult = await db.query(
      `SELECT id FROM feature_flags WHERE flag_name = $1`,
      [featureName]
    );
    
    if (!flagResult.rows[0]) {
      throw new Error(`Feature flag "${featureName}" not found`);
    }
    
    const flagId = flagResult.rows[0].id;
    
    await db.query(
      `INSERT INTO feature_flag_assignments (user_id, flag_id, enabled, override, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, flag_id) DO UPDATE SET enabled = true, override = true, expires_at = $5`,
      [userId, flagId, true, true, expiresAt]
    );
  }

  /**
   * Remove user from whitelist
   */
  async removeUserFromFeature(userId: string, featureName: string): Promise<void> {
    await db.query(
      `DELETE FROM feature_flag_assignments 
       WHERE user_id = $1 AND flag_id = (
         SELECT id FROM feature_flags WHERE flag_name = $2
       )`,
      [userId, featureName]
    );
  }

  /**
   * Get all flags for a user
   */
  async getUserFeatureFlags(userId: string): Promise<Record<string, boolean>> {
    const result = await db.query(
      `SELECT 
         f.flag_name, 
         COALESCE(ffa.enabled, f.enabled) as enabled
       FROM feature_flags f
       LEFT JOIN feature_flag_assignments ffa 
         ON f.id = ffa.flag_id AND ffa.user_id = $1
       WHERE f.status = 'active'`,
      [userId]
    );
    
    const flags: Record<string, boolean> = {};
    for (const row of result.rows) {
      flags[row.flag_name] = await this.isFeatureEnabledForUser(userId, row.flag_name);
    }
    
    return flags;
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(
    flagName: string,
    description: string,
    rolloutStrategy: 'percentage' | 'whitelist' | 'time-based' = 'percentage'
  ): Promise<string> {
    const result = await db.query(
      `INSERT INTO feature_flags (flag_name, description, rollout_strategy, enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [flagName, description, rolloutStrategy, false]  // Start disabled
    );
    
    return result.rows[0].id;
  }

  /**
   * Get rollout status for monitoring dashboard
   */
  async getRolloutStatus(featureName: string): Promise<{
    featureName: string;
    enabled: boolean;
    percentage: number;
    usersAffected: number;
    errors: number;
    lastUpdated: string;
  }> {
    const flagResult = await db.query(
      `SELECT 
         flag_name,
         enabled,
         rollout_percentage
       FROM feature_flags
       WHERE flag_name = $1`,
      [featureName]
    );
    
    if (!flagResult.rows[0]) {
      throw new Error(`Feature flag "${featureName}" not found`);
    }
    
    const flag = flagResult.rows[0];
    
    // Get rollout schedule for this flag
    const scheduleResult = await db.query(
      `SELECT 
         SUM(user_count) as total_users,
         SUM(error_count) as total_errors
       FROM feature_rollout_schedule
       WHERE flag_id = (SELECT id FROM feature_flags WHERE flag_name = $1)`,
      [featureName]
    );
    
    const schedule = scheduleResult.rows[0] || { total_users: 0, total_errors: 0 };
    
    return {
      featureName,
      enabled: flag.enabled,
      percentage: flag.rollout_percentage,
      usersAffected: schedule.total_users,
      errors: schedule.total_errors,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const featureFlagService = new FeatureFlagService();
```

### Service 2: DataMigrationService

```typescript
// src/modules/bridge-legacy/migration/data-migration.service.ts

import { db, legacyDb } from '../../../config/database';
import { v4 as uuidv4 } from 'uuid';

class DataMigrationService {
  /**
   * Main migration entry point
   * Called as background job
   */
  async migrateAllData(): Promise<MigrationResult> {
    const batchId = uuidv4();
    const startTime = Date.now();
    
    const result: MigrationResult = {
      batchId,
      success: true,
      entitiesMigrated: {},
      errors: [],
      startTime,
      endTime: 0,
      totalDuration: 0
    };
    
    try {
      // Migrate in order (dependencies first)
      result.entitiesMigrated['users'] = await this.migrateUsers(batchId);
      result.entitiesMigrated['chambers'] = await this.migrateChambers(batchId);
      result.entitiesMigrated['posts'] = await this.migratePosts(batchId);
      result.entitiesMigrated['polls'] = await this.migratePolls(batchId);
      result.entitiesMigrated['votes'] = await this.migrateVotes(batchId);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      console.error('Migration failed:', error);
    }
    
    result.endTime = Date.now();
    result.totalDuration = result.endTime - startTime;
    
    // Log final result
    await this.logMigrationResult(result);
    
    return result;
  }

  /**
   * Migrate users from MVP to new system
   */
  private async migrateUsers(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    try {
      // Get all users from legacy system
      const legacyUsers = await legacyDb.query(
        `SELECT * FROM users_legacy ORDER BY id`
      );
      
      stats.total = legacyUsers.rows.length;
      
      for (const legacyUser of legacyUsers.rows) {
        try {
          // Create new user with transformed data
          const newUserId = uuidv4();
          
          await db.query(
            `INSERT INTO users 
             (id, email, username, password_hash, display_name, 
              avatar_url, bio, has_dual_identity, current_identity_mode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              newUserId,
              legacyUser.email,
              legacyUser.username,
              legacyUser.password_hash,  // Keep same hash for now
              legacyUser.display_name || legacyUser.username,
              legacyUser.avatar_url,
              legacyUser.bio,
              false,  // Will be set to true when identity created
              'true_self'  // Default mode
            ]
          );
          
          // Track migration
          await db.query(
            `INSERT INTO migration_status 
             (legacy_system_id, new_system_id, entity_type, status, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyUser.id, newUserId, 'user', 'success', batchId]
          );
          
          // Track in user migration table
          await db.query(
            `INSERT INTO user_migration_tracking 
             (legacy_user_id, new_user_id, migration_status)
             VALUES ($1, $2, $3)`,
            [legacyUser.id, newUserId, 'completed']
          );
          
          stats.success++;
          
        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`User ${legacyUser.id}: ${error.message}`);
          
          await db.query(
            `INSERT INTO migration_status 
             (legacy_system_id, entity_type, status, error_message, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyUser.id, 'user', 'failed', error.message, batchId]
          );
        }
      }
      
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`User migration batch failed: ${error.message}`);
    }
    
    return stats;
  }

  /**
   * Migrate chambers
   */
  private async migrateChambers(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    try {
      const legacyChambers = await legacyDb.query(
        `SELECT * FROM chambers_legacy`
      );
      
      stats.total = legacyChambers.rows.length;
      
      for (const legacyChamber of legacyChambers.rows) {
        try {
          // Get the migrated user ID for creator
          const creatorMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking 
             WHERE legacy_user_id = $1`,
            [legacyChamber.created_by]
          );
          
          if (!creatorMapping.rows[0]) {
            throw new Error(`Creator user ${legacyChamber.created_by} not migrated`);
          }
          
          const newChamberId = uuidv4();
          const creatorId = creatorMapping.rows[0].new_user_id;
          
          await db.query(
            `INSERT INTO chambers 
             (id, name, description, created_by)
             VALUES ($1, $2, $3, $4)`,
            [newChamberId, legacyChamber.name, legacyChamber.description, creatorId]
          );
          
          // Migrate chamber members
          const members = await legacyDb.query(
            `SELECT user_id FROM chamber_members_legacy WHERE chamber_id = $1`,
            [legacyChamber.id]
          );
          
          for (const member of members.rows) {
            const memberMapping = await db.query(
              `SELECT new_user_id FROM user_migration_tracking 
               WHERE legacy_user_id = $1`,
              [member.user_id]
            );
            
            if (memberMapping.rows[0]) {
              await db.query(
                `INSERT INTO chamber_members (chamber_id, user_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [newChamberId, memberMapping.rows[0].new_user_id]
              );
            }
          }
          
          await db.query(
            `INSERT INTO migration_status 
             (legacy_system_id, new_system_id, entity_type, status, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyChamber.id, newChamberId, 'chamber', 'success', batchId]
          );
          
          stats.success++;
          
        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`Chamber ${legacyChamber.id}: ${error.message}`);
        }
      }
      
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Chamber migration batch failed: ${error.message}`);
    }
    
    return stats;
  }

  /**
   * Migrate posts
   */
  private async migratePosts(batchId: string): Promise<MigrationStats> {
    // Similar pattern to migrateUsers
    // Transform content, maintain user relationship, etc.
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    try {
      const legacyPosts = await legacyDb.query(
        `SELECT * FROM posts_legacy ORDER BY id`
      );
      
      stats.total = legacyPosts.rows.length;
      
      for (const legacyPost of legacyPosts.rows) {
        try {
          // Get migrated user
          const userMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking WHERE legacy_user_id = $1`,
            [legacyPost.user_id]
          );
          
          if (!userMapping.rows[0]) {
            throw new Error(`User ${legacyPost.user_id} not migrated`);
          }
          
          const newPostId = uuidv4();
          await db.query(
            `INSERT INTO posts 
             (id, user_id, content, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              newPostId,
              userMapping.rows[0].new_user_id,
              legacyPost.content,
              legacyPost.created_at,
              legacyPost.updated_at
            ]
          );
          
          stats.success++;
          
        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`Post ${legacyPost.id}: ${error.message}`);
        }
      }
      
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Post migration failed: ${error.message}`);
    }
    
    return stats;
  }

  /**
   * Migrate polls and options
   */
  private async migratePolls(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Similar transformation pattern...
    return stats;
  }

  /**
   * Migrate votes
   * NOTE: This is complex because votes now need dual-identity mapping
   */
  private async migrateVotes(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    
    try {
      const legacyVotes = await legacyDb.query(
        `SELECT * FROM votes_legacy ORDER BY id`
      );
      
      stats.total = legacyVotes.rows.length;
      
      for (const legacyVote of legacyVotes.rows) {
        try {
          // Get user mapping
          const userMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking WHERE legacy_user_id = $1`,
            [legacyVote.user_id]
          );
          
          if (!userMapping.rows[0]) continue;
          
          // All migrated votes start as true_self (we don't know which were shadow)
          const newVoteId = uuidv4();
          await db.query(
            `INSERT INTO votes 
             (id, user_id, poll_id, option_id, identity_mode, weight)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              newVoteId,
              userMapping.rows[0].new_user_id,
              null,  // Will be filled once polls migrated
              null,  // Will be filled once options migrated
              'true_self',  // Default: assume true self
              legacyVote.weight || 1.0
            ]
          );
          
          stats.success++;
          
        } catch (error: any) {
          stats.failed++;
          stats.errors.push(`Vote ${legacyVote.id}: ${error.message}`);
        }
      }
      
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Vote migration failed: ${error.message}`);
    }
    
    return stats;
  }

  /**
   * Validate migrated data
   */
  async validateMigration(batchId: string): Promise<ValidationResult> {
    const validation: ValidationResult = {
      passed: true,
      checks: {}
    };
    
    // Check user counts match
    const legacyUserCount = await legacyDb.query(
      `SELECT COUNT(*) FROM users_legacy`
    );
    const newUserCount = await db.query(
      `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day'`
    );
    
    validation.checks['user_count_match'] = 
      legacyUserCount.rows[0].count === newUserCount.rows[0].count;
    
    if (!validation.checks['user_count_match']) {
      validation.passed = false;
    }
    
    // Check no data loss
    const migrationStats = await db.query(
      `SELECT entity_type, COUNT(*) as count FROM migration_status 
       WHERE migration_batch_id = $1 AND status = 'success'
       GROUP BY entity_type`,
      [batchId]
    );
    
    validation.checks['no_failed_migrations'] = true;
    for (const stat of migrationStats.rows) {
      if (stat.count === 0) {
        validation.checks['no_failed_migrations'] = false;
        validation.passed = false;
      }
    }
    
    return validation;
  }

  /**
   * Rollback migration if needed
   */
  async rollbackMigration(batchId: string): Promise<void> {
    console.warn('ROLLBACK INITIATED for batch:', batchId);
    
    // Delete all data from this batch
    const migrations = await db.query(
      `SELECT new_system_id, entity_type FROM migration_status 
       WHERE migration_batch_id = $1 AND status = 'success'`,
      [batchId]
    );
    
    // Delete in reverse order of creation
    for (const row of migrations.rows) {
      if (row.entity_type === 'user') {
        await db.query(`DELETE FROM users WHERE id = $1`, [row.new_system_id]);
      }
      // ... etc for other entities
    }
    
    // Mark as rolled back
    await db.query(
      `UPDATE migration_status SET status = 'rolled_back' WHERE migration_batch_id = $1`,
      [batchId]
    );
  }

  private async logMigrationResult(result: MigrationResult): Promise<void> {
    await db.query(
      `INSERT INTO migration_logs 
       (entity_type, action, success, details)
       VALUES ($1, $2, $3, $4)`,
      ['migration_batch', 'batch_complete', result.success, JSON.stringify(result)]
    );
  }
}

export const dataMigrationService = new DataMigrationService();

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

interface MigrationResult {
  batchId: string;
  success: boolean;
  entitiesMigrated: Record<string, MigrationStats>;
  errors: string[];
  startTime: number;
  endTime: number;
  totalDuration: number;
}

interface ValidationResult {
  passed: boolean;
  checks: Record<string, boolean>;
}
```

### Service 3: AdapterService

```typescript
// src/modules/bridge-legacy/adapters/adapter.service.ts

import { featureFlagService } from '../feature-flags/feature-flag.service';

class AdapterService {
  /**
   * Route request based on feature flags
   * THE central routing logic
   */
  async routeRequest(
    userId: string,
    endpoint: string,
    method: string,
    data?: any
  ): Promise<any> {
    // Determine which system to use
    const useNewSystem = await featureFlagService.isFeatureEnabledForUser(
      userId,
      'new_system'
    );
    
    if (useNewSystem) {
      // Use new Dream Protocol system
      return await this.callNewSystem(endpoint, method, data);
    } else {
      // Use legacy MVP system
      return await this.callLegacySystem(endpoint, method, data);
    }
  }

  /**
   * Call new Dream Protocol system
   */
  private async callNewSystem(endpoint: string, method: string, data?: any): Promise<any> {
    // Example: POST /api/polls → POST /api/v1/governance/polls
    const mappedEndpoint = this.mapEndpoint(endpoint, 'new');
    
    const response = await fetch(`http://localhost:3001${mappedEndpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    
    return response.json();
  }

  /**
   * Call legacy MVP system
   */
  private async callLegacySystem(endpoint: string, method: string, data?: any): Promise<any> {
    // Legacy MVP still running on same server but different port
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    
    return response.json();
  }

  /**
   * Map endpoints from old API to new API
   * Example: /api/polls → /api/v1/governance/polls
   */
  private mapEndpoint(endpoint: string, system: 'old' | 'new'): string {
    const mappings: Record<string, string> = {
      '/polls': system === 'new' ? '/api/v1/governance/polls' : '/polls',
      '/chambers': system === 'new' ? '/api/v1/governance/chambers' : '/chambers',
      '/users/profile': system === 'new' ? '/api/v1/user/profile' : '/users/profile',
      '/posts': system === 'new' ? '/api/v1/content/posts' : '/posts'
    };
    
    return mappings[endpoint] || endpoint;
  }

  /**
   * Transform response from legacy system to new format
   * Handles differences in response structure
   */
  async transformLegacyResponse(
    endpoint: string,
    legacyResponse: any
  ): Promise<any> {
    // Example: Transform legacy poll response to new format
    if (endpoint.includes('polls')) {
      return {
        ...legacyResponse,
        // Add any new fields that new system expects
        dualityToken: null,
        shadowConsensusWeight: 0
      };
    }
    
    return legacyResponse;
  }

  /**
   * Transform request from new system to legacy format
   * Handles backward compatibility
   */
  transformRequestForLegacy(endpoint: string, newRequest: any): any {
    // Example: Strip out fields legacy doesn't understand
    if (endpoint.includes('polls')) {
      const { dualityToken, shadowConsensusWeight, ...legacyRequest } = newRequest;
      return legacyRequest;
    }
    
    return newRequest;
  }
}

export const adapterService = new AdapterService();
```

---

## 🔌 API Endpoints

### Bridge Routes

```typescript
// src/modules/bridge-legacy/bridge.routes.ts

import express from 'express';
import { featureFlagService } from './feature-flags/feature-flag.service';
import { dataMigrationService } from './migration/data-migration.service';
import { authenticateAdmin } from '../../middleware';

const router = express.Router();

/**
 * GET /api/v1/bridge/feature-flags
 * Get all feature flags for current user
 */
router.get('/feature-flags', async (req, res) => {
  try {
    const { userId } = req.user;
    const flags = await featureFlagService.getUserFeatureFlags(userId);
    
    return res.status(200).json({
      success: true,
      data: flags
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/bridge/feature-flags/:flagName
 * Check if specific flag is enabled
 */
router.get('/feature-flags/:flagName', async (req, res) => {
  try {
    const { userId } = req.user;
    const { flagName } = req.params;
    
    const enabled = await featureFlagService.isFeatureEnabledForUser(userId, flagName);
    
    return res.status(200).json({
      success: true,
      data: { flag: flagName, enabled }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: POST /api/v1/bridge/migration/start
 * Start data migration from MVP
 */
router.post('/migration/start', authenticateAdmin, async (req, res) => {
  try {
    const result = await dataMigrationService.migrateAllData();
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: POST /api/v1/bridge/migration/validate
 * Validate migration completed successfully
 */
router.post('/migration/validate', authenticateAdmin, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    const validation = await dataMigrationService.validateMigration(batchId);
    
    return res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: POST /api/v1/bridge/migration/rollback
 * Rollback migration (emergency only)
 */
router.post('/migration/rollback', authenticateAdmin, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId required'
      });
    }
    
    await dataMigrationService.rollbackMigration(batchId);
    
    return res.status(200).json({
      success: true,
      message: 'Migration rolled back successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: POST /api/v1/bridge/feature-flags
 * Create new feature flag
 */
router.post('/feature-flags', authenticateAdmin, async (req, res) => {
  try {
    const { flagName, description, strategy } = req.body;
    
    const flagId = await featureFlagService.createFeatureFlag(
      flagName,
      description,
      strategy || 'percentage'
    );
    
    return res.status(201).json({
      success: true,
      data: { flagId }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: PATCH /api/v1/bridge/feature-flags/:flagName/percentage
 * Update rollout percentage
 */
router.patch('/feature-flags/:flagName/percentage', authenticateAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { percentage } = req.body;
    
    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Percentage must be between 0-100'
      });
    }
    
    await featureFlagService.updateRolloutPercentage(flagName, percentage);
    
    return res.status(200).json({
      success: true,
      message: `${flagName} rollout set to ${percentage}%`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: POST /api/v1/bridge/feature-flags/:flagName/whitelist
 * Whitelist user for feature
 */
router.post('/feature-flags/:flagName/whitelist', authenticateAdmin, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { userId, expiresAt } = req.body;
    
    await featureFlagService.whitelistUserForFeature(userId, flagName, expiresAt);
    
    return res.status(200).json({
      success: true,
      message: `User ${userId} whitelisted for ${flagName}`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: GET /api/v1/bridge/rollout-status
 * Get status of all rollouts
 */
router.get('/rollout-status', authenticateAdmin, async (req, res) => {
  try {
    // Get status for all features
    const features = ['new_system', 'dual_identity', 'new_governance'];
    const statuses = [];
    
    for (const feature of features) {
      try {
        const status = await featureFlagService.getRolloutStatus(feature);
        statuses.push(status);
      } catch (e) {
        // Feature might not exist yet
      }
    }
    
    return res.status(200).json({
      success: true,
      data: statuses
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## 🧪 Testing Strategy

### Integration Tests

```typescript
// src/modules/bridge-legacy/bridge.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlagService } from './feature-flags/feature-flag.service';
import { dataMigrationService } from './migration/data-migration.service';

describe('Bridge Legacy Integration', () => {
  describe('Feature Flags', () => {
    it('should route user to legacy system by default', async () => {
      const userId = 'test_user_1';
      const enabled = await featureFlagService.isFeatureEnabledForUser(userId, 'new_system');
      expect(enabled).toBe(false);  // New system disabled by default
    });

    it('should route admin user to new system', async () => {
      // Admin user ID
      const userId = 'admin_user_1';
      
      // Whitelist for feature
      await featureFlagService.whitelistUserForFeature(userId, 'new_system');
      
      const enabled = await featureFlagService.isFeatureEnabledForUser(userId, 'new_system');
      expect(enabled).toBe(true);
    });

    it('should respect percentage-based rollout', async () => {
      // Create flag with 50% rollout
      const flagId = await featureFlagService.createFeatureFlag(
        'test_flag',
        'Test feature',
        'percentage'
      );
      
      await featureFlagService.updateRolloutPercentage('test_flag', 50);
      
      // Check multiple users hash to different buckets
      const results = [];
      for (let i = 0; i < 100; i++) {
        const enabled = await featureFlagService.isFeatureEnabledForUser(
          `user_${i}`,
          'test_flag'
        );
        results.push(enabled ? 1 : 0);
      }
      
      const sum = results.reduce((a, b) => a + b, 0);
      // Should be approximately 50%
      expect(sum).toBeGreaterThan(40);
      expect(sum).toBeLessThan(60);
    });
  });

  describe('Data Migration', () => {
    it('should migrate users from MVP to new system', async () => {
      const result = await dataMigrationService.migrateAllData();
      
      expect(result.success).toBe(true);
      expect(result.entitiesMigrated['users'].success).toBeGreaterThan(0);
    });

    it('should validate migrated data', async () => {
      const result = await dataMigrationService.migrateAllData();
      const validation = await dataMigrationService.validateMigration(result.batchId);
      
      expect(validation.passed).toBe(true);
      expect(validation.checks['user_count_match']).toBe(true);
    });

    it('should allow rollback if needed', async () => {
      const result = await dataMigrationService.migrateAllData();
      
      // Verify data exists
      const validation = await dataMigrationService.validateMigration(result.batchId);
      expect(validation.passed).toBe(true);
      
      // Rollback
      await dataMigrationService.rollbackMigration(result.batchId);
      
      // Verify rolled back
      const afterRollback = await dataMigrationService.validateMigration(result.batchId);
      expect(afterRollback.passed).toBe(false);
    });
  });
});
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Design database schema for bridge module
- [ ] Run migrations for feature_flags, migration_status tables
- [ ] Set up connection to MVP database (read-only)
- [ ] Create FeatureFlagService skeleton
- [ ] Implement feature flag checking logic
- [ ] Test deterministic percentage hashing
- [ ] Unit tests passing

### Phase 2: Migration Service (Week 2)
- [ ] Implement DataMigrationService
- [ ] Create user migration logic
- [ ] Create chamber migration logic
- [ ] Create post migration logic
- [ ] Create poll migration logic
- [ ] Create vote migration logic
- [ ] Add validation logic
- [ ] Add rollback logic
- [ ] Integration tests passing

### Phase 3: API & Router (Week 2)
- [ ] Create bridge API routes
- [ ] Implement migration start endpoint
- [ ] Implement validation endpoint
- [ ] Implement feature flag endpoints
- [ ] Add admin authentication
- [ ] Test all endpoints
- [ ] Documentation

### Phase 4: Silent Migration (Week 1 Post-Implementation)
- [ ] Back up MVP database
- [ ] Run silent migration in staging
- [ ] Validate all data
- [ ] Monitor for errors
- [ ] Fix any mapping issues
- [ ] Performance test
- [ ] Ready for production migration

### Phase 5: Gradual Rollout (Weeks 2-4 Post-Implementation)
- [ ] Create feature flags for each new feature
- [ ] Day 1-2: 5% rollout to internal team
- [ ] Monitor metrics and errors
- [ ] Day 3-4: 10% rollout
- [ ] Collect user feedback
- [ ] Day 5-6: 25% rollout
- [ ] Day 7: 50% rollout
- [ ] Day 8-9: 75% rollout
- [ ] Day 10+: 100% rollout

---

## 🎯 Success Criteria

You know Module 2 is complete when:

1. ✅ MVP database can be read from new system
2. ✅ All MVP data successfully migrated to new schema
3. ✅ Feature flags work for percentage-based rollout (5%, 10%, 25%, 50%, 100%)
4. ✅ Zero data loss during migration
5. ✅ Rollback tested and working
6. ✅ Silent migration ran without user-facing issues
7. ✅ Admin can control rollout via API
8. ✅ Can whitelist users for beta testing
9. ✅ Detailed logs of all migrations
10. ✅ Users seamlessly transition with zero downtime
11. ✅ Old MVP still fully functional during transition
12. ✅ All tests passing (unit + integration)

---

## 📚 Dependencies & References

### External Libraries
```json
{
  "pg": "^8.10.0",       // PostgreSQL client (already have)
  "uuid": "^9.0.0",      // UUID generation
  "node-cache": "^5.1.2" // In-memory caching for feature flags
}
```

### Configuration

```typescript
// config/database.ts
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  // New Dream Protocol database
});

export const legacyDb = new Pool({
  connectionString: process.env.LEGACY_MVP_DATABASE_URL,
  // MVP Legacy database (read-only)
});

// Make sure to use different credentials for legacy DB
// Legacy connection should ideally be READ-ONLY user
```

---

## 🚀 Next Steps After Module 2

Once Bridge Legacy is complete:
1. **Silent migration runs** - All MVP data copied to new system
2. **Module 3: User** - User profile management (depends on migrated users)
3. **Module 4: Economy** - Token systems (depends on users)
4. **Module 5: Token Exchange** - Buy/sell tokens
5. **Module 6: Governance** - Polls with Shadow Consensus

---

## 📝 Critical Notes for Development

### Database Access Security

```typescript
// MVP database should be accessed as READ-ONLY user
const legacyDbUser = process.env.LEGACY_DB_READONLY_USER;
const legacyDbPassword = process.env.LEGACY_DB_READONLY_PASSWORD;

// This prevents accidental writes to old system
// Only Dream Protocol database gets writes
```

### Monitoring During Migration

```typescript
// Set up alerts for:
// 1. Migration job hanging (> 1 hour)
// 2. Error rate > 1%
// 3. Data validation failures
// 4. Disk space running low
// 5. Database connection failures
```

### Rollout Monitoring

```typescript
// During each rollout stage, monitor:
// - Error rate (should stay < 0.1%)
// - API latency (should be < 200ms)
// - User engagement (should stay same or increase)
// - Support tickets (spike = problem)
// - CPU/memory usage (should be stable)
```

---

**Ready to begin?**

This Module 2 plan provides everything needed to safely migrate from MVP to Dream Protocol without downtime. The key is the feature flags—they give you complete control over the transition.

Next steps:
1. Set up bridge database schema
2. Connect to MVP database
3. Implement FeatureFlagService
4. Test with internal team first
5. Then run silent migration
6. Then gradual rollout

Questions or need clarification on any part?

