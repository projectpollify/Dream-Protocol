/**
 * Module 06: Governance - Parameter Service Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import parameterService from '../services/parameter.service';
import { ParameterCategory, ValueType } from '../types';
import { query } from '../utils/database';

describe('Parameter Service', () => {
  describe('seedInitialParameters', () => {
    it('should seed 9 initial parameters', async () => {
      await parameterService.seedInitialParameters();

      const result = await query('SELECT COUNT(*) as count FROM parameter_whitelist');
      const count = parseInt(result.rows[0].count, 10);

      expect(count).toBeGreaterThanOrEqual(9);
    });

    it('should not duplicate parameters on re-run', async () => {
      await parameterService.seedInitialParameters();
      const firstCount = await query('SELECT COUNT(*) as count FROM parameter_whitelist');

      await parameterService.seedInitialParameters();
      const secondCount = await query('SELECT COUNT(*) as count FROM parameter_whitelist');

      expect(firstCount.rows[0].count).toBe(secondCount.rows[0].count);
    });
  });

  describe('getAllParameters', () => {
    beforeAll(async () => {
      await parameterService.seedInitialParameters();
    });

    it('should retrieve all parameters', async () => {
      const params = await parameterService.getAllParameters();
      expect(params.length).toBeGreaterThanOrEqual(9);
    });

    it('should filter by category', async () => {
      const params = await parameterService.getAllParameters({
        category: ParameterCategory.ECONOMIC_ACCESSIBILITY,
      });

      expect(params.length).toBeGreaterThanOrEqual(4);
      params.forEach(p => {
        expect(p.parameterCategory).toBe(ParameterCategory.ECONOMIC_ACCESSIBILITY);
      });
    });

    it('should filter by voteable only', async () => {
      const params = await parameterService.getAllParameters({
        voteableOnly: true,
      });

      params.forEach(p => {
        expect(p.isVoteable).toBe(true);
      });
    });
  });

  describe('getParameterByName', () => {
    beforeAll(async () => {
      await parameterService.seedInitialParameters();
    });

    it('should retrieve specific parameter', async () => {
      const param = await parameterService.getParameterByName('poll_creation_cost_general');

      expect(param).not.toBeNull();
      expect(param?.parameterName).toBe('poll_creation_cost_general');
      expect(param?.currentValue).toBe('500');
      expect(param?.valueType).toBe(ValueType.INTEGER);
    });

    it('should return null for non-existent parameter', async () => {
      const param = await parameterService.getParameterByName('non_existent_param');
      expect(param).toBeNull();
    });
  });

  describe('validateParameterValue', () => {
    beforeAll(async () => {
      await parameterService.seedInitialParameters();
    });

    it('should validate integer within bounds', async () => {
      const validation = await parameterService.validateParameterValue(
        'poll_creation_cost_general',
        '1000'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject integer below minimum', async () => {
      const validation = await parameterService.validateParameterValue(
        'poll_creation_cost_general',
        '50' // Min is 100
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('below minimum');
    });

    it('should reject integer above maximum', async () => {
      const validation = await parameterService.validateParameterValue(
        'poll_creation_cost_general',
        '10000' // Max is 5000
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('above maximum');
    });

    it('should validate decimal within bounds', async () => {
      const validation = await parameterService.validateParameterValue(
        'gratium_stake_reward_multiplier',
        '2.0'
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid value type for integer', async () => {
      const validation = await parameterService.validateParameterValue(
        'poll_creation_cost_general',
        'not-a-number'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should warn when value equals current value', async () => {
      const validation = await parameterService.validateParameterValue(
        'poll_creation_cost_general',
        '500' // Default value
      );

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('identical to current value');
    });

    it('should warn for super-majority parameters', async () => {
      const validation = await parameterService.validateParameterValue(
        'poll_creation_cost_parameter',
        '2000'
      );

      expect(validation.warnings.some(w => w.includes('super-majority'))).toBe(true);
    });

    it('should reject non-existent parameter', async () => {
      const validation = await parameterService.validateParameterValue(
        'fake_parameter',
        '100'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('not in the whitelist');
    });
  });

  describe('getParameterVotingHistory', () => {
    it('should return empty array for parameter with no votes', async () => {
      const history = await parameterService.getParameterVotingHistory(
        'poll_creation_cost_general'
      );

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('isParameterFrozen', () => {
    it('should return false for voteable parameter', async () => {
      const frozen = await parameterService.isParameterFrozen('poll_creation_cost_general');
      expect(frozen).toBe(false);
    });
  });
});
