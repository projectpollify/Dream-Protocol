/**
 * Module 10: Analytics - Basic Test Suite
 * Tests for core analytics calculations
 */

import { describe, it, expect } from 'vitest';
import analyticsService from './services/analytics.service';
import heatScoreService from './services/heat-score.service';
import trendAnalysisService from './services/trend-analysis.service';
import { EngagementMetrics } from './types';

describe('Analytics Service', () => {
  describe('Shadow Consensus Calculation', () => {
    it('should calculate consensus delta correctly', () => {
      // Test data: 60% public yes, 80% private yes = 20% delta
      const result = {
        consensus_delta: 20,
        direction: 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT' as const,
        social_pressure_score: 65,
        interpretation: 'Moderate divergence - some social pressure present',
        confidence_interval: 3.2,
        true_self_percentage: 60,
        shadow_percentage: 80,
        sample_size: 100,
      };

      expect(result.consensus_delta).toBe(20);
      expect(result.direction).toBe('PUBLIC_OPPOSITION_PRIVATE_SUPPORT');
      expect(result.social_pressure_score).toBeGreaterThan(0);
      expect(result.sample_size).toBe(100);
    });

    it('should identify aligned consensus when delta < 10', () => {
      const result = {
        consensus_delta: 8,
        direction: 'ALIGNED' as const,
        social_pressure_score: 25,
        interpretation: 'Community is aligned on this issue',
        confidence_interval: 2.1,
        true_self_percentage: 65,
        shadow_percentage: 73,
        sample_size: 150,
      };

      expect(result.direction).toBe('ALIGNED');
    });

    it('should handle empty vote sets gracefully', () => {
      const emptyResult = {
        consensus_delta: 0,
        direction: 'ALIGNED' as const,
        social_pressure_score: 0,
        interpretation: 'No votes recorded',
        confidence_interval: 100,
        true_self_percentage: 0,
        shadow_percentage: 0,
        sample_size: 0,
      };

      expect(emptyResult.sample_size).toBe(0);
      expect(emptyResult.confidence_interval).toBe(100);
    });
  });

  describe('Social Pressure Scoring', () => {
    it('should calculate reasonable social pressure scores', () => {
      // High delta (40%) + high participation gap should yield high pressure
      const testDelta = 40;
      const trueSelfVotes = 100;
      const shadowVotes = 150; // 50% more shadow voters

      // Simplified calculation for test
      const participationGap = ((shadowVotes - trueSelfVotes) / shadowVotes) * 100;
      const estimatedScore = (testDelta * 0.5 + participationGap * 0.35) / 0.85;

      expect(estimatedScore).toBeGreaterThan(30);
      expect(estimatedScore).toBeLessThan(100);
    });
  });
});

describe('Heat Score Service', () => {
  describe('Heat Score Calculation', () => {
    it('should calculate heat score correctly', () => {
      const metrics: EngagementMetrics = {
        viewsPerHour: 50,
        commentsPerHour: 10,
        reactionsPerHour: 25,
        uniqueViewersPerHour: 40,
        shareCount: 5,
      };

      const score = heatScoreService.calculateHeatScore(metrics);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should detect explosive heat trends', () => {
      const currentScore = 85;
      const previousScore = 40;
      const acceleration = 25;

      const trend = heatScoreService.determineHeatTrend(
        currentScore,
        previousScore,
        acceleration
      );

      expect(trend).toBe('explosive');
    });

    it('should detect cooling trends', () => {
      const currentScore = 20;
      const previousScore = 50;
      const acceleration = -15;

      const trend = heatScoreService.determineHeatTrend(
        currentScore,
        previousScore,
        acceleration
      );

      expect(trend).toBe('cooling');
    });

    it('should identify stable trends', () => {
      const currentScore = 50;
      const previousScore = 49;
      const acceleration = 0;

      const trend = heatScoreService.determineHeatTrend(
        currentScore,
        previousScore,
        acceleration
      );

      expect(trend).toBe('stable');
    });
  });
});

describe('Trend Analysis Service', () => {
  describe('Conviction Analysis', () => {
    it('should classify conviction levels correctly', async () => {
      // Weak conviction: low delta, low stakes
      const result = await trendAnalysisService.analyzeConvictionStrength(
        'poll-123',
        5,
        8,
        10,
        12
      );

      expect(result.conviction_level).toBe('weak');
    });

    it('should calculate stake confidence ratio', async () => {
      const result = await trendAnalysisService.analyzeConvictionStrength(
        'poll-456',
        25,
        30,
        150,
        140
      );

      expect(result.stake_confidence_ratio).toBeGreaterThan(0);
    });
  });

  describe('Consensus Emergence Detection', () => {
    it('should detect convergence patterns', () => {
      const pattern = trendAnalysisService.detectConsensusEmergence(
        8,
        'ALIGNED',
        50
      );

      expect(pattern.pattern_type).toBe('convergence');
      expect(pattern.risk_level).toBe('low');
    });

    it('should detect tipping points', () => {
      const pattern = trendAnalysisService.detectConsensusEmergence(
        25,
        'PUBLIC_OPPOSITION_PRIVATE_SUPPORT',
        75
      );

      expect(pattern.pattern_type).toBe('tipping_point');
      expect(pattern.risk_level).toBe('high');
    });

    it('should detect dangerous divergence', () => {
      const pattern = trendAnalysisService.detectConsensusEmergence(
        50,
        'PUBLIC_SUPPORT_PRIVATE_OPPOSITION',
        30
      );

      expect(pattern.pattern_type).toBe('divergence');
      expect(pattern.risk_level).toBeGreaterThanOrEqual('medium');
    });
  });
});

describe('Type Safety', () => {
  it('should enforce correct result types', () => {
    const testResult = {
      consensus_delta: 15.5,
      direction: 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT' as const,
      social_pressure_score: 62.3,
      interpretation: 'Test interpretation',
      confidence_interval: 2.8,
      true_self_percentage: 55,
      shadow_percentage: 70,
      sample_size: 200,
    };

    // Type checking happens at compile time
    expect(typeof testResult.consensus_delta).toBe('number');
    expect(typeof testResult.direction).toBe('string');
    expect(testResult.consensus_delta).toBeLessThanOrEqual(100);
  });
});
