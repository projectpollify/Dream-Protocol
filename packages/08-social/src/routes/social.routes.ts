/**
 * Module 08: Social - API Routes
 * RESTful endpoints for reactions, follows, notifications, feeds, and blocks
 */

import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import reactionService from '../services/reaction.service';
import followService from '../services/follow.service';
import notificationService from '../services/notification.service';
import feedService from '../services/feed.service';
import blockService from '../services/block.service';

const router: RouterType = Router();

// ============================================================================
// REACTION ENDPOINTS
// ============================================================================

// Add reaction
router.post('/reactions', async (req: Request, res: Response) => {
  try {
    const reaction = await reactionService.addReaction(req.body);
    res.status(201).json(reaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove reaction
router.delete('/reactions/:id', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    await reactionService.removeReaction(req.params.id, user_id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get reactions for post
router.get('/posts/:postId/reactions', async (req: Request, res: Response) => {
  try {
    const reactions = await reactionService.getReactionsForContent(req.params.postId);
    res.json(reactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get reactions for comment
router.get('/comments/:commentId/reactions', async (req: Request, res: Response) => {
  try {
    const reactions = await reactionService.getReactionsForContent(undefined, req.params.commentId);
    res.json(reactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's reaction to content
router.get('/reactions/user/:userId', async (req: Request, res: Response) => {
  try {
    const { post_id, comment_id } = req.query;
    const reaction = await reactionService.getUserReaction(
      req.params.userId,
      post_id as string,
      comment_id as string
    );
    res.json({ reaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FOLLOW ENDPOINTS
// ============================================================================

// Follow user
router.post('/follows', async (req: Request, res: Response) => {
  try {
    const follow = await followService.followUser(req.body);
    res.status(201).json(follow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Unfollow user
router.delete('/follows', async (req: Request, res: Response) => {
  try {
    await followService.unfollowUser(req.body);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get followers
router.get('/users/:userId/followers', async (req: Request, res: Response) => {
  try {
    const { identity_mode, limit, offset } = req.query;
    const followers = await followService.getFollowers(
      req.params.userId,
      identity_mode as string || 'true_self',
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(followers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get following
router.get('/users/:userId/following', async (req: Request, res: Response) => {
  try {
    const { identity_mode, limit, offset } = req.query;
    const following = await followService.getFollowing(
      req.params.userId,
      identity_mode as string || 'true_self',
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(following);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check if following
router.get('/follows/check', async (req: Request, res: Response) => {
  try {
    const { follower_user_id, follower_identity_mode, followee_user_id, followee_identity_mode } = req.query;
    const isFollowing = await followService.isFollowing(
      follower_user_id as string,
      follower_identity_mode as string,
      followee_user_id as string,
      followee_identity_mode as string
    );
    res.json({ is_following: isFollowing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get follow counts
router.get('/users/:userId/follow-counts', async (req: Request, res: Response) => {
  try {
    const { identity_mode } = req.query;
    const counts = await followService.getFollowCounts(
      req.params.userId,
      identity_mode as string || 'true_self'
    );
    res.json(counts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

// Create notification
router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { user_id, limit, offset } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const notifications = await notificationService.getNotifications(
      user_id as string,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread notifications
router.get('/notifications/unread', async (req: Request, res: Response) => {
  try {
    const { user_id, limit, offset } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const notifications = await notificationService.getUnreadNotifications(
      user_id as string,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/notifications/count', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const count = await notificationService.getUnreadCount(user_id as string);
    res.json({ unread_count: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const notification = await notificationService.markAsRead(req.params.id, user_id);
    res.json(notification);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Mark all as read
router.patch('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const count = await notificationService.markAllAsRead(user_id);
    res.json({ marked_read: count });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get notification preferences
router.get('/notifications/preferences', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const preferences = await notificationService.getPreferences(user_id as string);
    res.json(preferences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification preferences
router.patch('/notifications/preferences', async (req: Request, res: Response) => {
  try {
    const { user_id, ...updates } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const preferences = await notificationService.updatePreferences(user_id, updates);
    res.json(preferences);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// FEED ENDPOINTS
// ============================================================================

// Get personalized feed
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { user_id, identity_mode, limit, offset } = req.query;
    if (!user_id || !identity_mode) {
      return res.status(400).json({ error: 'user_id and identity_mode are required' });
    }
    const feed = await feedService.getPersonalizedFeed(
      user_id as string,
      identity_mode as string,
      parseInt(limit as string) || 20,
      parseInt(offset as string) || 0
    );
    res.json(feed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get trending content
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { timeframe, limit } = req.query;
    const trending = await feedService.getTrendingActivities(
      parseInt(timeframe as string) || 24,
      parseInt(limit as string) || 20
    );
    res.json(trending);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user activities
router.get('/users/:userId/activities', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const activities = await feedService.getUserActivities(
      req.params.userId,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Log activity
router.post('/activities', async (req: Request, res: Response) => {
  try {
    const activity = await feedService.logActivity(req.body);
    res.status(201).json(activity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// BLOCK ENDPOINTS
// ============================================================================

// Block user
router.post('/blocks', async (req: Request, res: Response) => {
  try {
    const block = await blockService.blockUser(req.body);
    res.status(201).json(block);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Unblock user
router.delete('/blocks', async (req: Request, res: Response) => {
  try {
    const { blocker_user_id, blocker_identity_mode, blocked_user_id } = req.body;
    if (!blocker_user_id || !blocker_identity_mode || !blocked_user_id) {
      return res.status(400).json({ error: 'blocker_user_id, blocker_identity_mode, and blocked_user_id are required' });
    }
    await blockService.unblockUser(blocker_user_id, blocker_identity_mode, blocked_user_id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get blocked users
router.get('/blocks', async (req: Request, res: Response) => {
  try {
    const { user_id, identity_mode, limit, offset } = req.query;
    if (!user_id || !identity_mode) {
      return res.status(400).json({ error: 'user_id and identity_mode are required' });
    }
    const blocked = await blockService.getBlockedUsers(
      user_id as string,
      identity_mode as string,
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(blocked);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user is blocked
router.get('/blocks/check', async (req: Request, res: Response) => {
  try {
    const { blocker_user_id, blocker_identity_mode, blocked_user_id } = req.query;
    if (!blocker_user_id || !blocker_identity_mode || !blocked_user_id) {
      return res.status(400).json({ error: 'blocker_user_id, blocker_identity_mode, and blocked_user_id are required' });
    }
    const isBlocked = await blockService.isUserBlocked(
      blocker_user_id as string,
      blocker_identity_mode as string,
      blocked_user_id as string
    );
    res.json({ is_blocked: isBlocked });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
