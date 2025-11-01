/**
 * Module 07: Content - API Routes
 * RESTful endpoints for posts, discussions, comments, and moderation
 */

import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import postService from '../services/post.service';
import commentService from '../services/comment.service';
import discussionService from '../services/discussion.service';
import moderationService from '../services/moderation.service';

const router: RouterType = Router();

// ============================================================================
// POST ENDPOINTS
// ============================================================================

// Create post
router.post('/posts', async (req: Request, res: Response) => {
  try {
    const post = await postService.createPost(req.body);
    res.status(201).json(post);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get post
router.get('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const post = await postService.getPost(req.params.postId, req.body.user_id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update post
router.patch('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { user_id, ...updates } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const post = await postService.updatePost(req.params.postId, user_id, updates);
    res.json(post);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete post
router.delete('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    await postService.deletePost(req.params.postId, user_id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// List posts
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const options = {
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
      category: req.query.category as string,
      identity_mode: req.query.identity_mode as 'true_self' | 'shadow',
      content_type: req.query.content_type as any,
      user_id: req.query.user_id as string,
      sort_by: req.query.sort_by as any,
      order: req.query.order as 'asc' | 'desc',
    };
    const result = await postService.listPosts(options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Flag post
router.post('/posts/:postId/flag', async (req: Request, res: Response) => {
  try {
    await postService.flagPost({
      ...req.body,
      post_id: req.params.postId,
    });
    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get post edit history
router.get('/posts/:postId/history', async (req: Request, res: Response) => {
  try {
    const history = await postService.getPostEditHistory(req.params.postId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// COMMENT ENDPOINTS
// ============================================================================

// Create comment
router.post('/comments', async (req: Request, res: Response) => {
  try {
    const comment = await commentService.createComment(req.body);
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get comment thread
router.get('/comments/:commentId/thread', async (req: Request, res: Response) => {
  try {
    const thread = await commentService.getCommentThread(req.params.commentId);
    if (!thread) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json(thread);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
router.delete('/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    await commentService.deleteComment(req.params.commentId, user_id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get post comments
router.get('/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const options = {
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    };
    const result = await commentService.getPostComments(req.params.postId, options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get discussion comments
router.get('/discussions/:discussionId/comments', async (req: Request, res: Response) => {
  try {
    const options = {
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    };
    const result = await commentService.getDiscussionComments(req.params.discussionId, options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DISCUSSION ENDPOINTS
// ============================================================================

// Create discussion
router.post('/discussions', async (req: Request, res: Response) => {
  try {
    const discussion = await discussionService.createDiscussion(req.body);
    res.status(201).json(discussion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get discussion
router.get('/discussions/:discussionId', async (req: Request, res: Response) => {
  try {
    const discussion = await discussionService.getDiscussion(req.params.discussionId);
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    res.json(discussion);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List discussions
router.get('/discussions', async (req: Request, res: Response) => {
  try {
    const options = {
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
      topic: req.query.topic as string,
      is_open: req.query.is_open === 'true' ? true : req.query.is_open === 'false' ? false : undefined,
      user_id: req.query.user_id as string,
      sort_by: req.query.sort_by as any,
      order: req.query.order as 'asc' | 'desc',
    };
    const result = await discussionService.listDiscussions(options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update discussion
router.patch('/discussions/:discussionId', async (req: Request, res: Response) => {
  try {
    const { user_id, ...updates } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const discussion = await discussionService.updateDiscussion(
      req.params.discussionId,
      user_id,
      updates
    );
    res.json(discussion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Archive discussion
router.post('/discussions/:discussionId/archive', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    await discussionService.archiveDiscussion(req.params.discussionId, user_id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete discussion
router.delete('/discussions/:discussionId', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    await discussionService.deleteDiscussion(req.params.discussionId, user_id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// MODERATION ENDPOINTS (ADMIN ONLY)
// ============================================================================

// Get pending reports
router.get('/admin/reports', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await moderationService.getPendingReports(limit, offset);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get report
router.get('/admin/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const report = await moderationService.getReport(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve report
router.post('/admin/reports/:reportId/resolve', async (req: Request, res: Response) => {
  try {
    await moderationService.resolveReport(req.params.reportId, req.body);
    res.json({ message: 'Report resolved successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Hide content
router.post('/admin/content/:contentType/:contentId/hide', async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;
    const { reason, moderator_id } = req.body;

    if (!['post', 'comment'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    await moderationService.hideContent(
      contentId,
      contentType as 'post' | 'comment',
      reason,
      moderator_id
    );
    res.json({ message: 'Content hidden successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove content
router.post('/admin/content/:contentType/:contentId/remove', async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;
    const { reason, moderator_id } = req.body;

    if (!['post', 'comment'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    await moderationService.removeContent(
      contentId,
      contentType as 'post' | 'comment',
      reason,
      moderator_id
    );
    res.json({ message: 'Content removed successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Approve content
router.post('/admin/content/:contentType/:contentId/approve', async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;
    const { moderator_id } = req.body;

    if (!['post', 'comment'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    await moderationService.approveContent(
      contentId,
      contentType as 'post' | 'comment',
      moderator_id
    );
    res.json({ message: 'Content approved successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get flagged content
router.get('/admin/flagged/:contentType', async (req: Request, res: Response) => {
  try {
    const { contentType } = req.params;

    if (!['post', 'comment'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await moderationService.getFlaggedContent(
      contentType as 'post' | 'comment',
      limit,
      offset
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get moderation stats
router.get('/admin/stats', async (req: Request, res: Response) => {
  try {
    const stats = await moderationService.getModerationStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
