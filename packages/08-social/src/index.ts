/**
 * Module 08: Social
 * Reactions, follows, notifications & activity feeds with dual-identity support for Dream Protocol
 */

import express, { Express } from 'express';
import * as dotenv from 'dotenv';
import socialRoutes from './routes/social.routes';
import { healthCheck } from './utils/database';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await healthCheck();
  if (dbHealthy) {
    res.json({
      status: 'healthy',
      module: 'social',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      module: 'social',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/v1/social', socialRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✅ Module 08: Social server running on port ${PORT}`);
    console.log(`👍 POST    /api/v1/social/reactions`);
    console.log(`🗑️  DELETE  /api/v1/social/reactions/:id`);
    console.log(`👥 POST    /api/v1/social/follows`);
    console.log(`👋 DELETE  /api/v1/social/follows`);
    console.log(`🔔 GET     /api/v1/social/notifications`);
    console.log(`📰 GET     /api/v1/social/feed`);
    console.log(`🔥 GET     /api/v1/social/trending`);
    console.log(`🚫 POST    /api/v1/social/blocks`);
    console.log(`🏥 GET     /health`);
  });
}

// Export for testing
export default app;

// Export services for other modules
export { default as reactionService } from './services/reaction.service';
export { default as followService } from './services/follow.service';
export { default as notificationService } from './services/notification.service';
export { default as feedService } from './services/feed.service';
export { default as blockService } from './services/block.service';

// Export types
export * from './types';
