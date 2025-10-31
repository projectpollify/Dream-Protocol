/**
 * Module 05: Token Exchange - API Routes
 *
 * REST API endpoints for the token exchange module
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import purchaseService from '../services/purchase.service';
import pricingService from '../services/pricing.service';
import dexService from '../services/dex.service';
import complianceService from '../services/compliance.service';
import limitsService from '../services/limits.service';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const TokenTypeSchema = z.enum(['pollcoin', 'gratium']);
const IdentityModeSchema = z.enum(['true_self', 'shadow']);
const FiatCurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
const PaymentProviderSchema = z.enum(['stripe', 'moonpay', 'wyre']);

const GetQuoteSchema = z.object({
  token_type: TokenTypeSchema,
  amount_tokens: z.string(),
  fiat_currency: FiatCurrencySchema,
  payment_method: z.enum(['card', 'bank', 'other']).optional(),
});

const InitiatePurchaseSchema = z.object({
  token_type: TokenTypeSchema,
  amount_tokens: z.string(),
  fiat_currency: FiatCurrencySchema,
  payment_provider: PaymentProviderSchema,
  identity_mode: IdentityModeSchema,
});

const CompletePurchaseSchema = z.object({
  purchase_id: z.string().uuid(),
  payment_intent_id: z.string(),
});

const ReportViolationSchema = z.object({
  dex_name: z.string(),
  pool_address: z.string().optional(),
  violation_type: z.enum([
    'lending_integration_detected',
    'shorting_enabled_on_pool',
    'margin_trading_enabled',
    'flash_loan_enabled',
    'unusual_volume_spike',
    'price_manipulation_suspected',
    'whale_accumulation',
    'regulatory_concern',
  ]),
  description: z.string(),
  evidence_url: z.string().url().optional(),
});

// ============================================================================
// Middleware - Extract user context
// ============================================================================

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
// GET /api/v1/exchange/prices
// Get real-time token prices from all sources
// ============================================================================

router.get('/prices', async (req: Request, res: Response) => {
  try {
    const tokens = req.query.tokens
      ? (req.query.tokens as string).split(',')
      : ['pollcoin', 'gratium'];
    const sources = req.query.sources
      ? (req.query.sources as string).split(',')
      : ['on_platform', 'market'];

    const prices = await pricingService.getPrices({ tokens, sources });

    res.json(prices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/v1/exchange/quote
// Get a purchase quote (valid for 5 minutes)
// ============================================================================

router.post('/quote', async (req: Request, res: Response) => {
  try {
    const validated = GetQuoteSchema.parse(req.body);
    const quote = await purchaseService.getQuote(validated);

    res.json(quote);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/v1/exchange/initiate-purchase
// Initiate a token purchase
// ============================================================================

router.post('/initiate-purchase', extractUserContext, async (req: Request, res: Response) => {
  try {
    const validated = InitiatePurchaseSchema.parse(req.body);
    const purchase = await purchaseService.initiatePurchase({
      ...validated,
      user_id: req.user!.userId,
    });

    res.json(purchase);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/v1/exchange/complete-purchase
// Complete a purchase (after payment provider confirms)
// ============================================================================

router.post('/complete-purchase', extractUserContext, async (req: Request, res: Response) => {
  try {
    const validated = CompletePurchaseSchema.parse(req.body);
    const result = await purchaseService.completePurchase({
      ...validated,
      user_id: req.user!.userId,
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/exchange/purchase-history
// Get user's purchase history
// ============================================================================

router.get('/purchase-history', extractUserContext, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const status = req.query.status as any;

    const history = await purchaseService.getPurchaseHistory({
      user_id: req.user!.userId,
      limit,
      offset,
      status,
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/exchange/dex-listings
// Get monitored DEX listings (public)
// ============================================================================

router.get('/dex-listings', async (req: Request, res: Response) => {
  try {
    const tokenType = req.query.token_type as any;
    const listings = await dexService.getDexListings(tokenType);

    res.json(listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/exchange/compliance-status
// Get system-wide spot-only compliance status (public)
// ============================================================================

router.get('/compliance-status', async (req: Request, res: Response) => {
  try {
    const status = await complianceService.getComplianceStatus();

    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// POST /api/v1/exchange/report-violation
// User reports suspected spot-only violation
// ============================================================================

router.post('/report-violation', extractUserContext, async (req: Request, res: Response) => {
  try {
    const validated = ReportViolationSchema.parse(req.body);
    const report = await complianceService.reportViolation({
      ...validated,
      user_id: req.user!.userId,
    });

    res.json(report);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/exchange/limits
// Get user's purchase limits and tier info
// ============================================================================

router.get('/limits', extractUserContext, async (req: Request, res: Response) => {
  try {
    const limits = await limitsService.getPurchaseLimits(req.user!.userId);

    res.json(limits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/v1/exchange/tiers
// Get information about all verification tiers (public)
// ============================================================================

router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const tierInfo = limitsService.getTierInfo();

    res.json(tierInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    module: 'token-exchange',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
