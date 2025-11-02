/**
 * Proof of Humanity Service
 * Module 09: Verification
 *
 * Multi-factor verification system that ensures users are real humans
 * Combines behavioral, biometric, social, temporal, and economic signals
 */

import { query, queryOne } from '../database';
import {
  ProofOfHumanity,
  PoHScores,
  PoHLevel,
  VerificationStatus,
  VerificationMethod,
  PoHSession,
  VerificationResult,
  PoHStatus,
} from '../types';
import { randomUUID } from 'crypto';

export const proofOfHumanityService = {
  /**
   * Initiate a verification session for a user
   */
  async initiateVerification(
    userId: string,
    identityMode: 'true_self' | 'shadow'
  ): Promise<PoHSession> {
    // Check if user exists
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    // Create or get PoH record
    let poh = await queryOne<ProofOfHumanity>(
      'SELECT * FROM proof_of_humanity WHERE user_id = $1 AND identity_mode = $2',
      [userId, identityMode]
    );

    if (!poh) {
      const result = await query<ProofOfHumanity>(
        `INSERT INTO proof_of_humanity (user_id, identity_mode, level, status)
         VALUES ($1, $2, 0, 'pending')
         RETURNING *`,
        [userId, identityMode]
      );
      poh = result.rows[0];
    }

    if (!poh) {
      throw new Error('Failed to initialize PoH record');
    }

    // Determine required methods based on current level
    const requiredMethods = proofOfHumanityService.getRequiredMethods(poh.level);
    const completedMethods = (poh.methods_completed as VerificationMethod[]) || [];

    const sessionId = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour session

    return {
      sessionId,
      userId,
      identityMode,
      requiredMethods: requiredMethods.filter(m => !completedMethods.includes(m)),
      completedMethods,
      expiresAt,
      score: proofOfHumanityService.calculateOverallScore({
        behavioral: poh.behavioral_score,
        biometric: poh.biometric_score,
        social: poh.social_score,
        temporal: poh.temporal_score,
        economic: poh.economic_score,
      }),
    };
  },

  /**
   * Submit a verification method and update scores
   */
  async submitVerificationMethod(
    userId: string,
    identityMode: 'true_self' | 'shadow',
    method: VerificationMethod,
    methodData: Record<string, any>
  ): Promise<VerificationResult> {
    // Get current PoH record
    const poh = await queryOne<ProofOfHumanity>(
      'SELECT * FROM proof_of_humanity WHERE user_id = $1 AND identity_mode = $2',
      [userId, identityMode]
    );

    if (!poh) {
      throw new Error('PoH record not found');
    }

    let score = 0;
    let success = false;

    // Score based on verification method
    switch (method) {
      case 'captcha':
        score = methodData.passed ? 0.7 : 0;
        success = methodData.passed;
        break;
      case 'email':
        score = 0.8;
        success = true;
        break;
      case 'phone':
        score = 0.85;
        success = true;
        break;
      case 'worldcoin':
        score = 0.95;
        success = true;
        break;
      case 'vouching':
        score = methodData.voucherScore || 0.8;
        success = true;
        break;
      case 'economic':
        score = methodData.hasBalance ? 0.7 : 0;
        success = methodData.hasBalance;
        break;
      default:
        return {
          success: false,
          score: 0,
          error: `Unknown verification method: ${method}`,
        };
    }

    // Record verification event
    if (success) {
      await query(
        `INSERT INTO humanity_verification_events (poh_id, method, result, score, evidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [poh.id, method, 'passed', score, JSON.stringify(methodData)]
      );

      // Update method-specific scores
      const updates: string[] = [];
      const params: any[] = [poh.id];

      if (['email', 'phone', 'worldcoin'].includes(method)) {
        updates.push(`behavioral_score = $${params.length + 1}`);
        params.push(score);
      }
      if (method === 'worldcoin') {
        updates.push(`biometric_score = $${params.length + 1}`);
        params.push(score);
      }
      if (['vouching'].includes(method)) {
        updates.push(`social_score = $${params.length + 1}`);
        params.push(score);
      }
      if (method === 'economic') {
        updates.push(`economic_score = $${params.length + 1}`);
        params.push(score);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        updates.push(`status = 'verified'`);

        const completedMethods = [...(poh.methods_completed || []), method];
        updates.push(`methods_completed = $${params.length + 1}`);
        params.push(completedMethods);

        await query(
          `UPDATE proof_of_humanity SET ${updates.join(', ')} WHERE id = $1`,
          params
        );
      }
    } else {
      await query(
        `INSERT INTO humanity_verification_events (poh_id, method, result, evidence)
         VALUES ($1, $2, $3, $4)`,
        [poh.id, method, 'failed', JSON.stringify(methodData)]
      );
    }

    // Check if level should be upgraded
    const updatedPoh = await queryOne<ProofOfHumanity>(
      'SELECT * FROM proof_of_humanity WHERE id = $1',
      [poh.id]
    );

    if (!updatedPoh) {
      throw new Error('Failed to retrieve updated PoH record');
    }

    const newLevel = proofOfHumanityService.calculateLevel(updatedPoh);
    if (newLevel > updatedPoh.level) {
      await query(
        'UPDATE proof_of_humanity SET level = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newLevel, poh.id]
      );
    }

    return {
      success,
      score,
      newLevel,
    };
  },

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(
    userId: string,
    identityMode: 'true_self' | 'shadow'
  ): Promise<PoHStatus> {
    const poh = await queryOne<ProofOfHumanity>(
      'SELECT * FROM proof_of_humanity WHERE user_id = $1 AND identity_mode = $2',
      [userId, identityMode]
    );

    if (!poh) {
      throw new Error('PoH record not found');
    }

    const scores: PoHScores = {
      behavioral: Number(poh.behavioral_score),
      biometric: Number(poh.biometric_score),
      social: Number(poh.social_score),
      temporal: Number(poh.temporal_score),
      economic: Number(poh.economic_score),
    };

    return {
      level: poh.level,
      status: poh.status as VerificationStatus,
      scores,
      expiresAt: poh.expires_at,
      canVote: poh.level >= 2,
      canStake: poh.level >= 1,
      canCreateMarkets: poh.level >= 2,
    };
  },

  /**
   * Check if a user has access to a feature
   */
  async checkAccess(userId: string, feature: string): Promise<boolean> {
    const poh = await queryOne<ProofOfHumanity>(
      'SELECT level FROM proof_of_humanity WHERE user_id = $1 AND identity_mode = $2',
      [userId, 'true_self']
    );

    if (!poh) return false;

    const featureRequirements: Record<string, PoHLevel> = {
      voting: 2,
      staking: 1,
      create_market: 2,
      create_bond: 1,
      challenge_bond: 2,
    };

    const requiredLevel = featureRequirements[feature] || 0;
    return poh.level >= requiredLevel;
  },

  /**
   * Helper: Calculate overall score from 5 factors
   */
  calculateOverallScore(scores: PoHScores): number {
    const values = Object.values(scores);
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  },

  /**
   * Helper: Get required methods for each level
   */
  getRequiredMethods(level: PoHLevel): VerificationMethod[] {
    const requirements: Record<PoHLevel, VerificationMethod[]> = {
      0: ['captcha', 'email'],
      1: ['phone'],
      2: ['worldcoin', 'vouching'],
      3: ['economic'],
      4: [],
      5: [],
    };

    return requirements[level] || [];
  },

  /**
   * Helper: Calculate level from scores
   */
  calculateLevel(poh: ProofOfHumanity): PoHLevel {
    const avgScore =
      (poh.behavioral_score +
        poh.biometric_score +
        poh.social_score +
        poh.temporal_score +
        poh.economic_score) /
      5;

    if (avgScore >= 0.9) return 5;
    if (avgScore >= 0.8) return 4;
    if (avgScore >= 0.7) return 3;
    if (avgScore >= 0.5) return 2;
    if (avgScore >= 0.2) return 1;
    return 0;
  },
};

export default proofOfHumanityService;
