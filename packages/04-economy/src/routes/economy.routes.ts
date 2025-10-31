/**
 * Module 04: Economy - API Routes
 *
 * REST API endpoints for the economy module
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import ledgerService from '../services/ledger.service';
import transferService from '../services/transfer.service';
import lockService from '../services/lock.service';
import lightScoreService from '../services/light-score.service';
import transactionService from '../services/transaction.service';
import { parseTokenAmount } from '../types/economy.types';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const IdentityModeSchema = z.enum(['true_self', 'shadow']);
const TokenTypeSchema = z.enum(['pollcoin', 'gratium']);

const InitializeBalancesSchema = z.object({
  userId: z.string().uuid(),
  identityMode: IdentityModeSchema,
  initialPollCoin: z.string().optional(),
  initialGratium: z.string().optional(),
});

const TransferSchema = z.object({
  to_user_id: z.string().uuid(),
  to_identity_mode: IdentityModeSchema,
  token_type: TokenTypeSchema,
  amount: z.string(),
  memo: z.string().optional(),
});

const StakeSchema = z.object({
  token_type: TokenTypeSchema,
  amount: z.string(),
  lock_type: z.enum([
    'governance_stake',
    'veracity_bond',
    'prediction_market',
    'poll_stake',
    'escrow',
    'penalty',
    'cooldown',
  ]),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  unlock_at: z.string().datetime().optional(),
});

// ============================================================================
// Middleware - Extract user context
// ============================================================================

// This middleware would extract userId and identityMode from auth token
// For now, we'll use headers
function extractUserContext(req: Request, res: Response, next: Function) {
  const userId = req.headers['x-user-id'] as string;
  const identityMode = req.headers['x-identity-mode'] as string;

  if (!userId || !identityMode) {
    return res.status(401).json({
      error: 'Missing user context headers (x-user-id, x-identity-mode)',
    });
  }

  if (!['true_self', 'shadow'].includes(identityMode)) {
    return res.status(400).json({
      error: 'Invalid identity mode. Must be true_self or shadow',
    });
  }

  req.user = {
    userId,
    identityMode: identityMode as 'true_self' | 'shadow',
  };

  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        identityMode: 'true_self' | 'shadow';
      };
    }
  }
}

// ============================================================================
// GET /api/v1/economy/balances
// Get user's token balances
// ============================================================================

router.get('/balances', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;

    const balances = await ledgerService.getUserBalances({
      userId,
      identityMode,
    });

    res.json(balances);
  } catch (error: any) {
    console.error('Get balances error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/v1/economy/transfer
// Transfer tokens to another user
// ============================================================================

router.post('/transfer', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;
    const data = TransferSchema.parse(req.body);

    const result = await transferService.transferTokens({
      fromUserId: userId,
      fromIdentityMode: identityMode,
      toUserId: data.to_user_id,
      toIdentityMode: data.to_identity_mode,
      tokenType: data.token_type,
      amount: parseTokenAmount(data.amount),
      memo: data.memo,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Transfer error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// POST /api/v1/economy/tip
// Tip Gratium to another user
// ============================================================================

router.post('/tip', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;
    const schema = z.object({
      to_user_id: z.string().uuid(),
      to_identity_mode: IdentityModeSchema,
      amount: z.string(),
      reference_type: z.string().optional(),
      reference_id: z.string().uuid().optional(),
      memo: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const result = await transferService.tipTokens(
      userId,
      identityMode,
      data.to_user_id,
      data.to_identity_mode,
      parseTokenAmount(data.amount),
      data.reference_type,
      data.reference_id,
      data.memo
    );

    res.json(result);
  } catch (error: any) {
    console.error('Tip error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// POST /api/v1/economy/stake
// Lock tokens (stake for governance, bonds, etc.)
// ============================================================================

router.post('/stake', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;
    const data = StakeSchema.parse(req.body);

    const result = await lockService.lockTokens({
      userId,
      identityMode,
      tokenType: data.token_type,
      amount: parseTokenAmount(data.amount),
      lockType: data.lock_type,
      referenceType: data.reference_type,
      referenceId: data.reference_id,
      unlockAt: data.unlock_at ? new Date(data.unlock_at) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Stake error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// POST /api/v1/economy/unstake
// Release locked tokens
// ============================================================================

router.post('/unstake', extractUserContext, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      lock_id: z.string().uuid(),
    });

    const data = schema.parse(req.body);

    const result = await lockService.releaseLockedTokens(data.lock_id);

    res.json(result);
  } catch (error: any) {
    console.error('Unstake error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// GET /api/v1/economy/locks
// Get user's active locks
// ============================================================================

router.get('/locks', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;

    const locks = await lockService.getUserLocks(userId, identityMode);

    res.json({ locks });
  } catch (error: any) {
    console.error('Get locks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/economy/transactions
// Get transaction history
// ============================================================================

router.get('/transactions', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;

    const schema = z.object({
      token_type: TokenTypeSchema.optional(),
      transaction_type: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
      offset: z.coerce.number().min(0).optional(),
    });

    const params = schema.parse(req.query);

    const history = await transactionService.getTransactionHistory({
      userId,
      identityMode,
      tokenType: params.token_type as any,
      transactionType: params.transaction_type as any,
      limit: params.limit,
      offset: params.offset,
    });

    res.json(history);
  } catch (error: any) {
    console.error('Get transactions error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// GET /api/v1/economy/transaction/:id
// Get single transaction by ID
// ============================================================================

router.get('/transaction/:id', async (req: Request, res: Response) => {
  try {
    const transactionId = req.params.id;

    const transaction = await transactionService.getTransactionById(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/economy/stats
// Get user transaction statistics
// ============================================================================

router.get('/stats', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId, identityMode } = req.user!;

    const stats = await transactionService.getUserTransactionStats(
      userId,
      identityMode
    );

    res.json(stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/economy/light-score
// Get Light Score for current user
// ============================================================================

router.get('/light-score', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;

    const lightScore = await lightScoreService.getLightScore(userId);

    if (!lightScore) {
      return res.status(404).json({ error: 'Light Score not found' });
    }

    res.json(lightScore);
  } catch (error: any) {
    console.error('Get Light Score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/economy/light-score/history
// Get Light Score history
// ============================================================================

router.get('/light-score/history', extractUserContext, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;

    const schema = z.object({
      limit: z.coerce.number().min(1).max(200).optional(),
    });

    const params = schema.parse(req.query);

    const history = await lightScoreService.getLightScoreHistory(
      userId,
      params.limit
    );

    res.json(history);
  } catch (error: any) {
    console.error('Get Light Score history error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================================================
// GET /api/v1/economy/supply
// Get token supply metrics (public)
// ============================================================================

router.get('/supply', async (req: Request, res: Response) => {
  try {
    const supply = await transactionService.getTokenSupply();
    res.json(supply);
  } catch (error: any) {
    console.error('Get supply error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/economy/health
// Health check endpoint
// ============================================================================

router.get('/health', async (req: Request, res: Response) => {
  try {
    const { healthCheck } = await import('../utils/database');
    const healthy = await healthCheck();

    if (healthy) {
      res.json({ status: 'healthy', module: 'economy' });
    } else {
      res.status(503).json({ status: 'unhealthy', module: 'economy' });
    }
  } catch (error: any) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

export default router;
