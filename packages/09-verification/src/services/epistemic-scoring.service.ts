/**
 * Epistemic Scoring Service
 * Module 09: Verification - Session 2
 *
 * Implements the 5-layer epistemic funnel for truth discovery.
 * Each layer builds on previous layers to create a comprehensive trust score.
 *
 * The 5 Layers:
 * 1. Surface (10%) - Grammar, formatting, readability
 * 2. Contextual (15%) - Author credibility, sources, timeliness
 * 3. Analytical (25%) - Logic, evidence, argumentation quality
 * 4. Synthesis (25%) - Integration, creativity, insights
 * 5. Meta (25%) - Self-awareness, limitations, uncertainty acknowledgment
 */

import { query, queryOne } from '../database';
import {
  EpistemicScore,
  EpistemicFactor,
  EpistemicLayer,
  LayerScores,
  ScoreTarget,
  PoHLevel,
} from '../types';

class EpistemicScoringEngine {
  // Layer weights sum to 100%
  static readonly LAYER_WEIGHTS: Record<EpistemicLayer, number> = {
    surface: 10,
    contextual: 15,
    analytical: 25,
    synthesis: 25,
    meta: 25,
  };

  /**
   * Calculate surface-level score
   * Evaluates: Grammar, readability, formatting, professionalism
   */
  static calculateSurfaceScore(content: {
    text: string;
    wordCount: number;
    averageWordLength: number;
    sentenceCount: number;
    grammarErrors?: number;
    formatting?: 'poor' | 'adequate' | 'good' | 'excellent';
  }): number {
    let score = 100;

    // Penalize short content
    if (content.wordCount < 50) {
      score -= 30;
    } else if (content.wordCount < 100) {
      score -= 15;
    }

    // Penalize poor readability (Flesch reading ease approximation)
    const avgSentenceLength = content.wordCount / Math.max(content.sentenceCount, 1);
    if (avgSentenceLength > 20) {
      score -= 10;
    }

    // Penalize very short or very long words (vocab diversity)
    if (content.averageWordLength < 3 || content.averageWordLength > 8) {
      score -= 10;
    }

    // Grammar errors
    const grammarErrors = content.grammarErrors || 0;
    score -= Math.min(30, grammarErrors * 5);

    // Formatting
    const formattingBonus = {
      poor: -20,
      adequate: 0,
      good: 10,
      excellent: 20,
    };
    score += formattingBonus[content.formatting || 'adequate'];

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate contextual score
   * Evaluates: Author credibility, source quality, timeliness, verifiability
   */
  static calculateContextualScore(context: {
    authorPohLevel: PoHLevel;
    authorLightScore?: number;
    sourceQuality: 'unknown' | 'low' | 'medium' | 'high' | 'peer_reviewed';
    citationCount: number;
    isTimely: boolean;
    hasLinks: boolean;
    linksVerified?: number;
  }): number {
    let score = 50; // Start at baseline

    // Author credibility bonus (PoH Level)
    const pohBonus = (context.authorPohLevel / 5) * 20;
    score += pohBonus;

    // Light Score bonus
    if (context.authorLightScore) {
      score += Math.min(15, context.authorLightScore / 100);
    }

    // Source quality
    const sourceBonus = {
      unknown: 0,
      low: 5,
      medium: 10,
      high: 20,
      peer_reviewed: 30,
    };
    score += sourceBonus[context.sourceQuality];

    // Citation count (diminishing returns)
    score += Math.min(15, Math.log(context.citationCount + 1) * 5);

    // Timeliness bonus
    if (context.isTimely) {
      score += 10;
    }

    // Link verification
    const linkBonus = context.linksVerified || 0;
    score += Math.min(10, linkBonus * 2);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate analytical score
   * Evaluates: Logical consistency, evidence quality, argument strength
   */
  static calculateAnalyticalScore(analysis: {
    logicalConsistency: number; // 0-100
    evidenceCount: number;
    evidenceQuality: 'weak' | 'moderate' | 'strong' | 'compelling';
    argumentStructure: 'weak' | 'adequate' | 'strong' | 'rigorous';
    refutationHandling: number; // How well counterarguments addressed (0-100)
    assumptionsExplicit: boolean;
    scopeLimitations: boolean;
  }): number {
    let score = 0;

    // Logical consistency (40% of this layer)
    score += analysis.logicalConsistency * 0.4;

    // Evidence quality (30% of this layer)
    const evidenceQualityScore = {
      weak: 25,
      moderate: 50,
      strong: 75,
      compelling: 100,
    };
    score += evidenceQualityScore[analysis.evidenceQuality] * 0.3;

    // Argument structure (20% of this layer)
    const argumentScore = {
      weak: 20,
      adequate: 50,
      strong: 80,
      rigorous: 100,
    };
    score += argumentScore[analysis.argumentStructure] * 0.2;

    // Bonus for handling counterarguments
    if (analysis.refutationHandling > 50) {
      score += 10;
    }

    // Bonus for explicit assumptions
    if (analysis.assumptionsExplicit) {
      score += 5;
    }

    // Bonus for scope limitations
    if (analysis.scopeLimitations) {
      score += 5;
    }

    // Evidence count bonus (diminishing)
    if (analysis.evidenceCount > 0) {
      score += Math.min(10, Math.log(analysis.evidenceCount) * 2);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate synthesis score
   * Evaluates: Integration of ideas, originality, insight depth
   */
  static calculateSynthesisScore(synthesis: {
    novelInsights: number; // 0-3 (none, some, significant)
    ideaIntegration: 'disconnected' | 'loose' | 'coherent' | 'integrated';
    originalityLevel: 'derivative' | 'incremental' | 'substantial' | 'breakthrough';
    crossDomainConnections: number; // Count of connections to other domains
    practicalApplicability: 'abstract' | 'theoretical' | 'practical' | 'immediately_useful';
    uniqueContribution: boolean; // Adds something genuinely new
  }): number {
    let score = 0;

    // Novel insights (30% of this layer)
    score += (synthesis.novelInsights / 3) * 30;

    // Idea integration (20% of this layer)
    const integrationScore = {
      disconnected: 10,
      loose: 40,
      coherent: 70,
      integrated: 100,
    };
    score += integrationScore[synthesis.ideaIntegration] * 0.2;

    // Originality (25% of this layer)
    const originalityScore = {
      derivative: 20,
      incremental: 50,
      substantial: 80,
      breakthrough: 100,
    };
    score += originalityScore[synthesis.originalityLevel] * 0.25;

    // Practical applicability (15% of this layer)
    const applicabilityScore = {
      abstract: 20,
      theoretical: 50,
      practical: 80,
      immediately_useful: 100,
    };
    score += applicabilityScore[synthesis.practicalApplicability] * 0.15;

    // Cross-domain connections bonus
    if (synthesis.crossDomainConnections > 0) {
      score += Math.min(10, synthesis.crossDomainConnections * 2);
    }

    // Unique contribution bonus
    if (synthesis.uniqueContribution) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate meta score
   * Evaluates: Self-awareness, acknowledged limitations, confidence calibration
   */
  static calculateMetaScore(meta: {
    acknowledgesUncertainty: boolean;
    limitsExplicitlyStated: boolean;
    confidenceCalibration: 'overconfident' | 'reasonable' | 'underconfident';
    selfAwarenessLevel: 'low' | 'moderate' | 'high' | 'exceptional';
    alternativePerspectives: number; // Count of considered alternatives
    openToRevision: boolean; // Acknowledges potential for being wrong
    epistemicHumility: 0 | 1 | 2; // 0=none, 1=some, 2=strong
  }): number {
    let score = 0;

    // Base from self-awareness (40% of this layer)
    const awarenessScore = {
      low: 20,
      moderate: 50,
      high: 80,
      exceptional: 100,
    };
    score += awarenessScore[meta.selfAwarenessLevel] * 0.4;

    // Confidence calibration (25% of this layer)
    const confidenceScore = {
      overconfident: 30,
      reasonable: 85,
      underconfident: 60,
    };
    score += confidenceScore[meta.confidenceCalibration] * 0.25;

    // Acknowledges limitations (15% of this layer)
    if (meta.limitsExplicitlyStated) {
      score += 15;
    } else {
      score -= 5;
    }

    // Acknowledges uncertainty (10% of this layer)
    if (meta.acknowledgesUncertainty) {
      score += 10;
    }

    // Bonus for considering alternatives
    if (meta.alternativePerspectives > 0) {
      score += Math.min(10, meta.alternativePerspectives * 3);
    }

    // Bonus for openness to revision
    if (meta.openToRevision) {
      score += 5;
    }

    // Epistemic humility bonus
    score += meta.epistemicHumility * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate final epistemic score from all 5 layers
   * Applies weights and returns comprehensive score
   */
  static calculateFinalScore(layerScores: LayerScores): number {
    let weighted = 0;

    weighted += layerScores.surface * (this.LAYER_WEIGHTS.surface / 100);
    weighted += layerScores.contextual * (this.LAYER_WEIGHTS.contextual / 100);
    weighted += layerScores.analytical * (this.LAYER_WEIGHTS.analytical / 100);
    weighted += layerScores.synthesis * (this.LAYER_WEIGHTS.synthesis / 100);
    weighted += layerScores.meta * (this.LAYER_WEIGHTS.meta / 100);

    return Math.round(weighted);
  }

  /**
   * Calculate confidence in the score itself
   * Higher confidence when layers agree, lower when they diverge
   */
  static calculateConfidence(layerScores: LayerScores): number {
    const scores = Object.values(layerScores);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDev = Math.sqrt(variance);

    // Low variance = high confidence
    // Confidence decreases as standard deviation increases
    const confidence = Math.max(0.3, 1 - standardDev / 100);

    return Math.round(confidence * 100);
  }
}

export class EpistemicScoringService {
  /**
   * Calculate full epistemic score for a target
   */
  static async calculateScore(
    targetType: ScoreTarget,
    targetId: string,
    analysisData: Record<string, any>,
    authorPohLevel?: PoHLevel,
    authorLightScore?: number,
  ): Promise<EpistemicScore> {
    const id = `score_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    // Calculate each layer
    const surfaceScore = EpistemicScoringEngine.calculateSurfaceScore(analysisData.surface || {});

    const contextualScore = EpistemicScoringEngine.calculateContextualScore({
      authorPohLevel: authorPohLevel || 0,
      authorLightScore,
      ...analysisData.contextual,
    });

    const analyticalScore = EpistemicScoringEngine.calculateAnalyticalScore(
      analysisData.analytical || {},
    );

    const synthesisScore = EpistemicScoringEngine.calculateSynthesisScore(analysisData.synthesis || {});

    const metaScore = EpistemicScoringEngine.calculateMetaScore(analysisData.meta || {});

    const layerScores: LayerScores = {
      surface: surfaceScore,
      contextual: contextualScore,
      analytical: analyticalScore,
      synthesis: synthesisScore,
      meta: metaScore,
    };

    const finalScore = EpistemicScoringEngine.calculateFinalScore(layerScores);
    const confidence = EpistemicScoringEngine.calculateConfidence(layerScores);

    const score: EpistemicScore = {
      id,
      targetType,
      targetId,
      surfaceScore,
      contextualScore,
      analyticalScore,
      synthesisScore,
      metaScore,
      finalScore,
      confidence,
      factors: analysisData,
      calculatedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
      createdAt: now,
      updatedAt: now,
    };

    // Save to database
    const sql = `
      INSERT INTO epistemic_scores (
        id, target_type, target_id,
        surface_score, contextual_score, analytical_score, synthesis_score, meta_score,
        final_score, confidence, factors, calculated_at, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const result = await queryOne<EpistemicScore>(sql, [
      id,
      targetType,
      targetId,
      surfaceScore,
      contextualScore,
      analyticalScore,
      synthesisScore,
      metaScore,
      finalScore,
      confidence,
      JSON.stringify(analysisData),
      now,
      score.expiresAt,
      now,
      now,
    ]);

    if (!result) {
      throw new Error('Failed to create epistemic score');
    }

    return result;
  }

  /**
   * Get existing score for a target
   */
  static async getScore(
    targetType: ScoreTarget,
    targetId: string,
  ): Promise<EpistemicScore | null> {
    const sql = `
      SELECT * FROM epistemic_scores
      WHERE target_type = $1 AND target_id = $2
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY calculated_at DESC
      LIMIT 1
    `;

    return queryOne<EpistemicScore>(sql, [targetType, targetId]);
  }

  /**
   * Recalculate score for a target (invalidates old score)
   */
  static async recalculateScore(
    targetType: ScoreTarget,
    targetId: string,
    analysisData: Record<string, any>,
    authorPohLevel?: PoHLevel,
    authorLightScore?: number,
  ): Promise<EpistemicScore> {
    // Mark old score as expired
    const expireSql = `
      UPDATE epistemic_scores
      SET expires_at = NOW()
      WHERE target_type = $1 AND target_id = $2
    `;
    await query(expireSql, [targetType, targetId]);

    // Calculate new score
    return this.calculateScore(
      targetType,
      targetId,
      analysisData,
      authorPohLevel,
      authorLightScore,
    );
  }

  /**
   * Get score history for a target
   */
  static async getScoreHistory(
    targetType: ScoreTarget,
    targetId: string,
    limit: number = 10,
  ): Promise<EpistemicScore[]> {
    const sql = `
      SELECT * FROM epistemic_scores
      WHERE target_type = $1 AND target_id = $2
      ORDER BY calculated_at DESC
      LIMIT $3
    `;

    const result = await query<EpistemicScore>(sql, [targetType, targetId, limit]);
    return result.rows;
  }

  /**
   * Get highest-scoring content in a category
   */
  static async getTopContent(
    targetType: ScoreTarget,
    limit: number = 20,
    minScore?: number,
  ): Promise<EpistemicScore[]> {
    let sql = `
      SELECT * FROM epistemic_scores
      WHERE target_type = $1
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const params: any[] = [targetType];
    let paramIndex = 2;

    if (minScore !== undefined) {
      sql += ` AND final_score >= $${paramIndex++}`;
      params.push(minScore);
    }

    sql += ` ORDER BY final_score DESC, calculated_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query<EpistemicScore>(sql, params);
    return result.rows;
  }

  /**
   * Calculate layer-by-layer analysis for explanation
   * Returns breakdown showing which layers contributed most to final score
   */
  static analyzeScoreLayers(score: EpistemicScore): {
    layer: EpistemicLayer;
    score: number;
    weight: number;
    weightedContribution: number;
    strengths: string[];
    improvements: string[];
  }[] {
    const breakdown = [
      {
        layer: 'surface' as EpistemicLayer,
        score: score.surfaceScore,
        weight: EpistemicScoringEngine.LAYER_WEIGHTS.surface,
      },
      {
        layer: 'contextual' as EpistemicLayer,
        score: score.contextualScore,
        weight: EpistemicScoringEngine.LAYER_WEIGHTS.contextual,
      },
      {
        layer: 'analytical' as EpistemicLayer,
        score: score.analyticalScore,
        weight: EpistemicScoringEngine.LAYER_WEIGHTS.analytical,
      },
      {
        layer: 'synthesis' as EpistemicLayer,
        score: score.synthesisScore,
        weight: EpistemicScoringEngine.LAYER_WEIGHTS.synthesis,
      },
      {
        layer: 'meta' as EpistemicLayer,
        score: score.metaScore,
        weight: EpistemicScoringEngine.LAYER_WEIGHTS.meta,
      },
    ];

    return breakdown.map((item) => ({
      layer: item.layer,
      score: item.score,
      weight: item.weight,
      weightedContribution: (item.score * item.weight) / 100,
      strengths: this.identifyStrengths(item.layer, item.score),
      improvements: this.identifyImprovements(item.layer, item.score),
    }));
  }

  private static identifyStrengths(layer: EpistemicLayer, score: number): string[] {
    const strengths: string[] = [];

    if (score >= 80) {
      strengths.push('Excellent performance in this layer');
    } else if (score >= 60) {
      strengths.push('Good performance in this layer');
    }

    // Layer-specific insights
    if (layer === 'surface' && score >= 70) {
      strengths.push('Clear, well-formatted writing');
    }
    if (layer === 'contextual' && score >= 70) {
      strengths.push('Strong source credibility and verification');
    }
    if (layer === 'analytical' && score >= 70) {
      strengths.push('Rigorous logic and compelling evidence');
    }
    if (layer === 'synthesis' && score >= 70) {
      strengths.push('Original insights and novel contributions');
    }
    if (layer === 'meta' && score >= 70) {
      strengths.push('Strong self-awareness and epistemic humility');
    }

    return strengths;
  }

  private static identifyImprovements(layer: EpistemicLayer, score: number): string[] {
    const improvements: string[] = [];

    if (score < 60) {
      improvements.push(`${layer} layer needs improvement`);
    }

    // Layer-specific recommendations
    if (layer === 'surface' && score < 70) {
      improvements.push('Consider improving readability and formatting');
    }
    if (layer === 'contextual' && score < 70) {
      improvements.push('Add more credible sources and citations');
    }
    if (layer === 'analytical' && score < 70) {
      improvements.push('Strengthen logical arguments and evidence quality');
    }
    if (layer === 'synthesis' && score < 70) {
      improvements.push('Develop more original insights and connections');
    }
    if (layer === 'meta' && score < 70) {
      improvements.push('Acknowledge more limitations and uncertainties');
    }

    return improvements;
  }
}

export { EpistemicScoringEngine };
