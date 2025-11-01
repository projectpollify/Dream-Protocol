/**
 * Module 06: Governance - Shadow Consensus Service
 * Calculate and analyze gap between public and private beliefs
 */

import { query } from '../utils/database';
import { ShadowConsensusSnapshot, ShadowConsensusResponse, ConfidenceInterval } from '../types';

// ============================================================================
// Calculate Shadow Consensus
// ============================================================================

/**
 * Calculates Shadow Consensus for a poll
 *
 * Algorithm:
 * 1. Get True Self vote breakdown
 * 2. Get Shadow vote breakdown
 * 3. Calculate percentages for each
 * 4. Calculate the gap (key insight)
 * 5. Calculate confidence intervals
 * 6. Interpret the gap
 * 7. Store snapshot
 *
 * @returns Shadow Consensus snapshot with gap analysis
 */
export async function calculateShadowConsensus(
  pollId: string
): Promise<ShadowConsensusSnapshot> {
  // Step 1: Get vote breakdown by identity mode
  const breakdownResult = await query(
    `SELECT
       identity_mode,
       SUM(CASE WHEN vote_option = 'yes' THEN 1 ELSE 0 END) as yes_count,
       SUM(CASE WHEN vote_option = 'no' THEN 1 ELSE 0 END) as no_count,
       SUM(CASE WHEN vote_option = 'abstain' THEN 1 ELSE 0 END) as abstain_count,
       COUNT(*) as total_count
     FROM governance_votes
     WHERE poll_id = $1
     GROUP BY identity_mode`,
    [pollId]
  );

  if (breakdownResult.rows.length === 0) {
    throw new Error('No votes found for this poll');
  }

  // Parse results by identity mode
  let trueSelfData = { yes_count: 0, no_count: 0, abstain_count: 0, total_count: 0 };
  let shadowData = { yes_count: 0, no_count: 0, abstain_count: 0, total_count: 0 };

  for (const row of breakdownResult.rows) {
    if (row.identity_mode === 'true_self') {
      trueSelfData = row;
    } else if (row.identity_mode === 'shadow') {
      shadowData = row;
    }
  }

  // Step 2: Calculate percentages
  const trueSelfYesPercentage =
    trueSelfData.total_count > 0
      ? (trueSelfData.yes_count / trueSelfData.total_count) * 100
      : 0;

  const shadowYesPercentage =
    shadowData.total_count > 0 ? (shadowData.yes_count / shadowData.total_count) * 100 : 0;

  // Step 3: Calculate the gap (THE KEY METRIC)
  const publicVsPrivateGap = Math.abs(trueSelfYesPercentage - shadowYesPercentage);

  // Step 4: Calculate confidence intervals
  const trueSelfCI = calculateConfidenceInterval(
    trueSelfData.yes_count,
    trueSelfData.total_count
  );
  const shadowCI = calculateConfidenceInterval(shadowData.yes_count, shadowData.total_count);

  // Use average of both confidence intervals
  const avgConfidenceInterval = (trueSelfCI.plusMinus + shadowCI.plusMinus) / 2;

  // Step 5: Interpret the gap
  const gapInterpretation = interpretGap(publicVsPrivateGap, avgConfidenceInterval);

  // Step 6: Detect trend direction
  const trendDirection = detectTrend(trueSelfYesPercentage, shadowYesPercentage);

  // Step 7: Create snapshot
  const snapshot: Partial<ShadowConsensusSnapshot> = {
    governancePollId: pollId,

    trueSelfYesCount: trueSelfData.yes_count,
    trueSelfNoCount: trueSelfData.no_count,
    trueSelfAbstainCount: trueSelfData.abstain_count,

    shadowYesCount: shadowData.yes_count,
    shadowNoCount: shadowData.no_count,
    shadowAbstainCount: shadowData.abstain_count,

    trueSelfYesPercentage: parseFloat(trueSelfYesPercentage.toFixed(2)),
    shadowYesPercentage: parseFloat(shadowYesPercentage.toFixed(2)),

    publicVsPrivateGapPercentage: parseFloat(publicVsPrivateGap.toFixed(2)),
    gapInterpretation,

    confidenceIntervalPlusMinus: parseFloat(avgConfidenceInterval.toFixed(2)),
    sampleSize: trueSelfData.total_count + shadowData.total_count,

    trendDirection,
    notablePatterns: null,

    recordedAt: new Date(),
  };

  // Step 8: Store snapshot in database
  const result = await query<ShadowConsensusSnapshot>(
    `INSERT INTO shadow_consensus_snapshots (
      governance_poll_id,
      true_self_yes_count,
      true_self_no_count,
      true_self_abstain_count,
      shadow_yes_count,
      shadow_no_count,
      shadow_abstain_count,
      true_self_yes_percentage,
      shadow_yes_percentage,
      public_vs_private_gap_percentage,
      gap_interpretation,
      confidence_interval_plus_minus,
      sample_size,
      trend_direction
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (governance_poll_id)
    DO UPDATE SET
      true_self_yes_count = EXCLUDED.true_self_yes_count,
      true_self_no_count = EXCLUDED.true_self_no_count,
      true_self_abstain_count = EXCLUDED.true_self_abstain_count,
      shadow_yes_count = EXCLUDED.shadow_yes_count,
      shadow_no_count = EXCLUDED.shadow_no_count,
      shadow_abstain_count = EXCLUDED.shadow_abstain_count,
      true_self_yes_percentage = EXCLUDED.true_self_yes_percentage,
      shadow_yes_percentage = EXCLUDED.shadow_yes_percentage,
      public_vs_private_gap_percentage = EXCLUDED.public_vs_private_gap_percentage,
      gap_interpretation = EXCLUDED.gap_interpretation,
      confidence_interval_plus_minus = EXCLUDED.confidence_interval_plus_minus,
      sample_size = EXCLUDED.sample_size,
      trend_direction = EXCLUDED.trend_direction,
      recorded_at = NOW()
    RETURNING *`,
    [
      snapshot.governancePollId,
      snapshot.trueSelfYesCount,
      snapshot.trueSelfNoCount,
      snapshot.trueSelfAbstainCount,
      snapshot.shadowYesCount,
      snapshot.shadowNoCount,
      snapshot.shadowAbstainCount,
      snapshot.trueSelfYesPercentage,
      snapshot.shadowYesPercentage,
      snapshot.publicVsPrivateGapPercentage,
      snapshot.gapInterpretation,
      snapshot.confidenceIntervalPlusMinus,
      snapshot.sampleSize,
      snapshot.trendDirection,
    ]
  );

  // Step 9: Update poll with Shadow Consensus data
  await query(
    `UPDATE governance_polls
     SET shadow_consensus_percentage = $1,
         consensus_confidence_interval = $2,
         public_vs_private_gap = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [
      snapshot.shadowYesPercentage,
      snapshot.confidenceIntervalPlusMinus,
      snapshot.publicVsPrivateGapPercentage,
      pollId,
    ]
  );

  return result.rows[0];
}

// ============================================================================
// Confidence Interval Calculation
// ============================================================================

/**
 * Calculates 95% confidence interval for proportion
 *
 * Formula: CI = z × √(p(1-p)/n)
 * Where:
 * - z = 1.96 (for 95% confidence)
 * - p = proportion (yes votes / total votes)
 * - n = sample size (total votes)
 *
 * Example:
 * - 2,010 yes out of 3,000 total
 * - p = 0.67
 * - CI = 1.96 × √(0.67 × 0.33 / 3000) = ±1.68%
 */
function calculateConfidenceInterval(yesCount: number, totalCount: number): ConfidenceInterval {
  if (totalCount === 0) {
    return { percentage: 0, plusMinus: 0, sampleSize: 0 };
  }

  const p = yesCount / totalCount;
  const z = 1.96; // 95% confidence level

  // CI = z × √(p(1-p)/n)
  const ci = z * Math.sqrt((p * (1 - p)) / totalCount);
  const ciPercentage = ci * 100;

  return {
    percentage: parseFloat((p * 100).toFixed(2)),
    plusMinus: parseFloat(ciPercentage.toFixed(2)),
    sampleSize: totalCount,
  };
}

// ============================================================================
// Gap Interpretation
// ============================================================================

/**
 * Interprets the Shadow Consensus gap
 *
 * Rules:
 * - Gap < CI: "aligned" (difference might be random noise)
 * - Gap < 10%: "slight_divergence"
 * - Gap 10-20%: "moderate_divergence"
 * - Gap > 20%: "significant_divergence"
 */
function interpretGap(gapPercentage: number, confidenceInterval: number): string {
  if (gapPercentage < confidenceInterval) {
    return 'aligned'; // Not statistically significant
  } else if (gapPercentage < 10) {
    return 'slight_divergence';
  } else if (gapPercentage < 20) {
    return 'moderate_divergence';
  } else {
    return 'significant_divergence';
  }
}

/**
 * Detects trend direction
 *
 * - Shadow > True Self: "shadow_more_confident"
 * - True Self > Shadow: "public_more_confident"
 * - Similar: "stable"
 */
function detectTrend(trueSelfPercentage: number, shadowPercentage: number): string {
  const diff = shadowPercentage - trueSelfPercentage;

  if (Math.abs(diff) < 3) {
    return 'stable';
  } else if (diff > 0) {
    return 'shadow_more_confident';
  } else {
    return 'public_more_confident';
  }
}

// ============================================================================
// Get Shadow Consensus
// ============================================================================

/**
 * Retrieves Shadow Consensus snapshot for a poll
 */
export async function getShadowConsensus(pollId: string): Promise<ShadowConsensusSnapshot | null> {
  const result = await query<ShadowConsensusSnapshot>(
    `SELECT * FROM shadow_consensus_snapshots WHERE governance_poll_id = $1`,
    [pollId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Gets detailed Shadow Consensus analysis with demographic breakdowns
 */
export async function getDetailedConsensusAnalysis(
  pollId: string
): Promise<ShadowConsensusResponse> {
  const snapshot = await getShadowConsensus(pollId);

  if (!snapshot) {
    throw new Error('Shadow Consensus not calculated for this poll');
  }

  // Get poll title
  const pollResult = await query(
    `SELECT title FROM governance_polls WHERE id = $1`,
    [pollId]
  );

  const pollTitle = pollResult.rows[0]?.title || 'Unknown Poll';

  // Get demographic breakdown by Light Score
  const demographicResult = await query(
    `SELECT
       CASE
         WHEN light_score_at_vote_time < 40 THEN '0-40'
         WHEN light_score_at_vote_time < 70 THEN '40-70'
         ELSE '70-100'
       END as light_score_range,
       identity_mode,
       SUM(CASE WHEN vote_option = 'yes' THEN 1 ELSE 0 END) as yes_count,
       COUNT(*) as total_count
     FROM governance_votes
     WHERE poll_id = $1 AND light_score_at_vote_time IS NOT NULL
     GROUP BY light_score_range, identity_mode
     ORDER BY light_score_range`,
    [pollId]
  );

  // Calculate gap per demographic
  const byLightScore: Array<{ lightScoreRange: string; gap: number }> = [];
  const demographics: Record<string, any> = {};

  for (const row of demographicResult.rows) {
    const key = row.light_score_range;
    if (!demographics[key]) {
      demographics[key] = { trueSelf: { yes: 0, total: 0 }, shadow: { yes: 0, total: 0 } };
    }

    if (row.identity_mode === 'true_self') {
      demographics[key].trueSelf = { yes: row.yes_count, total: row.total_count };
    } else {
      demographics[key].shadow = { yes: row.yes_count, total: row.total_count };
    }
  }

  for (const [range, data] of Object.entries(demographics)) {
    const tsPercent = data.trueSelf.total > 0 ? (data.trueSelf.yes / data.trueSelf.total) * 100 : 0;
    const shPercent = data.shadow.total > 0 ? (data.shadow.yes / data.shadow.total) * 100 : 0;
    const gap = Math.abs(tsPercent - shPercent);

    byLightScore.push({
      lightScoreRange: range,
      gap: parseFloat(gap.toFixed(1)),
    });
  }

  // Build response
  const response: ShadowConsensusResponse = {
    pollId,
    pollTitle,

    trueSelfBreakdown: {
      yesCount: snapshot.trueSelfYesCount,
      noCount: snapshot.trueSelfNoCount,
      abstainCount: snapshot.trueSelfAbstainCount,
      yesPercentage: snapshot.trueSelfYesPercentage,
    },

    shadowBreakdown: {
      yesCount: snapshot.shadowYesCount,
      noCount: snapshot.shadowNoCount,
      abstainCount: snapshot.shadowAbstainCount,
      yesPercentage: snapshot.shadowYesPercentage,
    },

    gapAnalysis: {
      gapPercentage: snapshot.publicVsPrivateGapPercentage,
      gapInterpretation: snapshot.gapInterpretation || 'unknown',
      likelyCause: determineLikelyCause(snapshot),
    },

    demographicAnalysis: {
      byLightScore,
    },
  };

  return response;
}

/**
 * Determines likely cause of gap based on data
 */
function determineLikelyCause(snapshot: ShadowConsensusSnapshot): string {
  const gap = snapshot.publicVsPrivateGapPercentage;
  const trueSelf = snapshot.trueSelfYesPercentage;
  const shadow = snapshot.shadowYesPercentage;

  if (gap < 5) {
    return 'Public and private beliefs are well-aligned';
  } else if (shadow > trueSelf) {
    return 'Authentic selves are more confident/supportive than public personas - possible social pressure or self-censorship';
  } else {
    return 'Public personas are more confident/supportive than authentic selves - possible virtue signaling or conformity';
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  calculateShadowConsensus,
  getShadowConsensus,
  getDetailedConsensusAnalysis,
  calculateConfidenceInterval,
};
