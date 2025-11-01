/**
 * Module 06: Governance - Timing Jitter Utility
 * Vote privacy protection through random time display delays
 */

import crypto from 'crypto';

// ============================================================================
// Timing Jitter Configuration
// ============================================================================

const MAX_JITTER_SECONDS = parseInt(
  process.env.VOTE_TIMING_JITTER_MAX_SECONDS || '7200',
  10
); // Default: 2 hours

// ============================================================================
// Generate Timing Jitter
// ============================================================================

/**
 * Generates a random timing jitter (0 to MAX_JITTER_SECONDS)
 *
 * Purpose: Prevents correlation attacks via timing analysis
 * - If Alice votes True Self at 10:00:00 and Shadow at 10:00:03
 * - Without jitter: Both show similar times (LINKABLE!)
 * - With jitter: Show 10:47 and 11:09 (unrelated)
 *
 * @returns Random jitter in seconds (0 to 7200 by default)
 */
export function generateTimingJitter(): number {
  // Use crypto.randomBytes for secure randomness
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);

  // Map to 0..MAX_JITTER_SECONDS range
  const jitterSeconds = Math.floor((randomValue / 0xffffffff) * MAX_JITTER_SECONDS);

  return jitterSeconds;
}

// ============================================================================
// Apply Timing Jitter
// ============================================================================

/**
 * Applies timing jitter to a vote timestamp
 *
 * @param actualVoteTime - Real time when user voted
 * @param pollEndTime - When poll closes (cap displayed time)
 * @returns Object with displayed time and jitter applied
 */
export function applyTimingJitter(
  actualVoteTime: Date,
  pollEndTime: Date
): { displayedVoteTime: Date; timingJitterSeconds: number } {
  const jitterSeconds = generateTimingJitter();

  // Add jitter to actual vote time
  const displayedVoteTime = new Date(actualVoteTime.getTime() + jitterSeconds * 1000);

  // Cap displayed time at poll end time (edge case: vote at 23:59:59)
  if (displayedVoteTime > pollEndTime) {
    return {
      displayedVoteTime: pollEndTime,
      timingJitterSeconds: Math.floor((pollEndTime.getTime() - actualVoteTime.getTime()) / 1000),
    };
  }

  return {
    displayedVoteTime,
    timingJitterSeconds: jitterSeconds,
  };
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Calculates jitter distribution statistics for analysis
 */
export interface JitterStats {
  minJitterSeconds: number;
  maxJitterSeconds: number;
  avgJitterSeconds: number;
  medianJitterSeconds: number;
}

export function calculateJitterStats(jitters: number[]): JitterStats {
  if (jitters.length === 0) {
    return {
      minJitterSeconds: 0,
      maxJitterSeconds: 0,
      avgJitterSeconds: 0,
      medianJitterSeconds: 0,
    };
  }

  const sorted = [...jitters].sort((a, b) => a - b);
  const sum = jitters.reduce((acc, val) => acc + val, 0);

  return {
    minJitterSeconds: sorted[0],
    maxJitterSeconds: sorted[sorted.length - 1],
    avgJitterSeconds: sum / jitters.length,
    medianJitterSeconds: sorted[Math.floor(sorted.length / 2)],
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates that jitter is within acceptable range
 */
export function validateJitter(jitterSeconds: number): boolean {
  return jitterSeconds >= 0 && jitterSeconds <= MAX_JITTER_SECONDS;
}

/**
 * Formats jitter duration for display
 * Example: 3847 seconds -> "1h 4m 7s"
 */
export function formatJitterDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// ============================================================================
// Export
// ============================================================================

export default {
  generateTimingJitter,
  applyTimingJitter,
  calculateJitterStats,
  validateJitter,
  formatJitterDuration,
  MAX_JITTER_SECONDS,
};
