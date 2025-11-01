/**
 * Module 06: Governance - Constitutional Service Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import constitutionalService from '../services/constitutional.service';
import { PollType } from '../types';

describe('Constitutional Service', () => {
  describe('seedConstitutionalArticles', () => {
    it('should seed 6 constitutional articles', async () => {
      await constitutionalService.seedConstitutionalArticles();

      const articles = await constitutionalService.getAllArticles();
      expect(articles.length).toBeGreaterThanOrEqual(6);
    });

    it('should not duplicate articles on re-run', async () => {
      await constitutionalService.seedConstitutionalArticles();
      const firstRun = await constitutionalService.getAllArticles();

      await constitutionalService.seedConstitutionalArticles();
      const secondRun = await constitutionalService.getAllArticles();

      expect(firstRun.length).toBe(secondRun.length);
    });
  });

  describe('getAllArticles', () => {
    beforeAll(async () => {
      await constitutionalService.seedConstitutionalArticles();
    });

    it('should retrieve all active articles', async () => {
      const articles = await constitutionalService.getAllArticles(true);

      expect(articles.length).toBeGreaterThanOrEqual(6);
      articles.forEach(article => {
        expect(article.status).toBe('active');
      });
    });

    it('should retrieve articles in order by number', async () => {
      const articles = await constitutionalService.getAllArticles();

      for (let i = 0; i < articles.length - 1; i++) {
        expect(articles[i].articleNumber).toBeLessThan(articles[i + 1].articleNumber);
      }
    });
  });

  describe('getArticleByNumber', () => {
    beforeAll(async () => {
      await constitutionalService.seedConstitutionalArticles();
    });

    it('should retrieve Article 1 (Dual-Identity)', async () => {
      const article = await constitutionalService.getArticleByNumber(1);

      expect(article).not.toBeNull();
      expect(article?.articleNumber).toBe(1);
      expect(article?.articleTitle).toContain('Dual-Identity');
    });

    it('should retrieve Article 5 (Spot-Only)', async () => {
      const article = await constitutionalService.getArticleByNumber(5);

      expect(article).not.toBeNull();
      expect(article?.articleNumber).toBe(5);
      expect(article?.articleTitle).toContain('Spot-Only');
    });

    it('should return null for non-existent article', async () => {
      const article = await constitutionalService.getArticleByNumber(999);
      expect(article).toBeNull();
    });
  });

  describe('validatePollAgainstConstitution', () => {
    beforeAll(async () => {
      await constitutionalService.seedConstitutionalArticles();
    });

    describe('Article 1: Dual-Identity Architecture', () => {
      it('should reject attempt to disable shadow voting', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'enable_shadow_voting',
          'false'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.length).toBeGreaterThan(0);
        expect(validation.violatedArticles[0].articleNumber).toBe(1);
      });

      it('should reject attempt to disable dual-identity', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'dual_identity_enabled',
          'false'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 1)).toBe(true);
      });
    });

    describe('Article 2: Privacy Guarantees', () => {
      it('should reject attempt to force identity revelation', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'force_reveal_identity',
          'true'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 2)).toBe(true);
      });

      it('should reject poll description suggesting privacy violation', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.GENERAL_COMMUNITY,
          undefined,
          undefined,
          'We should reveal shadow identities to prevent abuse'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 2)).toBe(true);
      });
    });

    describe('Article 3: Proof of Humanity', () => {
      it('should reject attempt to disable PoH', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'proof_of_humanity_enabled',
          'false'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 3)).toBe(true);
      });

      it('should reject disabling verification requirement', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'requires_verification_to_vote',
          'false'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 3)).toBe(true);
      });
    });

    describe('Article 4: Arweave Permanence', () => {
      it('should reject attempt to disable Arweave', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'arweave_archiving_enabled',
          'false'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 4)).toBe(true);
      });
    });

    describe('Article 5: Spot-Only Token Strategy', () => {
      it('should reject attempt to enable short selling', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'allow_short_selling',
          'true'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 5)).toBe(true);
      });

      it('should reject attempt to enable leverage', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'enable_leverage_trading',
          'true'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 5)).toBe(true);
      });

      it('should reject poll description mentioning leverage', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.GENERAL_COMMUNITY,
          undefined,
          undefined,
          'Should we allow leverage trading to increase liquidity?'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 5)).toBe(true);
      });
    });

    describe('Article 6: Rollback Protocol', () => {
      it('should reject attempt to disable rollback', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'enable_rollback_protocol',
          'false'
        );

        expect(validation.violatesConstitution).toBe(true);
        expect(validation.violatedArticles.some(v => v.articleNumber === 6)).toBe(true);
      });
    });

    describe('Valid Polls', () => {
      it('should allow valid parameter change', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.PARAMETER_VOTE,
          'poll_creation_cost_general',
          '1000'
        );

        expect(validation.violatesConstitution).toBe(false);
        expect(validation.violatedArticles).toHaveLength(0);
      });

      it('should allow general community poll', async () => {
        const validation = await constitutionalService.validatePollAgainstConstitution(
          PollType.GENERAL_COMMUNITY,
          undefined,
          undefined,
          'Should we add a new chamber to the Neural Pollinator?'
        );

        expect(validation.violatesConstitution).toBe(false);
        expect(validation.violatedArticles).toHaveLength(0);
      });
    });
  });
});
