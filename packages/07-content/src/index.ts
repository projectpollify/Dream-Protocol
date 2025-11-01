/**
 * Module 07: Content
 * Posts, discussions, comments with dual-identity support for Dream Protocol
 */

import express, { Express } from 'express';
import * as dotenv from 'dotenv';
import contentRoutes from './routes/content.routes';
import { healthCheck } from './utils/database';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await healthCheck();
  if (dbHealthy) {
    res.json({
      status: 'healthy',
      module: 'content',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      module: 'content',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/v1/content', contentRoutes);

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
    console.log(`✅ Module 07: Content server running on port ${PORT}`);
    console.log(`📝 POST    /api/v1/content/posts`);
    console.log(`📖 GET     /api/v1/content/posts`);
    console.log(`📖 GET     /api/v1/content/posts/:postId`);
    console.log(`✏️  PATCH   /api/v1/content/posts/:postId`);
    console.log(`🗑️  DELETE  /api/v1/content/posts/:postId`);
    console.log(`🚩 POST    /api/v1/content/posts/:postId/flag`);
    console.log(`💬 POST    /api/v1/content/comments`);
    console.log(`📖 GET     /api/v1/content/posts/:postId/comments`);
    console.log(`🗨️  POST    /api/v1/content/discussions`);
    console.log(`📖 GET     /api/v1/content/discussions`);
    console.log(`🛡️  GET     /api/v1/content/admin/reports`);
    console.log(`🏥 GET     /health`);
  });
}

// Export for testing
export default app;

// Export services for other modules
export { default as postService } from './services/post.service';
export { default as commentService } from './services/comment.service';
export { default as discussionService } from './services/discussion.service';
export { default as moderationService } from './services/moderation.service';

// Export types
export * from './types';
