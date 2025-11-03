/**
 * Module 10: Analytics - Type Definitions
 * Types for Shadow Consensus, Predictions, and Platform Health
 */

// ============================================================================
// Shadow Consensus Types
// ============================================================================

export interface ShadowConsensusSnapshot {
  id: string;
  poll_id: string;
  snapshot_timestamp: Date;
  hours_since_poll_start: number;
  snapshot_type: 'hourly' | 'daily' | 'final' | 'milestone';

  // Vote counts
  true_self_yes_count: number;
  true_self_no_count: number;
  true_self_abstain_count: number;
  shadow_yes_count: number;
  shadow_no_count: number;
  shadow_abstain_count: number;

  // Percentages
  true_self_yes_percent: number;
  true_self_no_percent: number;
  true_self_abstain_percent: number;
  shadow_yes_percent: number;
  shadow_no_percent: number;
  shadow_abstain_percent: number;

  // The key metric
  consensus_delta: number;
  delta_direction: 'ALIGNED' | 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION' | 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT';
  social_pressure_score: number;

  // Statistics
  confidence_interval: number;
  sample_size: number;
  statistical_significance: boolean;

  created_at: Date;
}

export interface ShadowConsensusResult {
  consensus_delta: number;
  direction: 'ALIGNED' | 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION' | 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT';
  social_pressure_score: number;
  interpretation: string;
  confidence_interval: number;
  true_self_percentage: number;
  shadow_percentage: number;
  sample_size: number;
}

// ============================================================================
// Trend Prediction Types
// ============================================================================

export interface TrendPrediction {
  id: string;
  poll_id: string;
  prediction_type: 'opinion_shift' | 'consensus_convergence' | 'tipping_point' | 'cascade_effect';
  current_delta: number;
  current_direction: string;
  predicted_delta_7d: number;
  predicted_delta_30d: number;
  predicted_convergence_date: Date;
  confidence_score: number;
  similar_historical_patterns: number;
  average_convergence_days: number;
  prediction_reasoning: Record<string, unknown>;
  key_factors: string[];
  created_at: Date;
  updated_at: Date;
}

export interface PredictedShift {
  direction: string;
  timeline: number;
  confidence: number;
  expected_delta_7d: number;
  expected_delta_30d: number;
  reasoning: string;
}

// ============================================================================
// Conviction Analysis Types
// ============================================================================

export interface ConvictionAnalysis {
  id: string;
  poll_id: string;
  high_light_score_threshold: number;
  mid_light_score_threshold: number;

  // High reputation segment
  high_reputation_true_yes: number;
  high_reputation_shadow_yes: number;
  high_reputation_delta: number;
  high_reputation_count: number;

  // Mid reputation segment
  mid_reputation_true_yes: number;
  mid_reputation_shadow_yes: number;
  mid_reputation_delta: number;
  mid_reputation_count: number;

  // Low reputation segment
  low_reputation_true_yes: number;
  low_reputation_shadow_yes: number;
  low_reputation_delta: number;
  low_reputation_count: number;

  // Insights
  reputation_correlation: number;
  interpretation: string;
  average_stake_yes: number;
  average_stake_no: number;
  stake_conviction_ratio: number;

  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Platform Health Types
// ============================================================================

export interface PlatformHealthMetrics {
  id: string;
  metric_timestamp: Date;
  window_type: 'realtime' | 'hourly' | 'daily' | 'weekly';

  // User metrics
  active_users: number;
  new_users: number;
  verified_humans: number;
  dual_identity_users: number;

  // Engagement metrics
  total_votes_cast: number;
  shadow_participation_rate: number;
  average_session_duration: number;
  polls_created: number;

  // Economic health
  pollcoin_velocity: number;
  gratium_staked: number;
  average_light_score: number;
  economic_participation_rate: number;

  // Content metrics
  posts_created: number;
  comments_created: number;
  reactions_given: number;
  content_quality_score: number;

  // System performance
  api_response_time_ms: number;
  error_rate: number;

  // Bot detection
  suspected_bot_accounts: number;
  sybil_attack_probability: number;

  // Health score
  overall_health_score: number;
  health_status: 'healthy' | 'monitoring' | 'concern' | 'critical';

  created_at: Date;
}

export interface HealthMetricsInput {
  window_type: 'realtime' | 'hourly' | 'daily' | 'weekly';
  active_users: number;
  new_users: number;
  verified_humans: number;
  dual_identity_users: number;
  total_votes_cast: number;
  shadow_participation_rate: number;
  average_session_duration: number;
  polls_created: number;
  pollcoin_velocity: number;
  gratium_staked: number;
  average_light_score: number;
  economic_participation_rate: number;
  posts_created: number;
  comments_created: number;
  reactions_given: number;
  content_quality_score: number;
  api_response_time_ms: number;
  error_rate: number;
  suspected_bot_accounts: number;
  sybil_attack_probability: number;
}

// ============================================================================
// Heat Score Types
// ============================================================================

export interface HeatScore {
  id: string;
  reference_type: 'poll' | 'post' | 'chamber' | 'pillar' | 'topic';
  reference_id: string;

  // Engagement metrics
  view_count: number;
  unique_viewers: number;
  comment_count: number;
  reaction_count: number;
  share_count: number;

  // Velocity metrics
  views_per_hour: number;
  comments_per_hour: number;
  acceleration: number;

  // Heat scoring
  current_heat_score: number;
  peak_heat_score: number;
  heat_trend: 'heating' | 'cooling' | 'stable' | 'explosive';

  // Time tracking
  first_activity: Date;
  last_activity: Date;
  peak_activity: Date;

  updated_at: Date;
}

export interface EngagementMetrics {
  viewsPerHour: number;
  commentsPerHour: number;
  reactionsPerHour: number;
  uniqueViewersPerHour: number;
  shareCount: number;
  history?: number[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ShadowConsensusResponse {
  poll_id: string;
  current_snapshot: {
    consensus_delta: number;
    direction: string;
    social_pressure_score: number;
    true_self_yes: number;
    shadow_yes: number;
    confidence_interval: number;
    interpretation: string;
  };
  trend: {
    delta_24h_ago?: number;
    delta_7d_ago?: number;
    convergence_rate: string;
    estimated_alignment_date?: string;
  };
}

export interface PlatformHealthResponse {
  health_score: number;
  status: 'healthy' | 'monitoring' | 'concern' | 'critical';
  metrics: {
    active_users_24h: number;
    new_users_today: number;
    shadow_participation: number;
    pollcoin_velocity: number;
    average_light_score: number;
  };
  warnings: string[];
  trends: {
    user_growth: string;
    engagement: string;
    economic_activity: string;
  };
}

export interface PredictionResponse {
  poll_id: string;
  current_state: {
    consensus_delta: number;
    direction: string;
  };
  prediction: {
    likely_outcome: string;
    expected_delta_7d: number;
    expected_delta_30d: number;
    convergence_date: string;
    confidence: number;
    similar_historical_patterns: number;
  };
  reasoning: string[];
}

export interface HeatScoreResponse {
  heat_score: number;
  trend: 'heating' | 'cooling' | 'stable' | 'explosive';
  interpretation: string;
  velocity: {
    views_per_hour: number;
    comments_per_hour: number;
    acceleration: number;
  };
}
