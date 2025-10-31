/**
 * Module 04: Economy - Light Score Service
 *
 * Manages user reputation scores (0-100) - Integration point for Pentos AI
 */

import { PoolClient } from 'pg';
import {
  UpdateLightScoreDTO,
  LightScore,
  LightScoreEvent,
  LightScoreHistoryResponse,
} from '../types/economy.types';
import { transaction, query, findOne } from '../utils/database';

// ============================================================================
// Light Score Management
// ============================================================================

/**
 * Update Light Score (called by Pentos AI)
 */
export async function updateLightScore(
  data: UpdateLightScoreDTO
): Promise<{ oldScore: number; newScore: number; change: number }> {
  const {
    userId,
    eventType,
    scoreChange,
    reasoning,
    confidence,
    referenceType,
    referenceId,
  } = data;

  // Validate confidence (0-1 scale)
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  return await transaction(async (client: PoolClient) => {
    // Get current score
    const currentScoreResult = await client.query<LightScore>(
      `SELECT * FROM light_scores WHERE user_id = $1`,
      [userId]
    );

    let currentScore: LightScore;

    if (currentScoreResult.rows.length === 0) {
      // Initialize Light Score if doesn't exist
      const initResult = await client.query<LightScore>(
        `INSERT INTO light_scores (user_id, current_score)
         VALUES ($1, 50.00)
         RETURNING *`,
        [userId]
      );
      currentScore = initResult.rows[0];
    } else {
      currentScore = currentScoreResult.rows[0];
    }

    // Calculate new score (bounded 0-100)
    const oldScoreValue = parseFloat(currentScore.current_score.toString());
    const newScoreValue = Math.max(0, Math.min(100, oldScoreValue + scoreChange));

    // Determine trend
    const trendDirection =
      scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'stable';

    // Update score
    await client.query(
      `UPDATE light_scores
       SET current_score = $1,
           trend_direction = $2,
           trend_velocity = $3,
           last_calculated_at = NOW(),
           calculation_count = calculation_count + 1,
           updated_at = NOW()
       WHERE user_id = $4`,
      [newScoreValue, trendDirection, Math.abs(scoreChange), userId]
    );

    // Log event
    await client.query(
      `INSERT INTO light_score_events (
        user_id, event_type, score_change,
        old_score, new_score,
        reference_type, reference_id,
        pentos_reasoning, pentos_confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        eventType,
        scoreChange,
        oldScoreValue,
        newScoreValue,
        referenceType || null,
        referenceId || null,
        reasoning,
        confidence,
      ]
    );

    return {
      oldScore: oldScoreValue,
      newScore: newScoreValue,
      change: scoreChange,
    };
  });
}

/**
 * Get Light Score for a user
 */
export async function getLightScore(userId: string): Promise<LightScore | null> {
  return await findOne<LightScore>('light_scores', { user_id: userId });
}

/**
 * Get Light Score history (all events that changed the score)
 */
export async function getLightScoreHistory(
  userId: string,
  limit: number = 50
): Promise<LightScoreHistoryResponse> {
  // Get current score
  const currentScoreResult = await query<LightScore>(
    `SELECT current_score FROM light_scores WHERE user_id = $1`,
    [userId]
  );

  const currentScore =
    currentScoreResult.rows.length > 0
      ? parseFloat(currentScoreResult.rows[0].current_score.toString())
      : 50.0;

  // Get history
  const historyResult = await query<LightScoreEvent>(
    `SELECT event_type, score_change, old_score, new_score,
            occurred_at, pentos_reasoning
     FROM light_score_events
     WHERE user_id = $1
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return {
    current_score: currentScore,
    history: historyResult.rows.map((event) => ({
      event_type: event.event_type,
      score_change: parseFloat(event.score_change.toString()),
      old_score: parseFloat(event.old_score.toString()),
      new_score: parseFloat(event.new_score.toString()),
      occurred_at: event.occurred_at,
      reasoning: event.pentos_reasoning,
    })),
  };
}

/**
 * Pentos AI analyzes user actions and updates Light Score
 * This is the integration point for the Pentos module (Module 13)
 */
export async function pentosAnalyzeAction(
  userId: string,
  actionType: string,
  context: any
): Promise<void> {
  // This function will be called by Pentos AI to update Light Score
  // The actual algorithm is SECRET and managed by Pentos

  // Example logic (this would be replaced by actual Pentos AI in Module 13):

  switch (actionType) {
    case 'helpful_comment':
      await updateLightScore({
        userId,
        eventType: 'helpful_comment',
        scoreChange: 2.5,
        reasoning: 'Comment received multiple positive reactions',
        confidence: 0.85,
        referenceType: context.referenceType,
        referenceId: context.referenceId,
      });
      break;

    case 'spam_detected':
      await updateLightScore({
        userId,
        eventType: 'spam_detected',
        scoreChange: -5.0,
        reasoning: 'Content flagged as spam by multiple users',
        confidence: 0.92,
        referenceType: context.referenceType,
        referenceId: context.referenceId,
      });
      break;

    case 'verification_completed':
      await updateLightScore({
        userId,
        eventType: 'verification_completed',
        scoreChange: 10.0,
        reasoning: 'Successfully completed Proof of Humanity verification',
        confidence: 1.0,
        referenceType: 'verification',
        referenceId: context.verificationId,
      });
      break;

    case 'governance_participation':
      await updateLightScore({
        userId,
        eventType: 'governance_participation',
        scoreChange: 1.5,
        reasoning: 'Participated in governance poll with conviction',
        confidence: 0.75,
        referenceType: 'poll',
        referenceId: context.pollId,
      });
      break;

    case 'quality_contribution':
      await updateLightScore({
        userId,
        eventType: 'quality_contribution',
        scoreChange: 3.0,
        reasoning: 'Post recognized as high-quality by community',
        confidence: 0.88,
        referenceType: context.referenceType,
        referenceId: context.referenceId,
      });
      break;

    // More cases will be added by Pentos module
    default:
      console.log(`Unknown action type for Light Score: ${actionType}`);
  }
}

/**
 * Update component scores (quality, helpfulness, consistency, trust)
 * Called by Pentos to maintain detailed breakdown
 */
export async function updateComponentScores(
  userId: string,
  components: {
    quality?: number;
    helpfulness?: number;
    consistency?: number;
    trust?: number;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (components.quality !== undefined) {
    updates.push(`quality_score = $${paramIndex++}`);
    values.push(Math.max(0, Math.min(100, components.quality)));
  }

  if (components.helpfulness !== undefined) {
    updates.push(`helpfulness_score = $${paramIndex++}`);
    values.push(Math.max(0, Math.min(100, components.helpfulness)));
  }

  if (components.consistency !== undefined) {
    updates.push(`consistency_score = $${paramIndex++}`);
    values.push(Math.max(0, Math.min(100, components.consistency)));
  }

  if (components.trust !== undefined) {
    updates.push(`trust_score = $${paramIndex++}`);
    values.push(Math.max(0, Math.min(100, components.trust)));
  }

  if (updates.length === 0) {
    return;
  }

  updates.push('updated_at = NOW()');
  values.push(userId);

  await query(
    `UPDATE light_scores
     SET ${updates.join(', ')}
     WHERE user_id = $${paramIndex}`,
    values
  );
}

/**
 * Recalculate historical scores (for analytics)
 * Called daily to update score_7d_ago, score_30d_ago, score_90d_ago
 */
export async function updateHistoricalScores(): Promise<void> {
  await transaction(async (client: PoolClient) => {
    // Update 7-day historical score
    await client.query(`
      UPDATE light_scores ls
      SET score_7d_ago = (
        SELECT new_score
        FROM light_score_events lse
        WHERE lse.user_id = ls.user_id
          AND lse.occurred_at <= NOW() - INTERVAL '7 days'
        ORDER BY lse.occurred_at DESC
        LIMIT 1
      ),
      score_30d_ago = (
        SELECT new_score
        FROM light_score_events lse
        WHERE lse.user_id = ls.user_id
          AND lse.occurred_at <= NOW() - INTERVAL '30 days'
        ORDER BY lse.occurred_at DESC
        LIMIT 1
      ),
      score_90d_ago = (
        SELECT new_score
        FROM light_score_events lse
        WHERE lse.user_id = ls.user_id
          AND lse.occurred_at <= NOW() - INTERVAL '90 days'
        ORDER BY lse.occurred_at DESC
        LIMIT 1
      ),
      updated_at = NOW()
    `);
  });
}

export default {
  updateLightScore,
  getLightScore,
  getLightScoreHistory,
  pentosAnalyzeAction,
  updateComponentScores,
  updateHistoricalScores,
};
