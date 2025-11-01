/**
 * Module 07: Content - Integration Tests
 * End-to-end tests for complete content workflows
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postService from '../services/post.service';
import commentService from '../services/comment.service';
import moderationService from '../services/moderation.service';
import { query } from '../utils/database';

describe('Content Integration Tests', () => {
  let testUserId: string;
  let moderatorUserId: string;

  beforeAll(async () => {
    // Create test users
    const userResult = await query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id`,
      ['integration_user', 'integration@test.com']
    );
    testUserId = userResult.rows[0].id;

    const modResult = await query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id`,
      ['moderator_user', 'moderator@test.com']
    );
    moderatorUserId = modResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM posts WHERE user_id IN ($1, $2)', [testUserId, moderatorUserId]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, moderatorUserId]);
  });

  describe('Complete post → comment → nested reply workflow', () => {
    it('should handle full content lifecycle', async () => {
      // 1. Create a post
      const post = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Integration User',
        title: 'Integration Test Post',
        content: 'This is an integration test post with detailed content.',
      });

      expect(post.id).toBeDefined();
      expect(post.comment_count).toBe(0);

      // 2. Add a top-level comment
      const comment1 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Integration User',
        parent_post_id: post.id,
        content: 'This is a top-level comment on the post.',
      });

      expect(comment1.id).toBeDefined();
      expect(comment1.depth).toBe(1);
      expect(comment1.parent_post_id).toBe(post.id);

      // 3. Verify post comment count updated
      const updatedPost = await postService.getPost(post.id);
      expect(updatedPost!.comment_count).toBe(1);

      // 4. Add a reply to the comment
      const reply1 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'shadow',
        author_display_name: 'Shadow User',
        parent_comment_id: comment1.id,
        content: 'This is a reply to the comment.',
      });

      expect(reply1.depth).toBe(2);
      expect(reply1.parent_comment_id).toBe(comment1.id);

      // 5. Add another nested reply
      const reply2 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Integration User',
        parent_comment_id: reply1.id,
        content: 'This is a nested reply.',
      });

      expect(reply2.depth).toBe(3);

      // 6. Get the full comment thread
      const thread = await commentService.getCommentThread(comment1.id);
      expect(thread).toBeDefined();
      expect(thread!.replies.length).toBe(1);
      expect(thread!.replies[0].replies.length).toBe(1);

      // 7. Get post comments (should return top-level only)
      const { comments } = await commentService.getPostComments(post.id);
      expect(comments.length).toBe(1);
      expect(comments[0].id).toBe(comment1.id);
    });
  });

  describe('Dual-identity content separation', () => {
    it('should keep True Self and Shadow posts separate', async () => {
      // Create True Self post
      const trueSelfPost = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'My True Name',
        title: 'True Self Post',
        content: 'Content posted as my true self.',
      });

      // Create Shadow post
      const shadowPost = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'shadow',
        author_display_name: 'Anonymous User',
        title: 'Shadow Post',
        content: 'Content posted as my shadow identity.',
      });

      // Filter by True Self
      const trueSelfResults = await postService.listPosts({
        user_id: testUserId,
        identity_mode: 'true_self',
      });

      const trueSelfIds = trueSelfResults.posts.map((p) => p.id);
      expect(trueSelfIds).toContain(trueSelfPost.id);
      expect(trueSelfIds).not.toContain(shadowPost.id);

      // Filter by Shadow
      const shadowResults = await postService.listPosts({
        user_id: testUserId,
        identity_mode: 'shadow',
      });

      const shadowIds = shadowResults.posts.map((p) => p.id);
      expect(shadowIds).toContain(shadowPost.id);
      expect(shadowIds).not.toContain(trueSelfPost.id);
    });
  });

  describe('Moderation workflow: flag → review → resolve', () => {
    it('should handle complete moderation workflow', async () => {
      // 1. Create a post
      const post = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Potentially problematic post',
        content: 'This post will be flagged and moderated.',
      });

      // 2. Flag the post
      await postService.flagPost({
        post_id: post.id,
        reported_by_user_id: moderatorUserId,
        reason: 'misinformation',
        description: 'This post contains false information.',
      });

      // 3. Get pending reports (should include our report)
      const { reports } = await moderationService.getPendingReports();
      const ourReport = reports.find((r) => r.post_id === post.id);
      expect(ourReport).toBeDefined();
      expect(ourReport!.reason).toBe('misinformation');
      expect(ourReport!.status).toBe('pending');

      // 4. Hide the content
      await moderationService.hideContent(post.id, 'post', 'Flagged as misinformation', moderatorUserId);

      // 5. Verify content is hidden
      const hiddenPost = await query(
        'SELECT moderation_status FROM posts WHERE id = $1',
        [post.id]
      );
      expect(hiddenPost.rows[0].moderation_status).toBe('hidden');

      // 6. Resolve the report
      await moderationService.resolveReport(ourReport!.id, {
        status: 'resolved',
        resolution: 'Content hidden after review',
        resolved_by_user_id: moderatorUserId,
      });

      // 7. Verify report is resolved
      const resolvedReport = await moderationService.getReport(ourReport!.id);
      expect(resolvedReport!.status).toBe('resolved');
      expect(resolvedReport!.resolved_at).toBeDefined();
    });
  });

  describe('Edit history tracking', () => {
    it('should track all edits to a post', async () => {
      // 1. Create a post
      const post = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Post that will be edited',
        content: 'Original content.',
      });

      // 2. Edit the post multiple times
      await postService.updatePost(post.id, testUserId, {
        content: 'First edit.',
      });

      await postService.updatePost(post.id, testUserId, {
        content: 'Second edit.',
      });

      await postService.updatePost(post.id, testUserId, {
        content: 'Third edit.',
      });

      // 3. Get edit history
      const history = await postService.getPostEditHistory(post.id);

      expect(history.length).toBe(3);
      expect(history[0].new_content).toBe('Third edit.');
      expect(history[1].new_content).toBe('Second edit.');
      expect(history[2].new_content).toBe('First edit.');
    });
  });

  describe('Comment depth limiting', () => {
    it('should enforce maximum nesting depth of 5 levels', async () => {
      // 1. Create a post
      const post = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Depth test post',
        content: 'Testing comment nesting depth.',
      });

      // 2. Create nested comments up to depth 5
      const comment1 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'User',
        parent_post_id: post.id,
        content: 'Level 1',
      });

      const comment2 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'User',
        parent_comment_id: comment1.id,
        content: 'Level 2',
      });

      const comment3 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'User',
        parent_comment_id: comment2.id,
        content: 'Level 3',
      });

      const comment4 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'User',
        parent_comment_id: comment3.id,
        content: 'Level 4',
      });

      const comment5 = await commentService.createComment({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'User',
        parent_comment_id: comment4.id,
        content: 'Level 5',
      });

      expect(comment5.depth).toBe(5);

      // 3. Try to exceed max depth (should fail)
      await expect(
        commentService.createComment({
          user_id: testUserId,
          identity_mode: 'true_self',
          author_display_name: 'User',
          parent_comment_id: comment5.id,
          content: 'Level 6 - should fail',
        })
      ).rejects.toThrow('Maximum nesting depth');
    });
  });

  describe('Soft delete preservation', () => {
    it('should preserve deleted content for audit trail', async () => {
      // 1. Create and delete a post
      const post = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Post to be deleted',
        content: 'This will be soft deleted.',
      });

      await postService.deletePost(post.id, testUserId);

      // 2. Verify post still exists in database but is marked deleted
      const deletedPost = await query(
        'SELECT * FROM posts WHERE id = $1',
        [post.id]
      );

      expect(deletedPost.rows.length).toBe(1);
      expect(deletedPost.rows[0].is_deleted).toBe(true);
      expect(deletedPost.rows[0].deleted_at).toBeDefined();
      expect(deletedPost.rows[0].content).toBe('This will be soft deleted.');
    });
  });

  describe('Moderation statistics', () => {
    it('should provide accurate moderation stats', async () => {
      const stats = await moderationService.getModerationStats();

      expect(stats).toBeDefined();
      expect(typeof stats.pending_reports).toBe('number');
      expect(typeof stats.flagged_posts).toBe('number');
      expect(typeof stats.flagged_comments).toBe('number');
      expect(typeof stats.resolved_today).toBe('number');
      expect(stats.pending_reports).toBeGreaterThanOrEqual(0);
    });
  });
});
