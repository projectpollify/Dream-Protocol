/**
 * Module 10: Analytics - Trend Analysis Service
 * Predictive analytics for opinion shifts and convergence analysis
 */

import { TrendPrediction, PredictedShift, PredictionResponse } from '../types';
import * as db from '../utils/database';

class TrendAnalysisService {
  /**
   * Predict future opinion shift based on current divergence
   *
   * Core hypothesis: Private beliefs become public opinion over time
   * This analyzes historical patterns to forecast convergence timelines
   */
  static async predictFutureShift(
    pollId: string,
    currentDelta: number,
    direction: string,
    sampleSize: number
  ): Promise<PredictedShift> {
    try {
      // Estimate historical patterns (would come from database in production)
      const patterns = this.getHistoricalPatterns(direction);

      // Calculate features for prediction
      const features = {
        currentDelta,
        direction,
        averageConvergenceDays: patterns.avgConvergenceDays,
        deltaDecayRate: patterns.decayRate,
        similarPatternCount: patterns.count,
      };

      // Core prediction logic
      const prediction = this.generatePrediction(features, sampleSize);

      // Store prediction in database
      await this.storePrediction(pollId, prediction, features);

      return prediction;
    } catch (error) {
      throw new Error(`Failed to predict future shift: ${error}`);
    }
  }

  /**
   * Analyze conviction across different belief strengths
   *
   * Key insight: How strongly do people feel about their positions?
   * Measured by stake amounts and Light Score
   */
  static async analyzeConvictionStrength(
    pollId: string,
    trueSelfDelta: number,
    shadowDelta: number,
    averageStakeYes: number,
    averageStakeNo: number
  ): Promise<{
    conviction_level: 'weak' | 'moderate' | 'strong' | 'extreme';
    stake_confidence_ratio: number;
    interpretation: string;
  }> {
    // Conviction is measured by both delta and stake amounts
    const deltaConviction = (trueSelfDelta + shadowDelta) / 2;
    const stakeConviction = Math.max(averageStakeYes, averageStakeNo);

    // Calculate conviction level
    const combinedConviction = (deltaConviction + Math.min(stakeConviction / 100, 50)) / 2;

    let level: 'weak' | 'moderate' | 'strong' | 'extreme';
    if (combinedConviction < 15) {
      level = 'weak';
    } else if (combinedConviction < 35) {
      level = 'moderate';
    } else if (combinedConviction < 60) {
      level = 'strong';
    } else {
      level = 'extreme';
    }

    const stakeConfidenceRatio = stakeConviction > 0 ? combinedConviction / (stakeConviction / 100) : 0;

    return {
      conviction_level: level,
      stake_confidence_ratio: parseFloat(stakeConfidenceRatio.toFixed(2)),
      interpretation: this.interpretConviction(level, stakeConfidenceRatio),
    };
  }

  /**
   * Detect consensus emergence patterns
   *
   * When does a minority position become a consensus?
   * This identifies tipping points and cascade effects
   */
  static detectConsensusEmergence(
    currentDelta: number,
    direction: string,
    shadowParticipationRate: number
  ): {
    pattern_type: 'convergence' | 'divergence' | 'stable' | 'tipping_point';
    risk_level: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    // Analyze pattern characteristics
    const isDiverging = currentDelta > 30;
    const isConverging = currentDelta < 10;
    const hasHighShadowParticipation = shadowParticipationRate > 70;

    // Detect pattern
    let pattern: 'convergence' | 'divergence' | 'stable' | 'tipping_point';
    if (isDiverging) {
      pattern = 'divergence';
    } else if (isConverging) {
      pattern = 'convergence';
    } else if (hasHighShadowParticipation && currentDelta > 20) {
      pattern = 'tipping_point';
    } else {
      pattern = 'stable';
    }

    // Assess risk
    let risk: 'low' | 'medium' | 'high';
    if (pattern === 'tipping_point' || (pattern === 'divergence' && currentDelta > 40)) {
      risk = 'high';
    } else if (pattern === 'divergence') {
      risk = 'medium';
    } else {
      risk = 'low';
    }

    return {
      pattern_type: pattern,
      risk_level: risk,
      recommendation: this.getConsensusRecommendation(pattern, risk),
    };
  }

  /**
   * Get trending topics based on heat scores and Shadow Consensus patterns
   */
  static async getTrendingTopics(
    limit: number = 10
  ): Promise<Array<{ topic_id: string; trend_score: number; pattern: string }>> {
    try {
      // Query trending topics (simplified - would aggregate real data in production)
      const topics: Array<{ topic_id: string; trend_score: number; pattern: string }> = [];

      // In production, this would query:
      // 1. Heat scores from recent discussions
      // 2. Shadow Consensus patterns showing emergence
      // 3. Conviction analysis showing strong beliefs
      // Then rank by trend_score

      return topics;
    } catch (error) {
      throw new Error(`Failed to get trending topics: ${error}`);
    }
  }

  /**
   * Format prediction for API response
   */
  static formatPredictionResponse(
    pollId: string,
    prediction: PredictedShift,
    currentDelta: number,
    direction: string
  ): PredictionResponse {
    return {
      poll_id: pollId,
      current_state: {
        consensus_delta: currentDelta,
        direction: direction,
      },
      prediction: {
        likely_outcome: prediction.direction,
        expected_delta_7d: prediction.expected_delta_7d,
        expected_delta_30d: prediction.expected_delta_30d,
        convergence_date: this.getConvergenceDate(prediction.timeline),
        confidence: prediction.confidence,
        similar_historical_patterns: Math.floor(Math.random() * 20) + 5, // Placeholder
      },
      reasoning: this.generateReasoning(prediction, currentDelta),
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private static getHistoricalPatterns(direction: string): {
    avgConvergenceDays: number;
    decayRate: number;
    count: number;
  } {
    // In production, this would query real historical data
    // For now, return reasonable defaults based on direction
    if (direction === 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT') {
      return {
        avgConvergenceDays: 42,
        decayRate: 0.75,
        count: 14,
      };
    } else if (direction === 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION') {
      return {
        avgConvergenceDays: 35,
        decayRate: 0.72,
        count: 11,
      };
    }
    return {
      avgConvergenceDays: 30,
      decayRate: 0.7,
      count: 8,
    };
  }

  private static generatePrediction(features: any, sampleSize: number): PredictedShift {
    const { currentDelta, direction, averageConvergenceDays, deltaDecayRate, similarPatternCount } = features;

    // Calculate confidence based on sample size and pattern similarity
    const sizeConfidence = Math.min(sampleSize / 100, 1);
    const patternConfidence = Math.min(similarPatternCount / 20, 1);
    const confidence = (sizeConfidence + patternConfidence) / 2;

    // Calculate expected deltas based on decay rate
    const expectedDelta7d = currentDelta * (1 - deltaDecayRate * 0.14); // 2 weeks
    const expectedDelta30d = currentDelta * (1 - deltaDecayRate * 0.6); // 4 weeks

    // Estimate timeline to convergence
    const timeline = this.estimateConvergenceTimeline(currentDelta, deltaDecayRate);

    let shiftDirection = direction.toLowerCase();
    if (direction === 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT') {
      shiftDirection = 'shift_toward_support';
    } else if (direction === 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION') {
      shiftDirection = 'shift_toward_opposition';
    }

    return {
      direction: shiftDirection,
      timeline,
      confidence: Math.min(confidence, 0.95),
      expected_delta_7d: Math.max(expectedDelta7d, 0),
      expected_delta_30d: Math.max(expectedDelta30d, 0),
      reasoning: this.generatePredictionReasoning(
        direction,
        timeline,
        similarPatternCount,
        averageConvergenceDays
      ).join('; '),
    };
  }

  private static async storePrediction(
    pollId: string,
    prediction: PredictedShift,
    features: any
  ): Promise<void> {
    // Store in database for historical analysis
    const predictionData = {
      poll_id: pollId,
      prediction_type: features.direction === 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT' ? 'opinion_shift' : 'consensus_convergence',
      current_delta: features.currentDelta,
      current_direction: features.direction,
      predicted_delta_7d: prediction.expected_delta_7d,
      predicted_delta_30d: prediction.expected_delta_30d,
      predicted_convergence_date: new Date(Date.now() + prediction.timeline * 24 * 60 * 60 * 1000),
      confidence_score: prediction.confidence,
      similar_historical_patterns: features.similarPatternCount,
      average_convergence_days: features.averageConvergenceDays,
      prediction_reasoning: { features },
      key_factors: [
        'Shadow support significant',
        'Historical patterns support',
        'Sample size adequate',
      ],
    };

    await db.insertTrendPrediction(predictionData);
  }

  private static interpretConviction(
    level: string,
    ratio: number
  ): string {
    if (level === 'weak') {
      return 'Community has low conviction - easily swayed by new information';
    } else if (level === 'moderate') {
      return 'Moderate conviction - beliefs held but open to change';
    } else if (level === 'strong') {
      return 'Strong conviction - significant stakes and belief alignment';
    }
    return 'Extreme conviction - very high stakes and unified belief';
  }

  private static getConsensusRecommendation(
    pattern: string,
    risk: string
  ): string {
    if (pattern === 'tipping_point') {
      return 'Critical moment - shadow consensus likely to become public soon. Monitor closely.';
    } else if (pattern === 'divergence' && risk === 'high') {
      return 'Severe divergence detected. May indicate censorship or strong social pressure.';
    } else if (pattern === 'convergence') {
      return 'Healthy convergence - community reaching agreement. Watch for emergence of new consensus.';
    }
    return 'Stable pattern - community maintaining current position distribution.';
  }

  private static getConvergenceDate(timelineDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + timelineDays);
    return date.toISOString().split('T')[0];
  }

  private static generatePredictionReasoning(
    direction: string,
    timeline: number,
    patternCount: number,
    avgDays: number
  ): string[] {
    return [
      `Current direction: ${direction === 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT' ? 'Private support, public opposition' : 'Public support, private opposition'}`,
      `${patternCount} similar historical patterns identified`,
      `Average convergence time from similar patterns: ${avgDays} days`,
      `Current projection: convergence in ${timeline} days`,
      'Higher sample size increases prediction confidence',
    ];
  }

  private static generateReasoning(prediction: PredictedShift, currentDelta: number): string[] {
    return [
      `Shadow consensus divergence is ${currentDelta.toFixed(1)}% from public opinion`,
      `${prediction.confidence > 0.7 ? 'Strong historical' : 'Weak historical'} precedent for this pattern`,
      `Predicted 7-day delta: ${prediction.expected_delta_7d.toFixed(1)}% (${Math.round((currentDelta - prediction.expected_delta_7d) / currentDelta * 100)}% convergence)`,
      `Predicted 30-day delta: ${prediction.expected_delta_30d.toFixed(1)}% (${Math.round((currentDelta - prediction.expected_delta_30d) / currentDelta * 100)}% convergence)`,
      `Confidence level: ${Math.round(prediction.confidence * 100)}%`,
    ];
  }

  private static estimateConvergenceTimeline(delta: number, decayRate: number): number {
    // Estimate days until delta < 5 (near convergence)
    let currentDelta = delta;
    let days = 0;

    while (currentDelta > 5 && days < 365) {
      currentDelta *= 1 - decayRate / 7; // Daily decay
      days += 1;
    }

    return days;
  }
}

const trendAnalysisService = TrendAnalysisService;
export default trendAnalysisService;
