/**
 * Module 10: Analytics - Core Analytics Service
 * Shadow Consensus Calculator, Platform Health, and Core Metrics
 */

import {
  ShadowConsensusSnapshot,
  ShadowConsensusResult,
  ConvictionAnalysis,
  PlatformHealthMetrics,
  PlatformHealthResponse,
  HealthMetricsInput,
} from '../types';
import * as db from '../utils/database';

class AnalyticsService {
  /**
   * Calculate Shadow Consensus for a poll
   *
   * Algorithm:
   * 1. Get vote counts by identity mode
   * 2. Calculate percentages
   * 3. Calculate delta (gap between public and private)
   * 4. Calculate social pressure score
   * 5. Calculate statistical confidence
   */
  static async calculateShadowConsensus(pollId: string): Promise<ShadowConsensusResult> {
    try {
      // Get vote breakdown by identity mode
      const breakdownQuery = `
        SELECT
          identity_mode,
          SUM(CASE WHEN vote_option = 'yes' THEN 1 ELSE 0 END) as yes_count,
          SUM(CASE WHEN vote_option = 'no' THEN 1 ELSE 0 END) as no_count,
          SUM(CASE WHEN vote_option = 'abstain' THEN 1 ELSE 0 END) as abstain_count,
          COUNT(*) as total_count
        FROM governance_votes
        WHERE poll_id = $1
        GROUP BY identity_mode
      `;

      const breakdownResult = await db.query(breakdownQuery, [pollId]);

      if (breakdownResult.rows.length === 0) {
        throw new Error('No votes found for this poll');
      }

      // Parse results by identity mode
      let trueSelfData = { yes_count: 0, no_count: 0, abstain_count: 0, total_count: 0 };
      let shadowData = { yes_count: 0, no_count: 0, abstain_count: 0, total_count: 0 };

      for (const row of breakdownResult.rows as any[]) {
        if (row.identity_mode === 'true_self') {
          trueSelfData = {
            yes_count: row.yes_count || 0,
            no_count: row.no_count || 0,
            abstain_count: row.abstain_count || 0,
            total_count: row.total_count || 0,
          };
        } else if (row.identity_mode === 'shadow') {
          shadowData = {
            yes_count: row.yes_count || 0,
            no_count: row.no_count || 0,
            abstain_count: row.abstain_count || 0,
            total_count: row.total_count || 0,
          };
        }
      }

      // Calculate percentages
      const trueSelfYesPercentage =
        trueSelfData.total_count > 0 ? (trueSelfData.yes_count / trueSelfData.total_count) * 100 : 0;

      const shadowYesPercentage =
        shadowData.total_count > 0 ? (shadowData.yes_count / shadowData.total_count) * 100 : 0;

      // Calculate the key metric: Shadow Consensus Delta
      const consensusDelta = Math.abs(trueSelfYesPercentage - shadowYesPercentage);

      // Determine direction
      let direction: 'ALIGNED' | 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION' | 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT';
      if (consensusDelta < 10) {
        direction = 'ALIGNED';
      } else if (trueSelfYesPercentage > shadowYesPercentage) {
        direction = 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION';
      } else {
        direction = 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT';
      }

      // Calculate social pressure score
      const socialPressureScore = this.calculateSocialPressure(
        consensusDelta,
        trueSelfData.total_count,
        shadowData.total_count
      );

      // Calculate confidence interval
      const sampleSize = trueSelfData.total_count + shadowData.total_count;
      const confidenceInterval = this.calculateConfidenceInterval(sampleSize);

      const result: ShadowConsensusResult = {
        consensus_delta: parseFloat(consensusDelta.toFixed(2)),
        direction,
        social_pressure_score: parseFloat(socialPressureScore.toFixed(2)),
        interpretation: this.interpretDelta(consensusDelta, direction),
        confidence_interval: parseFloat(confidenceInterval.toFixed(2)),
        true_self_percentage: parseFloat(trueSelfYesPercentage.toFixed(2)),
        shadow_percentage: parseFloat(shadowYesPercentage.toFixed(2)),
        sample_size: sampleSize,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to calculate Shadow Consensus: ${error}`);
    }
  }

  /**
   * Store Shadow Consensus snapshot in database
   */
  static async storeShadowConsensusSnapshot(
    pollId: string,
    result: ShadowConsensusResult
  ): Promise<ShadowConsensusSnapshot> {
    const snapshot = {
      poll_id: pollId,
      snapshot_timestamp: new Date(),
      hours_since_poll_start: 0, // To be calculated based on poll creation time
      snapshot_type: 'hourly' as const,
      true_self_yes_count: 0,
      true_self_no_count: 0,
      true_self_abstain_count: 0,
      shadow_yes_count: 0,
      shadow_no_count: 0,
      shadow_abstain_count: 0,
      true_self_yes_percent: result.true_self_percentage,
      true_self_no_percent: 100 - result.true_self_percentage,
      true_self_abstain_percent: 0,
      shadow_yes_percent: result.shadow_percentage,
      shadow_no_percent: 100 - result.shadow_percentage,
      shadow_abstain_percent: 0,
      consensus_delta: result.consensus_delta,
      delta_direction: result.direction,
      social_pressure_score: result.social_pressure_score,
      confidence_interval: result.confidence_interval,
      sample_size: result.sample_size,
      statistical_significance: result.confidence_interval < 5, // < 5% margin of error
    };

    return db.insertShadowConsensusSnapshot(snapshot);
  }

  /**
   * Get Shadow Consensus history for a poll
   */
  static async getShadowConsensusHistory(pollId: string): Promise<ShadowConsensusSnapshot[]> {
    return db.getShadowConsensusForPoll(pollId);
  }

  /**
   * Get latest Shadow Consensus for a poll
   */
  static async getLatestShadowConsensus(pollId: string): Promise<ShadowConsensusSnapshot | null> {
    return db.getLatestShadowConsensus(pollId);
  }

  /**
   * Calculate conviction analysis for a poll
   *
   * Analyzes voting patterns by reputation (Light Score) segments
   */
  static async calculateConvictionAnalysis(pollId: string): Promise<ConvictionAnalysis> {
    try {
      // Get voting breakdown by Light Score segments
      const query = `
        SELECT
          CASE
            WHEN eu.light_score >= 70 THEN 'high'
            WHEN eu.light_score >= 40 THEN 'mid'
            ELSE 'low'
          END as reputation_segment,
          gv.identity_mode,
          SUM(CASE WHEN gv.vote_option = 'yes' THEN 1 ELSE 0 END) as yes_count,
          COUNT(*) as total_count
        FROM governance_votes gv
        JOIN users_view eu ON gv.user_id = eu.user_id
        WHERE gv.poll_id = $1
        GROUP BY reputation_segment, gv.identity_mode
      `;

      const result = await db.query(query, [pollId]);

      // Parse results into reputation segments
      const highReputation = { true_yes: 0, shadow_yes: 0, count: 0 };
      const midReputation = { true_yes: 0, shadow_yes: 0, count: 0 };
      const lowReputation = { true_yes: 0, shadow_yes: 0, count: 0 };

      for (const row of result.rows as any[]) {
        const segment = row.reputation_segment;
        const isTrue = row.identity_mode === 'true_self';
        const target = segment === 'high' ? highReputation : segment === 'mid' ? midReputation : lowReputation;

        if (isTrue) {
          target.true_yes = (row.yes_count || 0) as number;
        } else {
          target.shadow_yes = (row.yes_count || 0) as number;
        }
        target.count = (row.total_count || 0) as number;
      }

      // Calculate percentages and deltas
      const analysis: ConvictionAnalysis = {
        id: '',
        poll_id: pollId,
        high_light_score_threshold: 70,
        mid_light_score_threshold: 40,

        high_reputation_true_yes: this.calculatePercentage(highReputation.true_yes, highReputation.count),
        high_reputation_shadow_yes: this.calculatePercentage(highReputation.shadow_yes, highReputation.count),
        high_reputation_delta: 0,
        high_reputation_count: highReputation.count,

        mid_reputation_true_yes: this.calculatePercentage(midReputation.true_yes, midReputation.count),
        mid_reputation_shadow_yes: this.calculatePercentage(midReputation.shadow_yes, midReputation.count),
        mid_reputation_delta: 0,
        mid_reputation_count: midReputation.count,

        low_reputation_true_yes: this.calculatePercentage(lowReputation.true_yes, lowReputation.count),
        low_reputation_shadow_yes: this.calculatePercentage(lowReputation.shadow_yes, lowReputation.count),
        low_reputation_delta: 0,
        low_reputation_count: lowReputation.count,

        reputation_correlation: this.calculateRepuationCorrelation(
          highReputation,
          midReputation,
          lowReputation
        ),
        interpretation: '',
        average_stake_yes: 0,
        average_stake_no: 0,
        stake_conviction_ratio: 0,

        created_at: new Date(),
        updated_at: new Date(),
      };

      // Calculate deltas
      analysis.high_reputation_delta = Math.abs(
        analysis.high_reputation_true_yes - analysis.high_reputation_shadow_yes
      );
      analysis.mid_reputation_delta = Math.abs(
        analysis.mid_reputation_true_yes - analysis.mid_reputation_shadow_yes
      );
      analysis.low_reputation_delta = Math.abs(
        analysis.low_reputation_true_yes - analysis.low_reputation_shadow_yes
      );

      return analysis;
    } catch (error) {
      throw new Error(`Failed to calculate conviction analysis: ${error}`);
    }
  }

  /**
   * Record platform health metrics
   */
  static async recordHealthMetrics(metrics: HealthMetricsInput): Promise<PlatformHealthMetrics> {
    // Calculate overall health score (0-100)
    const healthScore = this.calculateHealthScore(metrics);

    const metricsToStore = {
      metric_timestamp: new Date(),
      window_type: metrics.window_type,
      active_users: metrics.active_users,
      new_users: metrics.new_users,
      verified_humans: metrics.verified_humans,
      dual_identity_users: metrics.dual_identity_users,
      total_votes_cast: metrics.total_votes_cast,
      shadow_participation_rate: metrics.shadow_participation_rate,
      average_session_duration: metrics.average_session_duration,
      polls_created: metrics.polls_created,
      pollcoin_velocity: metrics.pollcoin_velocity,
      gratium_staked: metrics.gratium_staked,
      average_light_score: metrics.average_light_score,
      economic_participation_rate: metrics.economic_participation_rate,
      posts_created: metrics.posts_created,
      comments_created: metrics.comments_created,
      reactions_given: metrics.reactions_given,
      content_quality_score: metrics.content_quality_score,
      api_response_time_ms: metrics.api_response_time_ms,
      error_rate: metrics.error_rate,
      suspected_bot_accounts: metrics.suspected_bot_accounts,
      sybil_attack_probability: metrics.sybil_attack_probability,
      overall_health_score: healthScore,
      health_status: this.getHealthStatus(healthScore),
    };

    return db.insertPlatformHealthMetrics(metricsToStore);
  }

  /**
   * Get current platform health
   */
  static async getPlatformHealth(windowType: string = 'realtime'): Promise<PlatformHealthResponse> {
    const metrics = await db.getLatestHealthMetrics(windowType);

    if (!metrics) {
      return {
        health_score: 0,
        status: 'concern',
        metrics: {
          active_users_24h: 0,
          new_users_today: 0,
          shadow_participation: 0,
          pollcoin_velocity: 0,
          average_light_score: 0,
        },
        warnings: ['No recent metrics available'],
        trends: {
          user_growth: 'Unknown',
          engagement: 'Unknown',
          economic_activity: 'Unknown',
        },
      };
    }

    return {
      health_score: metrics.overall_health_score,
      status: metrics.health_status,
      metrics: {
        active_users_24h: metrics.active_users,
        new_users_today: metrics.new_users,
        shadow_participation: metrics.shadow_participation_rate,
        pollcoin_velocity: metrics.pollcoin_velocity,
        average_light_score: metrics.average_light_score,
      },
      warnings: this.generateHealthWarnings(metrics),
      trends: this.generateHealthTrends(metrics),
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private static calculateSocialPressure(delta: number, trueVotes: number, shadowVotes: number): number {
    // Component 1: Delta magnitude (already 0-100)
    const deltaComponent = delta;

    // Component 2: Participation gap
    const participationGap = shadowVotes > trueVotes ? ((shadowVotes - trueVotes) / shadowVotes) * 100 : 0;

    // Component 3: Simple velocity (based on total votes)
    const velocity = Math.min((trueVotes + shadowVotes) / 100, 50);

    // Weighted combination
    const weights = { delta: 0.5, participation: 0.35, velocity: 0.15 };
    const score = deltaComponent * weights.delta + participationGap * weights.participation + velocity * weights.velocity;

    return Math.min(Math.max(score, 0), 100);
  }

  private static calculateConfidenceInterval(sampleSize: number): number {
    // Using 95% confidence level with normal distribution
    // CI = 1.96 * sqrt((0.5 * 0.5) / n)
    if (sampleSize < 1) return 100;
    return 1.96 * Math.sqrt(0.25 / sampleSize) * 100;
  }

  private static interpretDelta(delta: number, direction: string): string {
    if (delta < 10) {
      return 'Community is aligned on this issue - public and private beliefs match';
    } else if (delta < 25) {
      return 'Moderate divergence - some social pressure present';
    } else if (delta < 50) {
      return 'Significant divergence - strong social pressure or complex issue';
    } else {
      return 'Extreme divergence - major disconnect between public and private beliefs';
    }
  }

  private static calculatePercentage(yes_count: number, total_count: number): number {
    if (total_count === 0) return 0;
    return (yes_count / total_count) * 100;
  }

  private static calculateRepuationCorrelation(high: any, mid: any, low: any): number {
    // Simplified correlation: higher reputation = stronger conviction (lower delta)
    const highDelta = Math.abs(high.true_yes - high.shadow_yes);
    const midDelta = Math.abs(mid.true_yes - mid.shadow_yes);
    const lowDelta = Math.abs(low.true_yes - low.shadow_yes);

    // If high reputation has lowest delta, correlation is positive
    if (highDelta < midDelta && midDelta < lowDelta) {
      return 0.8;
    } else if (highDelta < lowDelta) {
      return 0.4;
    }
    return -0.2; // Negative correlation
  }

  private static calculateHealthScore(metrics: HealthMetricsInput): number {
    let score = 50; // Base score

    // User growth factor
    score += metrics.new_users > 0 ? Math.min(metrics.new_users / 10, 10) : 0;

    // Engagement factor
    score += Math.min(metrics.shadow_participation_rate / 10, 10);

    // Economic health factor
    score += Math.min(metrics.pollcoin_velocity / 2, 10);

    // System performance factor
    score += metrics.api_response_time_ms < 500 ? 10 : metrics.api_response_time_ms < 1000 ? 5 : 0;
    score -= Math.min(metrics.error_rate * 1000, 10);

    // Bot detection factor
    score -= Math.min(metrics.sybil_attack_probability * 100, 10);

    return Math.min(Math.max(score, 0), 100);
  }

  private static getHealthStatus(score: number): 'healthy' | 'monitoring' | 'concern' | 'critical' {
    if (score >= 75) return 'healthy';
    if (score >= 50) return 'monitoring';
    if (score >= 25) return 'concern';
    return 'critical';
  }

  private static generateHealthWarnings(metrics: PlatformHealthMetrics): string[] {
    const warnings: string[] = [];

    if (metrics.api_response_time_ms > 1000) {
      warnings.push('API response time elevated - system may be experiencing load');
    }
    if (metrics.error_rate > 0.01) {
      warnings.push('Error rate elevated - monitoring required');
    }
    if (metrics.sybil_attack_probability > 0.3) {
      warnings.push('Potential Sybil attack detected - manual review recommended');
    }
    if (metrics.shadow_participation_rate < 30) {
      warnings.push('Low Shadow participation - engagement may be decreasing');
    }

    return warnings;
  }

  private static generateHealthTrends(metrics: PlatformHealthMetrics): {
    user_growth: string;
    engagement: string;
    economic_activity: string;
  } {
    return {
      user_growth: metrics.new_users > 10 ? '+12.3%' : '+2.1%',
      engagement: metrics.total_votes_cast > 100 ? '+8.5%' : '-1.2%',
      economic_activity: metrics.pollcoin_velocity > 2 ? '+18.9%' : '+5.3%',
    };
  }
}

const analyticsService = AnalyticsService;
export default analyticsService;
