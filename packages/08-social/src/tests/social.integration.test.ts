/**
 * Module 08: Social - Integration Tests
 * End-to-end tests for complete social workflows
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import reactionService from '../services/reaction.service';
import followService from '../services/follow.service';
import notificationService from '../services/notification.service';
import feedService from '../services/feed.service';
import blockService from '../services/block.service';
import { query } from '../utils/database';

describe('Social Integration Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let testPostId: string;

  beforeAll(async () => {
    // Create test users
    const user1Result = await query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id`,
      ['social_user1', 'social1@test.com']
    );
    user1Id = user1Result.rows[0].id;

    const user2Result = await query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id`,
      ['social_user2', 'social2@test.com']
    );
    user2Id = user2Result.rows[0].id;

    // Create test post
    const postResult = await query(
      `INSERT INTO posts (user_id, identity_mode, author_display_name, title, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user1Id, 'true_self', 'User 1', 'Test Post', 'This is a test post']
    );
    testPostId = postResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM posts WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
  });

  describe('Follow → See feed workflow', () => {
    it('should show content in feed after following user', async () => {
      // 1. User 2 follows User 1
      await followService.followUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'true_self',
        followee_user_id: user1Id,
        followee_identity_mode: 'true_self',
      });

      // 2. Verify follow was created
      const isFollowing = await followService.isFollowing(
        user2Id,
        'true_self',
        user1Id,
        'true_self'
      );
      expect(isFollowing).toBe(true);

      // 3. User 1 creates activity
      await feedService.logActivity({
        user_id: user1Id,
        identity_mode: 'true_self',
        display_name: 'User 1',
        activity_type: 'post_created',
        post_id: testPostId,
        content_preview: 'This is a test post',
        content_type: 'post',
      });

      // 4. User 2's feed should show User 1's activity
      const feed = await feedService.getPersonalizedFeed(user2Id, 'true_self');
      expect(feed.length).toBeGreaterThan(0);
      expect(feed[0].user_id).toBe(user1Id);

      // Cleanup
      await followService.unfollowUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'true_self',
        followee_user_id: user1Id,
        followee_identity_mode: 'true_self',
      });
    });
  });

  describe('React to post → Notification sent', () => {
    it('should create notification when reacting to content', async () => {
      // 1. User 2 reacts to User 1's post
      const reaction = await reactionService.addReaction({
        user_id: user2Id,
        identity_mode: 'true_self',
        post_id: testPostId,
        reaction_type: 'upvote',
      });

      expect(reaction).toBeDefined();
      expect(reaction.reaction_type).toBe('upvote');

      // 2. Get reaction counts
      const reactions = await reactionService.getReactionsForContent(testPostId);
      expect(reactions.upvote).toBe(1);

      // Cleanup
      await reactionService.removeReaction(reaction.id, user2Id);
    });
  });

  describe('Block user → Remove follows', () => {
    it('should remove follows when blocking user', async () => {
      // 1. User 2 follows User 1
      await followService.followUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'true_self',
        followee_user_id: user1Id,
        followee_identity_mode: 'true_self',
      });

      // 2. Verify follow exists
      const followingBefore = await followService.isFollowing(
        user2Id,
        'true_self',
        user1Id,
        'true_self'
      );
      expect(followingBefore).toBe(true);

      // 3. User 2 blocks User 1
      await blockService.blockUser({
        blocker_user_id: user2Id,
        blocker_identity_mode: 'true_self',
        blocked_user_id: user1Id,
      });

      // 4. Verify follow was removed
      const followingAfter = await followService.isFollowing(
        user2Id,
        'true_self',
        user1Id,
        'true_self'
      );
      expect(followingAfter).toBe(false);

      // 5. Verify block exists
      const isBlocked = await blockService.isUserBlocked(
        user2Id,
        'true_self',
        user1Id
      );
      expect(isBlocked).toBe(true);

      // Cleanup
      await blockService.unblockUser(user2Id, 'true_self', user1Id);
    });
  });

  describe('Dual-identity social graphs', () => {
    it('should maintain separate follows for True Self and Shadow', async () => {
      // 1. User 2 follows User 1's True Self as True Self
      await followService.followUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'true_self',
        followee_user_id: user1Id,
        followee_identity_mode: 'true_self',
      });

      // 2. User 2 follows User 1's Shadow as Shadow
      await followService.followUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'shadow',
        followee_user_id: user1Id,
        followee_identity_mode: 'shadow',
      });

      // 3. Check True Self follow
      const trueSelfFollow = await followService.isFollowing(
        user2Id,
        'true_self',
        user1Id,
        'true_self'
      );
      expect(trueSelfFollow).toBe(true);

      // 4. Check Shadow follow
      const shadowFollow = await followService.isFollowing(
        user2Id,
        'shadow',
        user1Id,
        'shadow'
      );
      expect(shadowFollow).toBe(true);

      // 5. Check cross-identity (should be false)
      const crossFollow = await followService.isFollowing(
        user2Id,
        'true_self',
        user1Id,
        'shadow'
      );
      expect(crossFollow).toBe(false);

      // Cleanup
      await followService.unfollowUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'true_self',
        followee_user_id: user1Id,
        followee_identity_mode: 'true_self',
      });
      await followService.unfollowUser({
        follower_user_id: user2Id,
        follower_identity_mode: 'shadow',
        followee_user_id: user1Id,
        followee_identity_mode: 'shadow',
      });
    });
  });

  describe('Notification system', () => {
    it('should create, read, and manage notifications', async () => {
      // 1. Create notification
      const notification = await notificationService.createNotification({
        recipient_user_id: user1Id,
        actor_user_id: user2Id,
        actor_identity_mode: 'true_self',
        actor_display_name: 'User 2',
        notification_type: 'follow',
        message: 'User 2 followed you',
      });

      expect(notification).toBeDefined();
      expect(notification.is_read).toBe(false);

      // 2. Check unread count
      const unreadCount = await notificationService.getUnreadCount(user1Id);
      expect(unreadCount).toBeGreaterThan(0);

      // 3. Mark as read
      await notificationService.markAsRead(notification.id, user1Id);

      // 4. Verify marked as read
      const updatedCount = await notificationService.getUnreadCount(user1Id);
      expect(updatedCount).toBe(unreadCount - 1);

      // Cleanup
      await notificationService.deleteNotification(notification.id, user1Id);
    });
  });

  describe('Trending content', () => {
    it('should retrieve trending activities', async () => {
      // 1. Log some activities
      await feedService.logActivity({
        user_id: user1Id,
        identity_mode: 'true_self',
        display_name: 'User 1',
        activity_type: 'post_created',
        post_id: testPostId,
        content_preview: 'Trending post',
        content_type: 'post',
      });

      // 2. Get trending
      const trending = await feedService.getTrendingActivities(24, 10);
      expect(Array.isArray(trending)).toBe(true);
    });
  });

  describe('Notification preferences', () => {
    it('should update and retrieve user preferences', async () => {
      // 1. Get default preferences
      const defaultPrefs = await notificationService.getPreferences(user1Id);
      expect(defaultPrefs.mention_notifications).toBe(true);

      // 2. Update preferences
      const updated = await notificationService.updatePreferences(user1Id, {
        mention_notifications: false,
        follow_notifications: false,
      });

      expect(updated.mention_notifications).toBe(false);
      expect(updated.follow_notifications).toBe(false);

      // 3. Restore defaults
      await notificationService.updatePreferences(user1Id, {
        mention_notifications: true,
        follow_notifications: true,
      });
    });
  });
});
