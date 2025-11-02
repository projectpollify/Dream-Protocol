/**
 * Module 09: Verification
 * Multi-layer trust discovery system for Dream Protocol
 *
 * Exports:
 * - Services: Proof of Humanity, Veracity Bonds, Prediction Markets, Epistemic Scoring, Content NFT, Thalyra AI
 * - Types: All verification system types
 * - Database: Pool and utilities
 */

// Services
export { proofOfHumanityService } from './services/proof-of-humanity.service';
export { veracityBondService } from './services/veracity-bond.service';

// Types
export * from './types';

// Database
export { getPool, closePool, query, queryOne, runMigration, runAllMigrations } from './database';

// ============================================================================
// Standalone Server Mode
// ============================================================================

import express, { Request, Response } from 'express';
import { runAllMigrations } from './database';
import { proofOfHumanityService } from './services/proof-of-humanity.service';
import { veracityBondService } from './services/veracity-bond.service';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3009;

  // Middleware
  app.use(express.json());

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      module: 'verification',
      timestamp: new Date().toISOString(),
    });
  });

  // ========================================================================
  // Proof of Humanity Routes
  // ========================================================================

  app.post('/poh/initiate', async (req: Request, res: Response) => {
    try {
      const { userId, identityMode } = req.body;
      const session = await proofOfHumanityService.initiateVerification(userId, identityMode);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/poh/verify', async (req: Request, res: Response) => {
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

  app.get('/poh/status/:userId/:identityMode', async (req: Request, res: Response) => {
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

  app.get('/poh/access/:userId/:feature', async (req: Request, res: Response) => {
    try {
      const { userId, feature } = req.params;
      const hasAccess = await proofOfHumanityService.checkAccess(userId, feature);
      res.json({ hasAccess });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========================================================================
  // Veracity Bond Routes
  // ========================================================================

  app.post('/bonds', async (req: Request, res: Response) => {
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

  app.get('/bonds/:bondId', async (req: Request, res: Response) => {
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

  app.get('/bonds/user/:userId/:identityMode', async (req: Request, res: Response) => {
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

  app.post('/bonds/:bondId/challenge', async (req: Request, res: Response) => {
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

  app.post('/bonds/:bondId/resolve', async (req: Request, res: Response) => {
    try {
      const { bondId } = req.params;
      const { truthful, evidence } = req.body;
      const resolution = await veracityBondService.resolveBond(bondId, truthful, evidence);
      res.json(resolution);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Initialize database and start server
  try {
    console.log('📦 Running migrations...');
    await runAllMigrations();
    console.log('✅ Migrations completed!');

    app.listen(PORT, () => {
      console.log(`🚀 Module 09: Verification server running on port ${PORT}`);
      console.log(`📊 Endpoints:`);
      console.log(`   POST /poh/initiate - Start verification session`);
      console.log(`   POST /poh/verify - Submit verification method`);
      console.log(`   GET  /poh/status/:userId/:identityMode - Check status`);
      console.log(`   GET  /poh/access/:userId/:feature - Check feature access`);
      console.log(`   POST /bonds - Create bond`);
      console.log(`   GET  /bonds/:bondId - Get bond`);
      console.log(`   GET  /bonds/user/:userId/:identityMode - Get user bonds`);
      console.log(`   POST /bonds/:bondId/challenge - Challenge bond`);
      console.log(`   POST /bonds/:bondId/resolve - Resolve bond`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this is the main module
if (require.main === module) {
  startServer();
}
