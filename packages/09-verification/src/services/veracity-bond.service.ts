/**
 * Veracity Bond Service
 * Module 09: Verification
 *
 * Allows users to stake Gratium on claims being truthful
 * Creates economic incentives for honest behavior
 */

import { query, queryOne } from '../database';
import {
  VeracityBond,
  BondChallenge,
  BondStatus,
  BondResolution,
  IdentityMode,
  BondType,
  ResolutionOutcome,
} from '../types';
import { randomUUID } from 'crypto';

const BOND_CONFIG = {
  minimumAmount: 100n,
  maximumAmount: 1000000n,
  defaultDuration: 30 * 24 * 60 * 60, // 30 days in seconds
  slashingPercentage: 50,
  challengeWindow: 7 * 24 * 60 * 60, // 7 days in seconds
};

export const veracityBondService = {
  /**
   * Create a new veracity bond
   */
  async createBond(
    userId: string,
    identityMode: IdentityMode,
    targetType: string,
    targetId: string,
    amount: bigint,
    claimText?: string,
    confidence: number = 5
  ): Promise<VeracityBond> {
    // Validate amount
    if (amount < BOND_CONFIG.minimumAmount) {
      throw new Error(
        `Bond amount must be at least ${BOND_CONFIG.minimumAmount} Gratium`
      );
    }
    if (amount > BOND_CONFIG.maximumAmount) {
      throw new Error(
        `Bond amount cannot exceed ${BOND_CONFIG.maximumAmount} Gratium`
      );
    }

    // Validate confidence
    if (confidence < 1 || confidence > 10) {
      throw new Error('Confidence level must be between 1 and 10');
    }

    // Check user exists
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    // Create bond
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + BOND_CONFIG.defaultDuration);

    const result = await query<VeracityBond>(
      `INSERT INTO veracity_bonds (
        user_id, identity_mode, bond_type, target_id, target_type,
        gratium_amount, status, claim_text, confidence_level, expires_at
      ) VALUES ($1, $2, 'claim', $3, $4, $5, 'active', $6, $7, $8)
       RETURNING *`,
      [userId, identityMode, targetId, targetType, amount, claimText, confidence, expiresAt]
    );

    return result.rows[0];
  },

  /**
   * Get a specific bond
   */
  async getBond(bondId: string): Promise<VeracityBond | null> {
    return await queryOne<VeracityBond>(
      'SELECT * FROM veracity_bonds WHERE id = $1',
      [bondId]
    );
  },

  /**
   * Get user's bonds
   */
  async getUserBonds(
    userId: string,
    identityMode?: IdentityMode,
    status?: BondStatus
  ): Promise<VeracityBond[]> {
    let sql = 'SELECT * FROM veracity_bonds WHERE user_id = $1';
    const params: any[] = [userId];

    if (identityMode) {
      params.push(identityMode);
      sql += ` AND identity_mode = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query<VeracityBond>(sql, params);
    return result.rows;
  },

  /**
   * Get all bonds for a target
   */
  async getTargetBonds(targetType: string, targetId: string): Promise<VeracityBond[]> {
    const result = await query<VeracityBond>(
      `SELECT * FROM veracity_bonds
       WHERE target_type = $1 AND target_id = $2 AND status = 'active'
       ORDER BY created_at DESC`,
      [targetType, targetId]
    );
    return result.rows;
  },

  /**
   * Challenge a bond (user stakes Gratium to challenge)
   */
  async challengeBond(
    bondId: string,
    challengerId: string,
    amount: bigint,
    reason: string,
    evidence?: Record<string, any>
  ): Promise<BondChallenge> {
    // Get the bond
    const bond = await this.getBond(bondId);
    if (!bond) {
      throw new Error('Bond not found');
    }

    if (bond.status !== 'active') {
      throw new Error(`Cannot challenge inactive bond (status: ${bond.status})`);
    }

    // Check challenge amount
    if (amount < bond.gratium_amount) {
      throw new Error(
        `Challenge amount must match or exceed bond amount`
      );
    }

    // Create challenge
    const result = await query<BondChallenge>(
      `INSERT INTO bond_challenges (bond_id, challenger_id, challenge_amount, challenge_reason, evidence, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [bondId, challengerId, amount, reason, JSON.stringify(evidence || {})]
    );

    // Update bond status
    await query(
      "UPDATE veracity_bonds SET status = 'challenged', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [bondId]
    );

    return result.rows[0];
  },

  /**
   * Resolve a bond as truthful or false
   */
  async resolveBond(
    bondId: string,
    truthful: boolean,
    evidence: Record<string, any>
  ): Promise<BondResolution> {
    // Get the bond
    const bond = await this.getBond(bondId);
    if (!bond) {
      throw new Error('Bond not found');
    }

    if (bond.status !== 'active' && bond.status !== 'challenged') {
      throw new Error(`Cannot resolve bond with status: ${bond.status}`);
    }

    const outcome: ResolutionOutcome = truthful ? 'truthful' : 'false';
    let slashedAmount = 0n;

    if (!truthful) {
      // Slash the bond
      slashedAmount = (bond.gratium_amount * BigInt(BOND_CONFIG.slashingPercentage)) / 100n;

      // Get any challenges and distribute slashed funds
      const challenges = await query<BondChallenge>(
        'SELECT * FROM bond_challenges WHERE bond_id = $1 AND status = $2',
        [bondId, 'pending']
      );

      const challengerIds = challenges.rows.map((c: BondChallenge) => c.challenger_id);

      // Update bond with resolution
      await query(
        `UPDATE veracity_bonds
         SET status = 'resolved_false',
             resolved_at = CURRENT_TIMESTAMP,
             slashed_amount = $1,
             resolution_evidence = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [slashedAmount.toString(), JSON.stringify(evidence), bondId]
      );

      // Update challenges to accepted
      if (challenges.rows.length > 0) {
        await query(
          'UPDATE bond_challenges SET status = $1, resolved_at = CURRENT_TIMESTAMP WHERE bond_id = $2',
          ['accepted', bondId]
        );
      }

      return {
        bondId,
        outcome,
        evidence,
        slashedAmount,
        distributedTo: challengerIds,
      };
    } else {
      // Bond is truthful - update status
      await query(
        `UPDATE veracity_bonds
         SET status = 'resolved_truthful',
             resolved_at = CURRENT_TIMESTAMP,
             resolution_evidence = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(evidence), bondId]
      );

      // Reject any challenges
      await query(
        'UPDATE bond_challenges SET status = $1, resolved_at = CURRENT_TIMESTAMP WHERE bond_id = $2',
        ['rejected', bondId]
      );

      return {
        bondId,
        outcome,
        evidence,
        slashedAmount: 0n,
        distributedTo: [],
      };
    }
  },

  /**
   * Get total staked amount on a target
   */
  async getTotalStaked(targetType: string, targetId: string): Promise<bigint> {
    const result = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(gratium_amount), '0') as total
       FROM veracity_bonds
       WHERE target_type = $1 AND target_id = $2 AND status = 'active'`,
      [targetType, targetId]
    );

    return BigInt(result?.total || '0');
  },

  /**
   * Expire old bonds
   */
  async expireOldBonds(): Promise<number> {
    const result = await query(
      `UPDATE veracity_bonds
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP`
    );

    return result.rowCount || 0;
  },

  /**
   * Get active challenges for a bond
   */
  async getActiveChallenges(bondId: string): Promise<BondChallenge[]> {
    const result = await query<BondChallenge>(
      `SELECT * FROM bond_challenges
       WHERE bond_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [bondId]
    );

    return result.rows;
  },
};

export default veracityBondService;
