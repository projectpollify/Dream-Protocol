/**
 * Module 09: Verification - Routes
 * Multi-layer trust discovery system routes
 */

import { Router, Request, Response } from 'express';
import { proofOfHumanityService } from '../services/proof-of-humanity.service';
import { veracityBondService } from '../services/veracity-bond.service';
import { PredictionMarketService } from '../services/prediction-market.service';
import { EpistemicScoringService } from '../services/epistemic-scoring.service';

const router: Router = Router();

// ============================================================================
// Proof of Humanity Routes
// ============================================================================

router.post('/poh/initiate', async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.body;
    const session = await proofOfHumanityService.initiateVerification(userId, identityMode);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/poh/verify', async (req: Request, res: Response) => {
  try {
    const { userId, identityMode, method, data } = req.body;
    const result = await proofOfHumanityService.submitVerificationMethod(
      userId,
      identityMode,
      method,
      data
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/poh/status/:userId/:identityMode', async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.params;
    const status = await proofOfHumanityService.getVerificationStatus(
      userId,
      identityMode as 'true_self' | 'shadow'
    );
    res.json(status);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/poh/access/:userId/:feature', async (req: Request, res: Response) => {
  try {
    const { userId, feature } = req.params;
    const hasAccess = await proofOfHumanityService.checkAccess(userId, feature);
    res.json({ hasAccess });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Veracity Bond Routes
// ============================================================================

router.post('/bonds', async (req: Request, res: Response) => {
  try {
    const { userId, identityMode, targetType, targetId, amount, claimText, confidence } = req.body;
    const bond = await veracityBondService.createBond(
      userId,
      identityMode,
      targetType,
      targetId,
      BigInt(amount),
      claimText,
      confidence
    );
    res.json(bond);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/bonds/:bondId', async (req: Request, res: Response) => {
  try {
    const bond = await veracityBondService.getBond(req.params.bondId);
    if (!bond) {
      return res.status(404).json({ error: 'Bond not found' });
    }
    res.json(bond);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/bonds/user/:userId/:identityMode', async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.params;
    const bonds = await veracityBondService.getUserBonds(
      userId,
      identityMode as 'true_self' | 'shadow'
    );
    res.json(bonds);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/bonds/:bondId/challenge', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const { challengerId, amount, reason, evidence } = req.body;
    const challenge = await veracityBondService.challengeBond(
      bondId,
      challengerId,
      BigInt(amount),
      reason,
      evidence
    );
    res.json(challenge);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/bonds/:bondId/resolve', async (req: Request, res: Response) => {
  try {
    const { bondId } = req.params;
    const { truthful, evidence } = req.body;
    const resolution = await veracityBondService.resolveBond(bondId, truthful, evidence);
    res.json(resolution);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Prediction Market Routes (LMSR-based)
// ============================================================================

router.post('/markets', async (req: Request, res: Response) => {
  try {
    const { creatorId, question, description, liquidityParameter, closesAt, category } = req.body;
    const market = await PredictionMarketService.createMarket(
      creatorId,
      question,
      description,
      liquidityParameter,
      new Date(closesAt),
      category
    );
    res.json(market);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/markets/:marketId', async (req: Request, res: Response) => {
  try {
    const market = await PredictionMarketService.getMarket(req.params.marketId);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    res.json(market);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/markets', async (req: Request, res: Response) => {
  try {
    const { status, category, creatorId, limit, offset } = req.query;
    const markets = await PredictionMarketService.listMarkets({
      status: status as any,
      category: category as string,
      creatorId: creatorId as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(markets);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/markets/:marketId/quote/:outcome', async (req: Request, res: Response) => {
  try {
    const { marketId, outcome } = req.params;
    const { shares } = req.query;
    const market = await PredictionMarketService.getMarket(marketId);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    const quote = PredictionMarketService.calculateBuyQuote(
      market,
      outcome as any,
      parseInt(shares as string) || 100
    );
    res.json(quote);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/markets/:marketId/buy', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const { userId, identityMode, outcome, shares, maxCost } = req.body;
    const trade = await PredictionMarketService.buyShares(
      marketId,
      userId,
      identityMode,
      outcome,
      shares,
      BigInt(maxCost)
    );
    res.json(trade);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/markets/:marketId/sell', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const { userId, identityMode, outcome, shares } = req.body;
    const trade = await PredictionMarketService.sellShares(marketId, userId, identityMode, outcome, shares);
    res.json(trade);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/markets/:marketId/history', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const { limit, offset } = req.query;
    const trades = await PredictionMarketService.getTradeHistory(
      marketId,
      limit ? parseInt(limit as string) : 100,
      offset ? parseInt(offset as string) : 0
    );
    res.json(trades);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/markets/:marketId/resolve', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const { resolution, source } = req.body;
    const market = await PredictionMarketService.resolveMarket(marketId, resolution, source);
    res.json(market);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Epistemic Scoring Routes (5-Layer Funnel)
// ============================================================================

router.post('/epistemic/score', async (req: Request, res: Response) => {
  try {
    const { targetType, targetId, analysisData, authorPohLevel, authorLightScore } = req.body;
    const score = await EpistemicScoringService.calculateScore(
      targetType,
      targetId,
      analysisData,
      authorPohLevel,
      authorLightScore
    );
    res.json(score);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/epistemic/score/:targetType/:targetId', async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const score = await EpistemicScoringService.getScore(targetType as any, targetId);
    if (!score) {
      return res.status(404).json({ error: 'Score not found' });
    }
    res.json(score);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/epistemic/history/:targetType/:targetId', async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const { limit } = req.query;
    const history = await EpistemicScoringService.getScoreHistory(
      targetType as any,
      targetId,
      limit ? parseInt(limit as string) : 10
    );
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/epistemic/top/:targetType', async (req: Request, res: Response) => {
  try {
    const { targetType } = req.params;
    const { limit, minScore } = req.query;
    const top = await EpistemicScoringService.getTopContent(
      targetType as any,
      limit ? parseInt(limit as string) : 20,
      minScore ? parseInt(minScore as string) : undefined
    );
    res.json(top);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/epistemic/analyze/:scoreId', async (req: Request, res: Response) => {
  try {
    const { scoreId } = req.params;
    // Fetch the score
    const sql = `SELECT * FROM epistemic_scores WHERE id = $1`;
    const { query: dbQuery } = require('../database');
    const result = await dbQuery(sql, [scoreId]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Score not found' });
    }
    const score = result.rows[0];
    const analysis = EpistemicScoringService.analyzeScoreLayers(score);
    res.json(analysis);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    module: 'verification',
    timestamp: new Date().toISOString(),
  });
});

export default router;
