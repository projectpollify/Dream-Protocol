/**
 * Module 10: Analytics - API Routes
 * RESTful endpoints for analytics queries and calculations
 */

import { Router, Request, Response } from 'express';
import analyticsService from '../services/analytics.service';
import trendAnalysisService from '../services/trend-analysis.service';
import heatScoreService from '../services/heat-score.service';
import { EngagementMetrics, HealthMetricsInput } from '../types';

const router: Router = Router();

// ============================================================================
// Shadow Consensus Routes
// ============================================================================

/**
 * GET /api/v1/analytics/shadow-consensus/:pollId
 * Get current Shadow Consensus for a poll
 */
router.get('/shadow-consensus/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    // Calculate current consensus
    const consensus = await analyticsService.calculateShadowConsensus(pollId);

    // Get historical data for comparison
    const history = await analyticsService.getShadowConsensusHistory(pollId);
    const delta24hAgo = history.length > 1 ? history[1].consensus_delta : undefined;
    const delta7dAgo = history.length > 7 ? history[7].consensus_delta : undefined;

    // Determine convergence rate
    let convergenceRate = 'stable';
    if (delta24hAgo !== undefined) {
      const change = consensus.consensus_delta - delta24hAgo;
      if (change < -5) convergenceRate = 'accelerating';
      if (change > 5) convergenceRate = 'diverging';
    }

    // Estimate alignment date
    const estimatedAlignmentDate = new Date();
    if (consensus.consensus_delta > 0) {
      estimatedAlignmentDate.setDate(estimatedAlignmentDate.getDate() + 30);
    }

    res.json({
      poll_id: pollId,
      current_snapshot: {
        consensus_delta: consensus.consensus_delta,
        direction: consensus.direction,
        social_pressure_score: consensus.social_pressure_score,
        true_self_yes: consensus.true_self_percentage,
        shadow_yes: consensus.shadow_percentage,
        confidence_interval: consensus.confidence_interval,
        interpretation: consensus.interpretation,
      },
      trend: {
        delta_24h_ago: delta24hAgo,
        delta_7d_ago: delta7dAgo,
        convergence_rate: convergenceRate,
        estimated_alignment_date: estimatedAlignmentDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/v1/analytics/shadow-consensus-history/:pollId
 * Get full Shadow Consensus history for a poll
 */
router.get('/shadow-consensus-history/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const snapshots = await analyticsService.getShadowConsensusHistory(pollId);

    res.json({
      poll_id: pollId,
      total_snapshots: snapshots.length,
      snapshots: snapshots.map((s) => ({
        timestamp: s.snapshot_timestamp,
        consensus_delta: s.consensus_delta,
        direction: s.delta_direction,
        true_self_yes: s.true_self_yes_percent,
        shadow_yes: s.shadow_yes_percent,
        social_pressure: s.social_pressure_score,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// Trend Prediction Routes
// ============================================================================

/**
 * GET /api/v1/analytics/predictions/:pollId
 * Get predictive analytics for opinion shifts
 */
router.get('/predictions/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    // Get current consensus
    const consensus = await analyticsService.calculateShadowConsensus(pollId);

    // Generate prediction
    const prediction = await trendAnalysisService.predictFutureShift(
      pollId,
      consensus.consensus_delta,
      consensus.direction,
      consensus.sample_size
    );

    // Format for API
    const response = trendAnalysisService.formatPredictionResponse(
      pollId,
      prediction,
      consensus.consensus_delta,
      consensus.direction
    );

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/v1/analytics/analyze-conviction
 * Analyze conviction strength by reputation segments
 */
router.post('/analyze-conviction', async (req: Request, res: Response) => {
  try {
    const { poll_id, true_self_delta, shadow_delta, avg_stake_yes, avg_stake_no } = req.body;

    const conviction = await trendAnalysisService.analyzeConvictionStrength(
      poll_id,
      true_self_delta,
      shadow_delta,
      avg_stake_yes,
      avg_stake_no
    );

    res.json({
      poll_id,
      conviction_analysis: conviction,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

/**
 * POST /api/v1/analytics/detect-patterns
 * Detect consensus emergence and cascade patterns
 */
router.post('/detect-patterns', async (req: Request, res: Response) => {
  try {
    const { current_delta, direction, shadow_participation_rate } = req.body;

    const pattern = trendAnalysisService.detectConsensusEmergence(
      current_delta,
      direction,
      shadow_participation_rate
    );

    res.json({
      pattern_analysis: pattern,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// ============================================================================
// Heat Score Routes
// ============================================================================

/**
 * POST /api/v1/analytics/calculate-heat
 * Calculate heat score for any content
 */
router.post('/calculate-heat', async (req: Request, res: Response) => {
  try {
    const { reference_type, reference_id, metrics } = req.body;

    // Validate inputs
    if (!reference_type || !reference_id || !metrics) {
      return res.status(400).json({
        error: 'Missing required fields: reference_type, reference_id, metrics',
      });
    }

    const engagementMetrics: EngagementMetrics = {
      viewsPerHour: metrics.views_per_hour || 0,
      commentsPerHour: metrics.comments_per_hour || 0,
      reactionsPerHour: metrics.reactions_per_hour || 0,
      uniqueViewersPerHour: metrics.unique_viewers_per_hour || 0,
      shareCount: metrics.share_count || 0,
      history: metrics.history || [],
    };

    // Get previous score if exists
    const previousScore = await heatScoreService.getHeatScore(reference_type, reference_id);

    // Store new heat score
    const heatScore = await heatScoreService.storeHeatScore(
      reference_type,
      reference_id,
      engagementMetrics,
      previousScore || undefined
    );

    // Format response
    const response = heatScoreService.formatHeatScoreResponse(heatScore);

    res.json({
      reference_type,
      reference_id,
      ...response,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

/**
 * GET /api/v1/analytics/heat/:referenceType/:referenceId
 * Get current heat score for content
 */
router.get('/heat/:referenceType/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceType, referenceId } = req.params;

    const heatScore = await heatScoreService.getHeatScore(referenceType, referenceId);

    if (!heatScore) {
      return res.status(404).json({ error: 'Heat score not found' });
    }

    const response = heatScoreService.formatHeatScoreResponse(heatScore);

    res.json({
      reference_type: referenceType,
      reference_id: referenceId,
      ...response,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/v1/analytics/trending/:referenceType
 * Get trending content by heat score
 */
router.get('/trending/:referenceType', async (req: Request, res: Response) => {
  try {
    const { referenceType } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const trending = await heatScoreService.getTrendingContent(referenceType, limit);

    res.json({
      reference_type: referenceType,
      count: trending.length,
      items: trending.map((item) => {
        const response = heatScoreService.formatHeatScoreResponse(item);
        return {
          reference_id: item.reference_id,
          ...response,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// Platform Health Routes
// ============================================================================

/**
 * POST /api/v1/analytics/health-metrics
 * Record platform health metrics
 */
router.post('/health-metrics', async (req: Request, res: Response) => {
  try {
    const metricsInput: HealthMetricsInput = {
      window_type: req.body.window_type || 'realtime',
      active_users: req.body.active_users || 0,
      new_users: req.body.new_users || 0,
      verified_humans: req.body.verified_humans || 0,
      dual_identity_users: req.body.dual_identity_users || 0,
      total_votes_cast: req.body.total_votes_cast || 0,
      shadow_participation_rate: req.body.shadow_participation_rate || 0,
      average_session_duration: req.body.average_session_duration || 0,
      polls_created: req.body.polls_created || 0,
      pollcoin_velocity: req.body.pollcoin_velocity || 0,
      gratium_staked: req.body.gratium_staked || 0,
      average_light_score: req.body.average_light_score || 0,
      economic_participation_rate: req.body.economic_participation_rate || 0,
      posts_created: req.body.posts_created || 0,
      comments_created: req.body.comments_created || 0,
      reactions_given: req.body.reactions_given || 0,
      content_quality_score: req.body.content_quality_score || 0,
      api_response_time_ms: req.body.api_response_time_ms || 0,
      error_rate: req.body.error_rate || 0,
      suspected_bot_accounts: req.body.suspected_bot_accounts || 0,
      sybil_attack_probability: req.body.sybil_attack_probability || 0,
    };

    const metrics = await analyticsService.recordHealthMetrics(metricsInput);

    res.json({
      message: 'Health metrics recorded',
      overall_health_score: metrics.overall_health_score,
      health_status: metrics.health_status,
      timestamp: metrics.created_at,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

/**
 * GET /api/v1/analytics/platform-health
 * Get real-time platform health dashboard
 */
router.get('/platform-health', async (req: Request, res: Response) => {
  try {
    const windowType = (req.query.window_type as string) || 'realtime';

    const health = await analyticsService.getPlatformHealth(windowType);

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// Conviction Analysis Routes
// ============================================================================

/**
 * POST /api/v1/analytics/conviction-analysis
 * Analyze conviction patterns by reputation segment
 */
router.post('/conviction-analysis', async (req: Request, res: Response) => {
  try {
    const { poll_id } = req.body;

    if (!poll_id) {
      return res.status(400).json({ error: 'poll_id is required' });
    }

    const analysis = await analyticsService.calculateConvictionAnalysis(poll_id);

    res.json({
      poll_id,
      conviction_analysis: {
        high_reputation: {
          true_self_yes: analysis.high_reputation_true_yes,
          shadow_yes: analysis.high_reputation_shadow_yes,
          delta: analysis.high_reputation_delta,
          sample_size: analysis.high_reputation_count,
        },
        mid_reputation: {
          true_self_yes: analysis.mid_reputation_true_yes,
          shadow_yes: analysis.mid_reputation_shadow_yes,
          delta: analysis.mid_reputation_delta,
          sample_size: analysis.mid_reputation_count,
        },
        low_reputation: {
          true_self_yes: analysis.low_reputation_true_yes,
          shadow_yes: analysis.low_reputation_shadow_yes,
          delta: analysis.low_reputation_delta,
          sample_size: analysis.low_reputation_count,
        },
        overall_reputation_correlation: analysis.reputation_correlation,
        interpretation: analysis.interpretation,
      },
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// ============================================================================
// Health Check Route
// ============================================================================

/**
 * GET /api/v1/analytics/health
 * Simple health check for the module
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    module: 'analytics',
    version: '1.0.0',
    timestamp: new Date(),
  });
});

export default router;
