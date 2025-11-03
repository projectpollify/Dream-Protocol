/**
 * Module 10: Analytics - Database Utilities
 * Functional database operations for analytics tables
 */

import { Pool, QueryResult } from 'pg';

let pool: Pool;

export function initializeDatabase(dbPool: Pool): void {
  pool = dbPool;
}

// ============================================================================
// Query Execution
// ============================================================================

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool.query<T>(text, params);
}

export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

export async function queryMany<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// ============================================================================
// Shadow Consensus Snapshots Operations
// ============================================================================

export async function insertShadowConsensusSnapshot(snapshot: {
  poll_id: string;
  snapshot_timestamp: Date;
  hours_since_poll_start: number;
  snapshot_type: string;
  true_self_yes_count: number;
  true_self_no_count: number;
  true_self_abstain_count: number;
  shadow_yes_count: number;
  shadow_no_count: number;
  shadow_abstain_count: number;
  true_self_yes_percent: number;
  true_self_no_percent: number;
  true_self_abstain_percent: number;
  shadow_yes_percent: number;
  shadow_no_percent: number;
  shadow_abstain_percent: number;
  consensus_delta: number;
  delta_direction: string;
  social_pressure_score: number;
  confidence_interval: number;
  sample_size: number;
  statistical_significance: boolean;
}): Promise<any> {
  const text = `
    INSERT INTO shadow_consensus_snapshots (
      poll_id, snapshot_timestamp, hours_since_poll_start, snapshot_type,
      true_self_yes_count, true_self_no_count, true_self_abstain_count,
      shadow_yes_count, shadow_no_count, shadow_abstain_count,
      true_self_yes_percent, true_self_no_percent, true_self_abstain_percent,
      shadow_yes_percent, shadow_no_percent, shadow_abstain_percent,
      consensus_delta, delta_direction, social_pressure_score,
      confidence_interval, sample_size, statistical_significance
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) RETURNING *
  `;

  return queryOne(text, [
    snapshot.poll_id,
    snapshot.snapshot_timestamp,
    snapshot.hours_since_poll_start,
    snapshot.snapshot_type,
    snapshot.true_self_yes_count,
    snapshot.true_self_no_count,
    snapshot.true_self_abstain_count,
    snapshot.shadow_yes_count,
    snapshot.shadow_no_count,
    snapshot.shadow_abstain_count,
    snapshot.true_self_yes_percent,
    snapshot.true_self_no_percent,
    snapshot.true_self_abstain_percent,
    snapshot.shadow_yes_percent,
    snapshot.shadow_no_percent,
    snapshot.shadow_abstain_percent,
    snapshot.consensus_delta,
    snapshot.delta_direction,
    snapshot.social_pressure_score,
    snapshot.confidence_interval,
    snapshot.sample_size,
    snapshot.statistical_significance,
  ]);
}

export async function getShadowConsensusForPoll(pollId: string): Promise<any[]> {
  const text = `
    SELECT * FROM shadow_consensus_snapshots
    WHERE poll_id = $1
    ORDER BY snapshot_timestamp DESC
  `;
  return queryMany(text, [pollId]);
}

export async function getLatestShadowConsensus(pollId: string): Promise<any | null> {
  const text = `
    SELECT * FROM shadow_consensus_snapshots
    WHERE poll_id = $1
    ORDER BY snapshot_timestamp DESC
    LIMIT 1
  `;
  return queryOne(text, [pollId]);
}

// ============================================================================
// Trend Predictions Operations
// ============================================================================

export async function insertTrendPrediction(prediction: {
  poll_id: string;
  prediction_type: string;
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
}): Promise<any> {
  const text = `
    INSERT INTO trend_predictions (
      poll_id, prediction_type, current_delta, current_direction,
      predicted_delta_7d, predicted_delta_30d, predicted_convergence_date,
      confidence_score, similar_historical_patterns, average_convergence_days,
      prediction_reasoning, key_factors
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  return queryOne(text, [
    prediction.poll_id,
    prediction.prediction_type,
    prediction.current_delta,
    prediction.current_direction,
    prediction.predicted_delta_7d,
    prediction.predicted_delta_30d,
    prediction.predicted_convergence_date,
    prediction.confidence_score,
    prediction.similar_historical_patterns,
    prediction.average_convergence_days,
    JSON.stringify(prediction.prediction_reasoning),
    prediction.key_factors,
  ]);
}

export async function getTrendPredictionsForPoll(pollId: string): Promise<any[]> {
  const text = `
    SELECT * FROM trend_predictions
    WHERE poll_id = $1
    ORDER BY created_at DESC
  `;
  return queryMany(text, [pollId]);
}

// ============================================================================
// Platform Health Metrics Operations
// ============================================================================

export async function insertPlatformHealthMetrics(metrics: {
  metric_timestamp: Date;
  window_type: string;
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
  overall_health_score: number;
  health_status: string;
}): Promise<any> {
  const text = `
    INSERT INTO platform_health_metrics (
      metric_timestamp, window_type, active_users, new_users, verified_humans, dual_identity_users,
      total_votes_cast, shadow_participation_rate, average_session_duration, polls_created,
      pollcoin_velocity, gratium_staked, average_light_score, economic_participation_rate,
      posts_created, comments_created, reactions_given, content_quality_score,
      api_response_time_ms, error_rate, suspected_bot_accounts, sybil_attack_probability,
      overall_health_score, health_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24
    ) RETURNING *
  `;

  return queryOne(text, [
    metrics.metric_timestamp,
    metrics.window_type,
    metrics.active_users,
    metrics.new_users,
    metrics.verified_humans,
    metrics.dual_identity_users,
    metrics.total_votes_cast,
    metrics.shadow_participation_rate,
    metrics.average_session_duration,
    metrics.polls_created,
    metrics.pollcoin_velocity,
    metrics.gratium_staked,
    metrics.average_light_score,
    metrics.economic_participation_rate,
    metrics.posts_created,
    metrics.comments_created,
    metrics.reactions_given,
    metrics.content_quality_score,
    metrics.api_response_time_ms,
    metrics.error_rate,
    metrics.suspected_bot_accounts,
    metrics.sybil_attack_probability,
    metrics.overall_health_score,
    metrics.health_status,
  ]);
}

export async function getLatestHealthMetrics(windowType: string): Promise<any | null> {
  const text = `
    SELECT * FROM platform_health_metrics
    WHERE window_type = $1
    ORDER BY metric_timestamp DESC
    LIMIT 1
  `;
  return queryOne(text, [windowType]);
}

// ============================================================================
// Heat Scores Operations
// ============================================================================

export async function insertOrUpdateHeatScore(heatScore: {
  reference_type: string;
  reference_id: string;
  view_count: number;
  unique_viewers: number;
  comment_count: number;
  reaction_count: number;
  share_count: number;
  views_per_hour: number;
  comments_per_hour: number;
  acceleration: number;
  current_heat_score: number;
  peak_heat_score: number;
  heat_trend: string;
  first_activity: Date;
  last_activity: Date;
  peak_activity: Date;
}): Promise<any> {
  const text = `
    INSERT INTO heat_scores (
      reference_type, reference_id, view_count, unique_viewers, comment_count,
      reaction_count, share_count, views_per_hour, comments_per_hour, acceleration,
      current_heat_score, peak_heat_score, heat_trend, first_activity, last_activity, peak_activity
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (reference_type, reference_id) DO UPDATE SET
      view_count = $3,
      unique_viewers = $4,
      comment_count = $5,
      reaction_count = $6,
      share_count = $7,
      views_per_hour = $8,
      comments_per_hour = $9,
      acceleration = $10,
      current_heat_score = $11,
      peak_heat_score = GREATEST(peak_heat_score, $12),
      heat_trend = $13,
      last_activity = $15,
      peak_activity = CASE WHEN $12 > heat_scores.peak_heat_score THEN $15 ELSE peak_activity END,
      updated_at = NOW()
    RETURNING *
  `;

  return queryOne(text, [
    heatScore.reference_type,
    heatScore.reference_id,
    heatScore.view_count,
    heatScore.unique_viewers,
    heatScore.comment_count,
    heatScore.reaction_count,
    heatScore.share_count,
    heatScore.views_per_hour,
    heatScore.comments_per_hour,
    heatScore.acceleration,
    heatScore.current_heat_score,
    heatScore.peak_heat_score,
    heatScore.heat_trend,
    heatScore.first_activity,
    heatScore.last_activity,
    heatScore.peak_activity,
  ]);
}

export async function getHeatScore(referenceType: string, referenceId: string): Promise<any | null> {
  const text = `
    SELECT * FROM heat_scores
    WHERE reference_type = $1 AND reference_id = $2
  `;
  return queryOne(text, [referenceType, referenceId]);
}

export async function getTopHeatScores(referenceType: string, limit: number = 10): Promise<any[]> {
  const text = `
    SELECT * FROM heat_scores
    WHERE reference_type = $1
    ORDER BY current_heat_score DESC
    LIMIT $2
  `;
  return queryMany(text, [referenceType, limit]);
}
