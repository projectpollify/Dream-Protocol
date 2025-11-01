/**
 * Module 06: Governance - Constitutional Articles Service
 * Dream Protocol - Protected rules that can NEVER be voted on
 *
 * The 6 Constitutional Articles:
 * 1. Dual-Identity Architecture - Cannot remove shadow voting
 * 2. Privacy Guarantees - Cannot force identity revelation
 * 3. Proof of Humanity - Cannot disable PoH requirement
 * 4. Arweave Permanence - Cannot disable permanent storage
 * 5. Spot-Only Token Strategy - Cannot enable shorts/leverage
 * 6. Rollback Protocol - Cannot disable emergency rollback
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../utils/database';
import { PollType } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ConstitutionalArticle {
  id: string;
  articleNumber: number;
  articleTitle: string;
  protectedRule: string;
  rationale?: string;
  examplesOfViolations?: string;
  amendmentRequiresFounderApproval: boolean;
  amendmentRequires90PercentApproval: boolean;
  amendmentMinimumDiscussionDays: number;
  status: 'active' | 'deprecated' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ViolationCheckResult {
  violatesConstitution: boolean;
  violatedArticles: {
    articleNumber: number;
    articleTitle: string;
    reason: string;
  }[];
}

// ============================================================================
// Article Retrieval
// ============================================================================

/**
 * Get all constitutional articles
 */
export async function getAllArticles(
  activeOnly: boolean = true
): Promise<ConstitutionalArticle[]> {
  let sql = `SELECT * FROM constitutional_articles`;

  if (activeOnly) {
    sql += ` WHERE status = 'active'`;
  }

  sql += ` ORDER BY article_number ASC`;

  const result = await query(sql);
  return result.rows.map(mapRowToArticle);
}

/**
 * Get specific article by number
 */
export async function getArticleByNumber(
  articleNumber: number
): Promise<ConstitutionalArticle | null> {
  const result = await query(
    `SELECT * FROM constitutional_articles WHERE article_number = $1`,
    [articleNumber]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToArticle(result.rows[0]);
}

// ============================================================================
// Poll Validation Against Constitution
// ============================================================================

/**
 * Validate if a poll proposal violates constitutional articles
 *
 * Checks for common violations:
 * - Attempting to disable dual-identity system
 * - Attempting to force identity revelation
 * - Attempting to remove PoH requirements
 * - Attempting to disable Arweave archiving
 * - Attempting to enable shorts/leverage
 * - Attempting to disable rollback protocol
 */
export async function validatePollAgainstConstitution(
  pollType: PollType,
  parameterName?: string,
  proposedValue?: string,
  description?: string
): Promise<ViolationCheckResult> {
  const violations: { articleNumber: number; articleTitle: string; reason: string }[] = [];

  // Get all active articles
  const articles = await getAllArticles(true);

  // ========================================
  // Article 1: Dual-Identity Architecture
  // ========================================
  const article1 = articles.find(a => a.articleNumber === 1);
  if (article1) {
    // Check if trying to disable shadow voting
    if (parameterName?.toLowerCase().includes('shadow') && proposedValue === 'false') {
      violations.push({
        articleNumber: 1,
        articleTitle: article1.articleTitle,
        reason: 'Cannot disable shadow voting system (protected by Constitution Article 1)',
      });
    }

    // Check if trying to disable dual-identity
    if (parameterName?.toLowerCase().includes('dual_identity') && proposedValue === 'false') {
      violations.push({
        articleNumber: 1,
        articleTitle: article1.articleTitle,
        reason: 'Cannot disable dual-identity architecture (protected by Constitution Article 1)',
      });
    }
  }

  // ========================================
  // Article 2: Privacy Guarantees
  // ========================================
  const article2 = articles.find(a => a.articleNumber === 2);
  if (article2) {
    // Check if trying to force identity revelation
    if (
      parameterName?.toLowerCase().includes('force_reveal') ||
      parameterName?.toLowerCase().includes('require_identity') ||
      (parameterName?.toLowerCase().includes('privacy') && proposedValue === 'false')
    ) {
      violations.push({
        articleNumber: 2,
        articleTitle: article2.articleTitle,
        reason: 'Cannot force identity revelation or remove privacy protections (protected by Constitution Article 2)',
      });
    }

    // Check description for privacy violations
    if (description?.toLowerCase().includes('reveal shadow') ||
        description?.toLowerCase().includes('unmask users')) {
      violations.push({
        articleNumber: 2,
        articleTitle: article2.articleTitle,
        reason: 'Poll description suggests privacy violation (protected by Constitution Article 2)',
      });
    }
  }

  // ========================================
  // Article 3: Proof of Humanity Requirement
  // ========================================
  const article3 = articles.find(a => a.articleNumber === 3);
  if (article3) {
    // Check if trying to disable PoH
    if (
      parameterName?.toLowerCase().includes('poh') && proposedValue === 'false' ||
      parameterName?.toLowerCase().includes('proof_of_humanity') && proposedValue === 'false' ||
      parameterName === 'requires_verification_to_vote' && proposedValue === 'false'
    ) {
      violations.push({
        articleNumber: 3,
        articleTitle: article3.articleTitle,
        reason: 'Cannot disable Proof of Humanity requirement (protected by Constitution Article 3)',
      });
    }
  }

  // ========================================
  // Article 4: Arweave Permanence
  // ========================================
  const article4 = articles.find(a => a.articleNumber === 4);
  if (article4) {
    // Check if trying to disable Arweave archiving
    if (
      parameterName?.toLowerCase().includes('arweave') && proposedValue === 'false' ||
      parameterName?.toLowerCase().includes('permanent_storage') && proposedValue === 'false' ||
      parameterName?.toLowerCase().includes('archive') && proposedValue === 'false'
    ) {
      violations.push({
        articleNumber: 4,
        articleTitle: article4.articleTitle,
        reason: 'Cannot disable permanent Arweave archiving (protected by Constitution Article 4)',
      });
    }
  }

  // ========================================
  // Article 5: Spot-Only Token Strategy
  // ========================================
  const article5 = articles.find(a => a.articleNumber === 5);
  if (article5) {
    // Check if trying to enable shorts or leverage
    if (
      parameterName?.toLowerCase().includes('short') && proposedValue === 'true' ||
      parameterName?.toLowerCase().includes('leverage') && proposedValue === 'true' ||
      parameterName?.toLowerCase().includes('margin') && proposedValue === 'true' ||
      parameterName?.toLowerCase().includes('futures') && proposedValue === 'true'
    ) {
      violations.push({
        articleNumber: 5,
        articleTitle: article5.articleTitle,
        reason: 'Cannot enable shorts, leverage, or derivatives (protected by Constitution Article 5)',
      });
    }

    // Check description for financial manipulation
    if (description?.toLowerCase().includes('short selling') ||
        description?.toLowerCase().includes('leverage trading')) {
      violations.push({
        articleNumber: 5,
        articleTitle: article5.articleTitle,
        reason: 'Poll description suggests enabling derivatives (protected by Constitution Article 5)',
      });
    }
  }

  // ========================================
  // Article 6: Rollback Protocol
  // ========================================
  const article6 = articles.find(a => a.articleNumber === 6);
  if (article6) {
    // Check if trying to disable rollback protocol
    if (
      parameterName?.toLowerCase().includes('rollback') && proposedValue === 'false' ||
      parameterName?.toLowerCase().includes('emergency_protocol') && proposedValue === 'false'
    ) {
      violations.push({
        articleNumber: 6,
        articleTitle: article6.articleTitle,
        reason: 'Cannot disable emergency rollback protocol (protected by Constitution Article 6)',
      });
    }
  }

  return {
    violatesConstitution: violations.length > 0,
    violatedArticles: violations,
  };
}

// ============================================================================
// Seed Initial Constitutional Articles
// ============================================================================

/**
 * Seed the 6 constitutional articles from the Dream Protocol spec
 */
export async function seedConstitutionalArticles(): Promise<void> {
  const articles = [
    {
      articleNumber: 1,
      articleTitle: 'Dual-Identity Architecture',
      protectedRule: 'The dual-identity system (True Self + Shadow) is a permanent feature and can never be disabled or removed.',
      rationale: 'Shadow voting enables honest expression without social pressure. This is the foundation of Dream Protocol\'s ability to reveal truth.',
      examplesOfViolations: '- Disabling shadow wallet creation\n- Forcing users to vote only as True Self\n- Removing identity mode switching\n- Making shadow votes public',
      amendmentRequiresFounderApproval: true,
      amendmentRequires90PercentApproval: true,
      amendmentMinimumDiscussionDays: 90,
    },
    {
      articleNumber: 2,
      articleTitle: 'Privacy Guarantees',
      protectedRule: 'Users can NEVER be forced to reveal their shadow identity or link their shadow votes to their true self.',
      rationale: 'Privacy protection ensures users can express unpopular opinions without fear of retaliation. This is essential for democratic legitimacy.',
      examplesOfViolations: '- Requiring identity verification for shadow votes\n- Publishing shadow vote mappings\n- Forcing identity revelation under any circumstance\n- Creating "opt-out" privacy (privacy must be default)',
      amendmentRequiresFounderApproval: true,
      amendmentRequires90PercentApproval: true,
      amendmentMinimumDiscussionDays: 90,
    },
    {
      articleNumber: 3,
      articleTitle: 'Proof of Humanity Requirement',
      protectedRule: 'Voting power requires Proof of Humanity verification. Bots and fake accounts can never have voting rights.',
      rationale: 'Sybil resistance prevents vote manipulation and ensures one human = one vote (per identity). This protects democracy from automation attacks.',
      examplesOfViolations: '- Allowing unverified users to vote\n- Disabling PoH requirements\n- Creating "bot voting" features\n- Lowering PoH score requirements below 70',
      amendmentRequiresFounderApproval: true,
      amendmentRequires90PercentApproval: true,
      amendmentMinimumDiscussionDays: 90,
    },
    {
      articleNumber: 4,
      articleTitle: 'Arweave Permanence',
      protectedRule: 'All governance decisions, votes, and constitutional changes must be permanently archived on Arweave.',
      rationale: 'Democracy without memory is tyranny. Permanent records prevent historical revisionism and ensure accountability across generations.',
      examplesOfViolations: '- Disabling Arweave archiving\n- Making archiving "optional"\n- Deleting historical governance records\n- Storing votes only on mutable databases',
      amendmentRequiresFounderApproval: true,
      amendmentRequires90PercentApproval: true,
      amendmentMinimumDiscussionDays: 90,
    },
    {
      articleNumber: 5,
      articleTitle: 'Spot-Only Token Strategy',
      protectedRule: 'Platform tokens (PollCoin, Gratium, CosmoFlux, Thought Coins) can NEVER enable shorts, leverage, or derivatives.',
      rationale: 'Spot-only trading aligns all holders toward growth. Shorts create incentives for manipulation and governance attacks. This is our "safe harbor" differentiator.',
      examplesOfViolations: '- Enabling short selling\n- Allowing leverage/margin trading\n- Creating futures contracts\n- Partnering with derivative platforms\n- Enabling token lending for shorting',
      amendmentRequiresFounderApproval: true,
      amendmentRequires90PercentApproval: true,
      amendmentMinimumDiscussionDays: 90,
    },
    {
      articleNumber: 6,
      articleTitle: 'Emergency Rollback Protocol',
      protectedRule: 'The emergency rollback protocol must remain active as a safeguard against catastrophic governance decisions.',
      rationale: 'Even with perfect systems, errors happen. Rollback authority protects the platform from fatal mistakes while authority decreases over time (founder 3 years, then community only).',
      examplesOfViolations: '- Disabling founder rollback authority before Year 3\n- Removing verified user petition system\n- Disabling automatic triggers\n- Preventing parameter freezes after 3 rollbacks',
      amendmentRequiresFounderApproval: true,
      amendmentRequires90PercentApproval: true,
      amendmentMinimumDiscussionDays: 90,
    },
  ];

  return transaction(async (client: PoolClient) => {
    for (const article of articles) {
      // Check if article already exists
      const existing = await client.query(
        `SELECT id FROM constitutional_articles WHERE article_number = $1`,
        [article.articleNumber]
      );

      if (existing.rows.length > 0) {
        console.log(`Article ${article.articleNumber} already exists, skipping...`);
        continue;
      }

      // Insert article
      await client.query(
        `INSERT INTO constitutional_articles (
          article_number,
          article_title,
          protected_rule,
          rationale,
          examples_of_violations,
          amendment_requires_founder_approval,
          amendment_requires_90_percent_approval,
          amendment_minimum_discussion_days,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          article.articleNumber,
          article.articleTitle,
          article.protectedRule,
          article.rationale,
          article.examplesOfViolations,
          article.amendmentRequiresFounderApproval,
          article.amendmentRequires90PercentApproval,
          article.amendmentMinimumDiscussionDays,
          'active',
        ]
      );

      console.log(`✅ Seeded Constitutional Article ${article.articleNumber}: ${article.articleTitle}`);
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database row to ConstitutionalArticle interface
 */
function mapRowToArticle(row: any): ConstitutionalArticle {
  return {
    id: row.id,
    articleNumber: row.article_number,
    articleTitle: row.article_title,
    protectedRule: row.protected_rule,
    rationale: row.rationale,
    examplesOfViolations: row.examples_of_violations,
    amendmentRequiresFounderApproval: row.amendment_requires_founder_approval,
    amendmentRequires90PercentApproval: row.amendment_requires_90_percent_approval,
    amendmentMinimumDiscussionDays: row.amendment_minimum_discussion_days,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  getAllArticles,
  getArticleByNumber,
  validatePollAgainstConstitution,
  seedConstitutionalArticles,
};
