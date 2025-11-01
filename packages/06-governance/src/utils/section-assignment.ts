/**
 * Module 06: Governance - Section Assignment Algorithm
 * Deterministic but unpredictable section assignment for voting
 */

import crypto from 'crypto';
import { IdentityMode, SectionMultipliers, SectionAssignmentInput } from '../types';

// ============================================================================
// Section Assignment
// ============================================================================

/**
 * Assigns a voter to one of 7 sections deterministically but unpredictably
 *
 * Algorithm:
 * 1. Generate deterministic hash from user_id + poll_id + poll_start + identity_mode
 * 2. Convert hash to section number (1-7)
 * 3. Return section assignment
 *
 * Properties:
 * - Deterministic: Same inputs always produce same output
 * - Unpredictable: User can't predict section before poll is created
 * - Gaming-resistant: Can't strategically choose section
 * - Fair: Averages to ~14.3% per section over many polls
 */
export function assignSection(input: SectionAssignmentInput): number {
  const { userId, pollId, pollStartTimestamp, identityMode } = input;

  // Step 1: Create hash input string
  const hashInput = `${userId}${pollId}${pollStartTimestamp.toISOString()}${identityMode}`;

  // Step 2: Generate SHA256 hash
  const hash = crypto.createHash('sha256').update(hashInput).digest();

  // Step 3: Convert first 8 bytes of hash to BigInt
  const hashBigInt = BigInt('0x' + hash.slice(0, 8).toString('hex'));

  // Step 4: Modulo 7 to get 0-6, then add 1 to get 1-7
  const section = Number(hashBigInt % 7n) + 1;

  return section;
}

// ============================================================================
// Generate Section Multipliers
// ============================================================================

/**
 * Generates random multipliers for each section when poll is created
 *
 * Multipliers range from 0.7 to 1.5 (configurable via env vars)
 * - Lower multipliers (0.7-0.9): Reduces vote weight
 * - 1.0: Neutral
 * - Higher multipliers (1.1-1.5): Amplifies vote weight
 *
 * Why random multipliers:
 * - Prevents whales from dominating any single section
 * - Forces voting power distribution across sections
 * - Averages to ~1.0 over many polls
 */
export function generateSectionMultipliers(): SectionMultipliers {
  const min = parseFloat(process.env.SECTION_MULTIPLIER_MIN || '0.7');
  const max = parseFloat(process.env.SECTION_MULTIPLIER_MAX || '1.5');

  const multipliers: SectionMultipliers = {
    '1': randomFloat(min, max),
    '2': randomFloat(min, max),
    '3': randomFloat(min, max),
    '4': randomFloat(min, max),
    '5': randomFloat(min, max),
    '6': randomFloat(min, max),
    '7': randomFloat(min, max),
  };

  return multipliers;
}

/**
 * Helper: Generate random float between min and max (inclusive)
 */
function randomFloat(min: number, max: number): number {
  const randomValue = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
  const result = min + randomValue * (max - min);

  // Round to 2 decimal places (e.g., 0.87, 1.23)
  return Math.round(result * 100) / 100;
}

// ============================================================================
// Get Section Multiplier from Poll
// ============================================================================

/**
 * Retrieves the multiplier for a specific section from poll's multipliers
 */
export function getSectionMultiplier(
  sectionMultipliers: SectionMultipliers,
  section: number
): number {
  if (section < 1 || section > 7) {
    throw new Error(`Invalid section number: ${section}. Must be between 1 and 7.`);
  }

  const sectionKey = section.toString() as keyof SectionMultipliers;
  return sectionMultipliers[sectionKey];
}

// ============================================================================
// Calculate Final Vote Weight
// ============================================================================

/**
 * Calculates the final weighted vote value
 *
 * Formula: base_vote_weight (1000) × section_multiplier
 *
 * Example:
 * - Section multiplier: 1.5x
 * - Base weight: 1000
 * - Final weight: 1500
 *
 * Display to user by dividing by 1000: 1.5 effective votes
 */
export function calculateFinalVoteWeight(
  baseWeight: number,
  sectionMultiplier: number
): number {
  return Math.floor(baseWeight * sectionMultiplier);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates section multipliers are within allowed range
 */
export function validateSectionMultipliers(
  multipliers: SectionMultipliers
): boolean {
  const min = parseFloat(process.env.SECTION_MULTIPLIER_MIN || '0.7');
  const max = parseFloat(process.env.SECTION_MULTIPLIER_MAX || '1.5');

  const values = Object.values(multipliers);

  for (const value of values) {
    if (value < min || value > max) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Calculates average multiplier across all sections
 * Should be close to 1.0 for fairness
 */
export function calculateAverageMultiplier(
  multipliers: SectionMultipliers
): number {
  const values = Object.values(multipliers);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Generates statistics about section distribution in a poll
 */
export interface SectionDistributionStats {
  section: number;
  voteCount: number;
  percentage: number;
  multiplier: number;
  weightedVotes: number;
}

export function calculateSectionDistribution(
  votes: Array<{ assignedSection: number; finalVoteWeight: number }>,
  multipliers: SectionMultipliers
): SectionDistributionStats[] {
  const totalVotes = votes.length;
  const distribution: Record<number, { count: number; weightedTotal: number }> = {};

  // Initialize all sections
  for (let i = 1; i <= 7; i++) {
    distribution[i] = { count: 0, weightedTotal: 0 };
  }

  // Count votes per section
  for (const vote of votes) {
    const section = vote.assignedSection;
    distribution[section].count++;
    distribution[section].weightedTotal += vote.finalVoteWeight;
  }

  // Build stats array
  const stats: SectionDistributionStats[] = [];
  for (let i = 1; i <= 7; i++) {
    stats.push({
      section: i,
      voteCount: distribution[i].count,
      percentage: totalVotes > 0 ? (distribution[i].count / totalVotes) * 100 : 0,
      multiplier: getSectionMultiplier(multipliers, i),
      weightedVotes: distribution[i].weightedTotal,
    });
  }

  return stats;
}

// ============================================================================
// Export
// ============================================================================

export default {
  assignSection,
  generateSectionMultipliers,
  getSectionMultiplier,
  calculateFinalVoteWeight,
  validateSectionMultipliers,
  calculateAverageMultiplier,
  calculateSectionDistribution,
};
