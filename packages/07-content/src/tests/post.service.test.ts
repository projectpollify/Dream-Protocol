/**
 * Module 07: Content - Post Service Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postService from '../services/post.service';
import { query } from '../utils/database';
import { CreatePostRequest } from '../types';

describe('Post Service', () => {
  let testUserId: string;
  let testPostId: string;

  beforeAll(async () => {
    // Create test user
    const userResult = await query(
      `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id`,
      ['testuser_posts', 'testpost@test.com']
    );
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM posts WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('createPost', () => {
    it('should create a post with valid data', async () => {
      const postData: CreatePostRequest = {
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Test Post Title',
        content: 'This is test content for the post.',
        content_type: 'post',
        category: 'general',
        tags: ['test', 'demo'],
      };

      const post = await postService.createPost(postData);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe(postData.title);
      expect(post.content).toBe(postData.content);
      expect(post.identity_mode).toBe('true_self');
      expect(post.user_id).toBe(testUserId);
      expect(post.is_deleted).toBe(false);
      expect(post.moderation_status).toBe('approved');
      expect(post.comment_count).toBe(0);
      expect(post.view_count).toBe(0);

      testPostId = post.id;
    });

    it('should reject post without title', async () => {
      const postData: any = {
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        content: 'Content without title',
      };

      await expect(postService.createPost(postData)).rejects.toThrow(
        'Title is required'
      );
    });

    it('should reject post with title exceeding 300 characters', async () => {
      const longTitle = 'A'.repeat(301);
      const postData: CreatePostRequest = {
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: longTitle,
        content: 'Content',
      };

      await expect(postService.createPost(postData)).rejects.toThrow(
        'max 300 characters'
      );
    });

    it('should reject post without content', async () => {
      const postData: any = {
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Title without content',
      };

      await expect(postService.createPost(postData)).rejects.toThrow(
        'Content is required'
      );
    });

    it('should reject post with invalid identity_mode', async () => {
      const postData: any = {
        user_id: testUserId,
        identity_mode: 'invalid_mode',
        author_display_name: 'Test User',
        title: 'Test',
        content: 'Test content',
      };

      await expect(postService.createPost(postData)).rejects.toThrow(
        'Valid identity_mode is required'
      );
    });
  });

  describe('getPost', () => {
    it('should retrieve a post and increment view count', async () => {
      const post1 = await postService.getPost(testPostId);
      expect(post1).toBeDefined();
      expect(post1!.view_count).toBe(1);

      const post2 = await postService.getPost(testPostId);
      expect(post2!.view_count).toBe(2);
    });

    it('should return null for non-existent post', async () => {
      const post = await postService.getPost('00000000-0000-0000-0000-000000000000');
      expect(post).toBeNull();
    });
  });

  describe('updatePost', () => {
    it('should update post title and content', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content for the post.',
      };

      const updatedPost = await postService.updatePost(testPostId, testUserId, updates);

      expect(updatedPost.title).toBe(updates.title);
      expect(updatedPost.content).toBe(updates.content);
    });

    it('should track edit history when content changes', async () => {
      const updates = {
        content: 'Another content update to test history',
      };

      await postService.updatePost(testPostId, testUserId, updates);

      const history = await postService.getPostEditHistory(testPostId);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].new_content).toBe(updates.content);
    });

    it('should reject update from non-owner', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000001';
      const updates = { title: 'Hacked title' };

      await expect(
        postService.updatePost(testPostId, fakeUserId, updates)
      ).rejects.toThrow('Unauthorized');
    });

    it('should reject title exceeding 300 characters', async () => {
      const updates = { title: 'A'.repeat(301) };

      await expect(
        postService.updatePost(testPostId, testUserId, updates)
      ).rejects.toThrow('max 300 characters');
    });
  });

  describe('listPosts', () => {
    beforeEach(async () => {
      // Create multiple posts for testing
      await postService.createPost({
        user_id: testUserId,
        identity_mode: 'shadow',
        author_display_name: 'Shadow User',
        title: 'Shadow Post',
        content: 'Content from shadow identity',
        category: 'shadow-test',
      });
    });

    it('should list posts with pagination', async () => {
      const result = await postService.listPosts({ limit: 10, offset: 0 });

      expect(result.posts).toBeDefined();
      expect(Array.isArray(result.posts)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should filter posts by category', async () => {
      const result = await postService.listPosts({ category: 'shadow-test' });

      expect(result.posts.length).toBeGreaterThan(0);
      result.posts.forEach((post) => {
        expect(post.category).toBe('shadow-test');
      });
    });

    it('should filter posts by identity_mode', async () => {
      const result = await postService.listPosts({ identity_mode: 'shadow' });

      expect(result.posts.length).toBeGreaterThan(0);
      result.posts.forEach((post) => {
        expect(post.identity_mode).toBe('shadow');
      });
    });

    it('should filter posts by user_id', async () => {
      const result = await postService.listPosts({ user_id: testUserId });

      result.posts.forEach((post) => {
        expect(post.user_id).toBe(testUserId);
      });
    });

    it('should sort posts by created_at descending', async () => {
      const result = await postService.listPosts({
        sort_by: 'created_at',
        order: 'desc',
        limit: 5,
      });

      if (result.posts.length > 1) {
        const first = new Date(result.posts[0].created_at);
        const second = new Date(result.posts[1].created_at);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });
  });

  describe('flagPost', () => {
    it('should create a report for a post', async () => {
      await postService.flagPost({
        post_id: testPostId,
        reported_by_user_id: testUserId,
        reason: 'spam',
        description: 'This looks like spam content',
      });

      // Verify report was created
      const reports = await query(
        'SELECT * FROM content_reports WHERE post_id = $1',
        [testPostId]
      );
      expect(reports.rows.length).toBeGreaterThan(0);
      expect(reports.rows[0].reason).toBe('spam');
    });

    it('should reject flag without reason', async () => {
      await expect(
        postService.flagPost({
          post_id: testPostId,
          reported_by_user_id: testUserId,
          reason: '' as any,
        })
      ).rejects.toThrow('Report reason is required');
    });
  });

  describe('deletePost', () => {
    it('should soft delete a post', async () => {
      // Create a post to delete
      const postToDelete = await postService.createPost({
        user_id: testUserId,
        identity_mode: 'true_self',
        author_display_name: 'Test User',
        title: 'Post to delete',
        content: 'This will be deleted',
      });

      await postService.deletePost(postToDelete.id, testUserId);

      // Verify soft delete
      const deletedPost = await query(
        'SELECT * FROM posts WHERE id = $1',
        [postToDelete.id]
      );
      expect(deletedPost.rows[0].is_deleted).toBe(true);
      expect(deletedPost.rows[0].deleted_at).toBeDefined();
    });

    it('should reject delete from non-owner', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000001';

      await expect(
        postService.deletePost(testPostId, fakeUserId)
      ).rejects.toThrow('permission');
    });
  });
});
