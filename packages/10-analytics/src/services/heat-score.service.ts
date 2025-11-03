/**
 * Module 10: Analytics - Heat Score Service
 * Calculates engagement heat and discussion intensity metrics
 */

import { HeatScore, EngagementMetrics, HeatScoreResponse } from '../types';
import * as db from '../utils/database';

class HeatScoreService {
  /**
   * Calculate heat score for engagement metrics
   *
   * Heat Score Algorithm:
   * 1. Normalize each metric to 0-100
   * 2. Weight metrics by importance
   * 3. Calculate acceleration (is engagement speeding up?)
   * 4. Apply acceleration bonus
   * 5. Return final 0-100 heat score
   */
  static calculateHeatScore(metrics: EngagementMetrics): number {
    // Normalize each metric to 0-100 scale
    const viewScore = Math.min((metrics.viewsPerHour / 100) * 100, 100);
    const commentScore = Math.min((metrics.commentsPerHour / 20) * 100, 100);
    const reactionScore = Math.min((metrics.reactionsPerHour / 50) * 100, 100);
    const viralityScore = Math.min((metrics.shareCount / 10) * 100, 100);

    // Calculate acceleration (is engagement speeding up?)
    const acceleration = this.calculateAcceleration(metrics.history || []);
    const accelerationBonus = Math.max(acceleration * 10, 0);

    // Weighted combination
    const weights = {
      views: 0.2,
      comments: 0.3,
      reactions: 0.25,
      virality: 0.25,
    };

    const baseScore =
      viewScore * weights.views +
      commentScore * weights.comments +
      reactionScore * weights.reactions +
      viralityScore * weights.virality;

    return Math.min(baseScore + accelerationBonus, 100);
  }

  /**
   * Determine heat trend based on current and previous scores
   */
  static determineHeatTrend(
    currentScore: number,
    previousScore: number,
    acceleration: number
  ): 'heating' | 'cooling' | 'stable' | 'explosive' {
    const change = currentScore - previousScore;

    if (acceleration > 20 || change > 30) {
      return 'explosive';
    } else if (change > 5) {
      return 'heating';
    } else if (change < -5) {
      return 'cooling';
    }
    return 'stable';
  }

  /**
   * Store heat score in database
   */
  static async storeHeatScore(
    referenceType: string,
    referenceId: string,
    metrics: EngagementMetrics,
    previousScore?: HeatScore
  ): Promise<HeatScore> {
    const currentHeatScore = this.calculateHeatScore(metrics);
    const previousScoreValue = previousScore?.current_heat_score || 0;
    const acceleration = this.calculateAcceleration(metrics.history || []);
    const heatTrend = this.determineHeatTrend(currentHeatScore, previousScoreValue, acceleration);

    const now = new Date();
    const heatScoreData = {
      reference_type: referenceType,
      reference_id: referenceId,
      view_count: Math.floor(metrics.viewsPerHour * 24), // Extrapolate to daily
      unique_viewers: Math.floor(metrics.uniqueViewersPerHour * 24),
      comment_count: Math.floor(metrics.commentsPerHour * 24),
      reaction_count: Math.floor(metrics.reactionsPerHour * 24),
      share_count: metrics.shareCount,
      views_per_hour: metrics.viewsPerHour,
      comments_per_hour: metrics.commentsPerHour,
      acceleration: acceleration,
      current_heat_score: currentHeatScore,
      peak_heat_score: Math.max(currentHeatScore, previousScore?.peak_heat_score || 0),
      heat_trend: heatTrend,
      first_activity: previousScore?.first_activity || now,
      last_activity: now,
      peak_activity: currentHeatScore > previousScoreValue ? now : previousScore?.peak_activity || now,
    };

    return db.insertOrUpdateHeatScore(heatScoreData);
  }

  /**
   * Get heat score for specific content
   */
  static async getHeatScore(referenceType: string, referenceId: string): Promise<HeatScore | null> {
    return db.getHeatScore(referenceType, referenceId);
  }

  /**
   * Get top trending content by heat score
   */
  static async getTrendingContent(
    referenceType: string,
    limit: number = 10
  ): Promise<HeatScore[]> {
    return db.getTopHeatScores(referenceType, limit);
  }

  /**
   * Format heat score for API response
   */
  static formatHeatScoreResponse(heatScore: HeatScore): HeatScoreResponse {
    return {
      heat_score: heatScore.current_heat_score,
      trend: heatScore.heat_trend,
      interpretation: this.interpretHeatScore(heatScore.current_heat_score, heatScore.heat_trend),
      velocity: {
        views_per_hour: heatScore.views_per_hour,
        comments_per_hour: heatScore.comments_per_hour,
        acceleration: heatScore.acceleration,
      },
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private static calculateAcceleration(history: number[]): number {
    if (history.length < 2) return 0;

    // Calculate rate of change
    const changes: number[] = [];
    for (let i = 1; i < history.length; i++) {
      changes.push(history[i] - history[i - 1]);
    }

    // Return average acceleration
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return avgChange;
  }

  private static interpretHeatScore(score: number, trend: string): string {
    if (score >= 80) {
      return `🔥 Extremely hot - ${trend} rapidly. Major engagement happening!`;
    } else if (score >= 60) {
      return `🌡️ Very hot - Strong engagement and momentum`;
    } else if (score >= 40) {
      return `📊 Moderate heat - Steady engagement`;
    } else if (score >= 20) {
      return `❄️ Cooling down - Engagement decreasing`;
    } else {
      return `🧊 Cold - Very low engagement`;
    }
  }
}

const heatScoreService = HeatScoreService;
export default heatScoreService;
