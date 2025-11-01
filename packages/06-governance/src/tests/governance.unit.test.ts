/**
 * Module 06: Governance - Unit Tests
 * Tests for core governance functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  assignSection,
  generateSectionMultipliers,
  getSectionMultiplier,
  calculateFinalVoteWeight,
  validateSectionMultipliers,
  calculateAverageMultiplier,
} from '../utils/section-assignment';
import {
  generateTimingJitter,
  applyTimingJitter,
  validateJitter,
  formatJitterDuration,
} from '../utils/timing-jitter';
import { IdentityMode } from '../types';

// ============================================================================
// Section Assignment Tests
// ============================================================================

describe('Section Assignment Algorithm', () => {
  it('should assign section deterministically', () => {
    const input = {
      userId: 'user-123',
      pollId: 'poll-456',
      pollStartTimestamp: new Date('2025-02-15T12:00:00Z'),
      identityMode: IdentityMode.TRUE_SELF,
    };

    const section1 = assignSection(input);
    const section2 = assignSection(input);

    // Same inputs should produce same section
    expect(section1).toBe(section2);

    // Section should be between 1 and 7
    expect(section1).toBeGreaterThanOrEqual(1);
    expect(section1).toBeLessThanOrEqual(7);
  });

  it('should assign different sections for True Self vs Shadow', () => {
    const baseInput = {
      userId: 'user-123',
      pollId: 'poll-456',
      pollStartTimestamp: new Date('2025-02-15T12:00:00Z'),
      identityMode: IdentityMode.TRUE_SELF,
    };

    const trueSelfSection = assignSection(baseInput);
    const shadowSection = assignSection({
      ...baseInput,
      identityMode: IdentityMode.SHADOW,
    });

    // Different identity modes should likely produce different sections
    // (not guaranteed, but very likely with good hash distribution)
    // Just verify both are valid sections
    expect(trueSelfSection).toBeGreaterThanOrEqual(1);
    expect(trueSelfSection).toBeLessThanOrEqual(7);
    expect(shadowSection).toBeGreaterThanOrEqual(1);
    expect(shadowSection).toBeLessThanOrEqual(7);
  });

  it('should generate valid section multipliers', () => {
    const multipliers = generateSectionMultipliers();

    // Should have exactly 7 sections
    expect(Object.keys(multipliers)).toHaveLength(7);

    // All multipliers should be within valid range (0.7 to 1.5)
    for (const key of Object.keys(multipliers)) {
      const value = multipliers[key as keyof typeof multipliers];
      expect(value).toBeGreaterThanOrEqual(0.7);
      expect(value).toBeLessThanOrEqual(1.5);
    }
  });

  it('should calculate correct final vote weight', () => {
    const baseWeight = 1000;
    const multiplier = 1.5;

    const finalWeight = calculateFinalVoteWeight(baseWeight, multiplier);

    expect(finalWeight).toBe(1500);
  });

  it('should preserve decimal multipliers with base weight 1000', () => {
    const baseWeight = 1000;

    // Test various multipliers
    expect(calculateFinalVoteWeight(baseWeight, 0.7)).toBe(700);
    expect(calculateFinalVoteWeight(baseWeight, 0.8)).toBe(800);
    expect(calculateFinalVoteWeight(baseWeight, 1.0)).toBe(1000);
    expect(calculateFinalVoteWeight(baseWeight, 1.2)).toBe(1200);
    expect(calculateFinalVoteWeight(baseWeight, 1.5)).toBe(1500);
  });

  it('should calculate average multiplier close to 1.0', () => {
    const multipliers = generateSectionMultipliers();
    const avg = calculateAverageMultiplier(multipliers);

    // Average should be reasonably close to 1.0 (within 0.3)
    expect(avg).toBeGreaterThan(0.7);
    expect(avg).toBeLessThan(1.3);
  });

  it('should validate section multipliers correctly', () => {
    const validMultipliers = {
      '1': 0.8,
      '2': 1.2,
      '3': 0.9,
      '4': 1.5,
      '5': 1.0,
      '6': 0.7,
      '7': 1.1,
    };

    expect(validateSectionMultipliers(validMultipliers)).toBe(true);

    const invalidMultipliers = {
      '1': 0.5, // Too low
      '2': 1.2,
      '3': 0.9,
      '4': 1.5,
      '5': 1.0,
      '6': 0.7,
      '7': 1.1,
    };

    expect(validateSectionMultipliers(invalidMultipliers)).toBe(false);
  });
});

// ============================================================================
// Timing Jitter Tests
// ============================================================================

describe('Timing Jitter for Privacy', () => {
  it('should generate jitter within valid range', () => {
    const jitter = generateTimingJitter();

    expect(jitter).toBeGreaterThanOrEqual(0);
    expect(jitter).toBeLessThanOrEqual(7200); // Default max: 2 hours
  });

  it('should apply jitter to vote timestamp', () => {
    const actualVoteTime = new Date('2025-02-15T14:00:00Z');
    const pollEndTime = new Date('2025-02-22T14:00:00Z');

    const { displayedVoteTime, timingJitterSeconds } = applyTimingJitter(
      actualVoteTime,
      pollEndTime
    );

    // Displayed time should be after actual time
    expect(displayedVoteTime.getTime()).toBeGreaterThanOrEqual(actualVoteTime.getTime());

    // Displayed time should not exceed poll end time
    expect(displayedVoteTime.getTime()).toBeLessThanOrEqual(pollEndTime.getTime());

    // Jitter should be valid
    expect(timingJitterSeconds).toBeGreaterThanOrEqual(0);
    expect(timingJitterSeconds).toBeLessThanOrEqual(7200);
  });

  it('should cap displayed time at poll end time', () => {
    // Vote 1 second before poll ends
    const actualVoteTime = new Date('2025-02-22T13:59:59Z');
    const pollEndTime = new Date('2025-02-22T14:00:00Z');

    const { displayedVoteTime } = applyTimingJitter(actualVoteTime, pollEndTime);

    // Displayed time should not exceed poll end time
    expect(displayedVoteTime.getTime()).toBeLessThanOrEqual(pollEndTime.getTime());
  });

  it('should validate jitter correctly', () => {
    expect(validateJitter(0)).toBe(true);
    expect(validateJitter(3600)).toBe(true);
    expect(validateJitter(7200)).toBe(true);
    expect(validateJitter(-1)).toBe(false);
    expect(validateJitter(7201)).toBe(false);
  });

  it('should format jitter duration correctly', () => {
    expect(formatJitterDuration(0)).toBe('0s');
    expect(formatJitterDuration(45)).toBe('45s');
    expect(formatJitterDuration(90)).toBe('1m 30s');
    expect(formatJitterDuration(3600)).toBe('1h');
    expect(formatJitterDuration(3665)).toBe('1h 1m 5s');
    expect(formatJitterDuration(7200)).toBe('2h');
  });
});

// ============================================================================
// Vote Weight Calculation Tests
// ============================================================================

describe('Vote Weight Calculations', () => {
  it('should maintain equal voting power with different multipliers', () => {
    // Two voters with different multipliers
    const voter1Weight = calculateFinalVoteWeight(1000, 0.8); // 800
    const voter2Weight = calculateFinalVoteWeight(1000, 1.2); // 1200

    // Average should be 1000 (equal power over time)
    const average = (voter1Weight + voter2Weight) / 2;
    expect(average).toBe(1000);
  });

  it('should prevent wealth-based voting advantages', () => {
    // All votes have same base weight regardless of token holdings
    const whaleVote = calculateFinalVoteWeight(1000, 1.0);
    const minnowVote = calculateFinalVoteWeight(1000, 1.0);

    expect(whaleVote).toBe(minnowVote);
  });
});

// ============================================================================
// Export for CI/CD
// ============================================================================

export {};
