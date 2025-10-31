/**
 * Bridge Legacy Module Types
 * Types for migration, feature flags, and adapter services
 */

// ========== Migration Types ==========

export interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface MigrationResult {
  batchId: string;
  success: boolean;
  entitiesMigrated: Record<string, MigrationStats>;
  errors: string[];
  startTime: number;
  endTime: number;
  totalDuration: number;
}

export interface ValidationResult {
  passed: boolean;
  checks: Record<string, boolean>;
  errors?: string[];
}

export type EntityType = 'user' | 'chamber' | 'post' | 'poll' | 'vote' | 'poll_option' | 'chamber_member';
export type MigrationStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';

export interface MigrationStatusRecord {
  id: string;
  legacy_system_id: number;
  new_system_id: string;
  entity_type: EntityType;
  migrated_at: Date;
  migrated_by: string;
  status: MigrationStatus;
  error_message?: string;
  validation_passed: boolean;
  validation_errors?: Record<string, any>;
  migration_batch_id: string;
  schema_version: string;
  created_at: Date;
  updated_at: Date;
}

// ========== Feature Flag Types ==========

export type RolloutStrategy = 'percentage' | 'whitelist' | 'time-based';
export type FeatureFlagStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface FeatureFlag {
  id: string;
  flag_name: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  rollout_strategy: RolloutStrategy;
  activated_at?: Date;
  deactivated_at?: Date;
  rollout_schedule?: RolloutSchedule;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  status: FeatureFlagStatus;
}

export interface RolloutSchedule {
  start_date: string;
  stages: RolloutStage[];
}

export interface RolloutStage {
  percentage: number;
  date: string;
  stage_number?: number;
}

export interface FeatureFlagAssignment {
  id: string;
  user_id: string;
  flag_id: string;
  enabled: boolean;
  override: boolean;
  assigned_at: Date;
  expires_at?: Date;
}

export interface RolloutStatus {
  featureName: string;
  enabled: boolean;
  percentage: number;
  usersAffected: number;
  errors: number;
  lastUpdated: string;
}

// ========== Legacy Schema Types ==========

export interface LegacyUser {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  light_score?: number;
  reputation_score?: number;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyPost {
  id: number;
  user_id: number;
  content: string;
  chamber_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyPoll {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  poll_type: string;
  chamber_id?: number;
  created_at: Date;
  closed_at?: Date;
  updated_at: Date;
}

export interface LegacyPollOption {
  id: number;
  poll_id: number;
  option_text: string;
  created_at: Date;
}

export interface LegacyVote {
  id: number;
  user_id: number;
  poll_id: number;
  option_id: number;
  weight: number;
  created_at: Date;
}

export interface LegacyChamber {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: Date;
}

export interface LegacyChamberMember {
  id: number;
  chamber_id: number;
  user_id: number;
  joined_at: Date;
}

// ========== New System Types ==========

export interface NewUser {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  has_dual_identity: boolean;
  current_identity_mode: 'true_self' | 'shadow';
  created_at: Date;
  updated_at: Date;
}

export interface UserMigrationTracking {
  id: string;
  legacy_user_id: number;
  new_user_id: string;
  migration_status: 'pending' | 'in_progress' | 'completed';
  on_new_system: boolean;
  new_system_percentage: number;
  migrated_at?: Date;
  first_new_system_login?: Date;
  data_validated: boolean;
  data_validation_errors?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ========== Adapter Types ==========

export interface AdapterRequest {
  userId: string;
  endpoint: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
}

export interface AdapterResponse {
  success: boolean;
  data?: any;
  error?: string;
  source: 'legacy' | 'new';
}

// ========== Migration Log Types ==========

export interface MigrationLog {
  id: string;
  entity_type: EntityType;
  entity_id?: number;
  new_entity_id?: string;
  action: 'migrate' | 'validate' | 'rollback' | 'retry';
  success: boolean;
  error_message?: string;
  details?: Record<string, any>;
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  initiated_by: string;
  batch_id?: string;
  created_at: Date;
}

// ========== Schema Mapping Types ==========

export interface LegacySchemaMapping {
  id: string;
  legacy_entity: string;
  legacy_field: string;
  new_entity: string;
  new_field: string;
  transformation_rule?: string;
  data_type_legacy: string;
  data_type_new: string;
  required: boolean;
  nullable: boolean;
  created_at: Date;
}

// ========== API Response Types ==========

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: any;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;
