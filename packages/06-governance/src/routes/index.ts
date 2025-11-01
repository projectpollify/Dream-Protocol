/**
 * Module 06: Governance - Routes Index
 * Aggregates all route modules
 */

import { Router } from 'express';
import governanceRoutes from './governance.routes';

const router = Router();

// Mount governance routes at /api/v1/governance
router.use('/governance', governanceRoutes);

export default router;
