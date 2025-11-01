/**
 * Module 07: Content - Database Migration
 * Creates 7 tables for posts, discussions, comments, media, mentions, reports, and edit history
 */

import { getPool, closePool } from '../utils/database';

async function migrate() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Starting Module 07: Content migration...\n');

    // ============================================
    // TABLE 1: posts
    // ============================================
    console.log('Creating table: posts...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Author Info
          user_id UUID NOT NULL,
          identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
          author_display_name VARCHAR(100) NOT NULL,

          -- Content
          title VARCHAR(300) NOT NULL,
          content TEXT NOT NULL,
          content_type VARCHAR(20) DEFAULT 'post' CHECK (content_type IN ('post', 'article', 'question', 'announcement')),

          -- Metadata
          category VARCHAR(50),
          tags JSONB DEFAULT '[]',
          is_pinned BOOLEAN DEFAULT FALSE,
          is_locked BOOLEAN DEFAULT FALSE,

          -- Engagement Metrics (denormalized for performance)
          comment_count INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,

          -- Moderation
          moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN (
              'approved', 'pending_review', 'flagged', 'hidden', 'removed'
          )),
          moderation_reason TEXT,
          moderated_by_user_id UUID,

          -- State
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMPTZ,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT posts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT posts_moderator_fk FOREIGN KEY (moderated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Indexes for posts
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_identity_mode ON posts(identity_mode);
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
      CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);
      CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(
          to_tsvector('english', title || ' ' || content)
      );
    `);

    console.log('✅ Posts table created\n');

    // ============================================
    // TABLE 2: discussions
    // ============================================
    console.log('Creating table: discussions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS discussions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Creator Info
          user_id UUID NOT NULL,
          identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
          creator_display_name VARCHAR(100) NOT NULL,

          -- Discussion Details
          title VARCHAR(300) NOT NULL,
          description TEXT,
          topic VARCHAR(100),

          -- Settings
          is_open BOOLEAN DEFAULT TRUE,
          requires_approval BOOLEAN DEFAULT FALSE,

          -- Engagement
          participant_count INTEGER DEFAULT 1,
          comment_count INTEGER DEFAULT 0,

          -- Moderation
          moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN (
              'approved', 'pending_review', 'flagged', 'hidden', 'archived'
          )),

          -- State
          is_deleted BOOLEAN DEFAULT FALSE,
          archived_at TIMESTAMPTZ,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          CONSTRAINT discussions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Indexes for discussions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_discussions_user ON discussions(user_id);
      CREATE INDEX IF NOT EXISTS idx_discussions_topic ON discussions(topic);
      CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_discussions_is_open ON discussions(is_open);
      CREATE INDEX IF NOT EXISTS idx_discussions_is_deleted ON discussions(is_deleted);
    `);

    console.log('✅ Discussions table created\n');

    // ============================================
    // TABLE 3: comments
    // ============================================
    console.log('Creating table: comments...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Author Info
          user_id UUID NOT NULL,
          identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
          author_display_name VARCHAR(100) NOT NULL,

          -- Hierarchy
          parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          parent_discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
          parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- Content
          content TEXT NOT NULL,

          -- Thread Position
          depth INTEGER DEFAULT 1,

          -- Engagement
          reply_count INTEGER DEFAULT 0,

          -- Moderation
          moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN (
              'approved', 'pending_review', 'flagged', 'hidden', 'removed'
          )),
          moderation_reason TEXT,
          moderated_by_user_id UUID,

          -- State
          is_deleted BOOLEAN DEFAULT FALSE,
          deleted_at TIMESTAMPTZ,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          CONSTRAINT comments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT comments_moderator_fk FOREIGN KEY (moderated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT comments_hierarchy_check CHECK (
              (parent_post_id IS NOT NULL AND parent_comment_id IS NULL AND parent_discussion_id IS NULL) OR
              (parent_post_id IS NULL AND parent_comment_id IS NOT NULL AND parent_discussion_id IS NULL) OR
              (parent_discussion_id IS NOT NULL AND parent_comment_id IS NULL AND parent_post_id IS NULL)
          )
      );
    `);

    // Indexes for comments
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(parent_post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_discussion ON comments(parent_discussion_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_comment ON comments(parent_comment_id);
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_comments_moderation_status ON comments(moderation_status);
      CREATE INDEX IF NOT EXISTS idx_comments_identity ON comments(identity_mode);
    `);

    console.log('✅ Comments table created\n');

    // ============================================
    // TABLE 4: content_media
    // ============================================
    console.log('Creating table: content_media...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_media (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Owner
          user_id UUID NOT NULL,

          -- Content Reference
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- File Info
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(50) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_size_bytes INTEGER NOT NULL,

          -- Storage
          storage_url TEXT NOT NULL,
          thumbnail_url TEXT,

          -- Metadata
          width INTEGER,
          height INTEGER,
          duration_seconds FLOAT,
          alt_text VARCHAR(500),

          -- State
          is_deleted BOOLEAN DEFAULT FALSE,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),

          CONSTRAINT media_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT media_content_ref_check CHECK (
              (post_id IS NOT NULL AND comment_id IS NULL) OR
              (post_id IS NULL AND comment_id IS NOT NULL)
          )
      );
    `);

    // Indexes for content_media
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_user ON content_media(user_id);
      CREATE INDEX IF NOT EXISTS idx_media_post ON content_media(post_id);
      CREATE INDEX IF NOT EXISTS idx_media_comment ON content_media(comment_id);
      CREATE INDEX IF NOT EXISTS idx_media_file_type ON content_media(file_type);
    `);

    console.log('✅ Content media table created\n');

    // ============================================
    // TABLE 5: content_mentions
    // ============================================
    console.log('Creating table: content_mentions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_mentions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- The mention
          mentioned_user_id UUID NOT NULL,
          mentioned_by_user_id UUID NOT NULL,

          -- Context
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- State
          is_read BOOLEAN DEFAULT FALSE,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),

          CONSTRAINT mention_mentioned_user_fk FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT mention_by_user_fk FOREIGN KEY (mentioned_by_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Indexes for content_mentions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mentions_mentioned ON content_mentions(mentioned_user_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_is_read ON content_mentions(is_read);
      CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON content_mentions(created_at DESC);
    `);

    console.log('✅ Content mentions table created\n');

    // ============================================
    // TABLE 6: content_reports
    // ============================================
    console.log('Creating table: content_reports...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Reporter
          reported_by_user_id UUID NOT NULL,

          -- Content Reference
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- Report Details
          reason VARCHAR(100) NOT NULL CHECK (reason IN (
              'spam', 'harassment', 'hate_speech', 'misinformation', 'nsfw',
              'violence', 'copyright', 'other'
          )),
          description TEXT,

          -- Status
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
              'pending', 'investigating', 'resolved', 'dismissed'
          )),
          resolution TEXT,
          resolved_by_user_id UUID,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          resolved_at TIMESTAMPTZ,

          CONSTRAINT report_reporter_fk FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT report_resolver_fk FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT report_content_ref_check CHECK (
              (post_id IS NOT NULL AND comment_id IS NULL) OR
              (post_id IS NULL AND comment_id IS NOT NULL)
          )
      );
    `);

    // Indexes for content_reports
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_reason ON content_reports(reason);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON content_reports(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_post ON content_reports(post_id);
      CREATE INDEX IF NOT EXISTS idx_reports_comment ON content_reports(comment_id);
    `);

    console.log('✅ Content reports table created\n');

    // ============================================
    // TABLE 7: content_edit_history
    // ============================================
    console.log('Creating table: content_edit_history...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_edit_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Content Reference
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- Change
          old_content TEXT,
          new_content TEXT,

          -- Editor
          edited_by_user_id UUID NOT NULL,

          -- Reason
          edit_reason TEXT,

          -- Timestamp
          edited_at TIMESTAMPTZ DEFAULT NOW(),

          CONSTRAINT edit_editor_fk FOREIGN KEY (edited_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT edit_content_ref_check CHECK (
              (post_id IS NOT NULL AND comment_id IS NULL) OR
              (post_id IS NULL AND comment_id IS NOT NULL)
          )
      );
    `);

    // Indexes for content_edit_history
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_history_post ON content_edit_history(post_id);
      CREATE INDEX IF NOT EXISTS idx_edit_history_comment ON content_edit_history(comment_id);
      CREATE INDEX IF NOT EXISTS idx_edit_history_edited_at ON content_edit_history(edited_at DESC);
    `);

    console.log('✅ Content edit history table created\n');

    await client.query('COMMIT');

    console.log('✅ Module 07: Content migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - 7 tables created');
    console.log('  - All indexes created');
    console.log('  - Full-text search enabled on posts');
    console.log('  - Dual-identity support enabled');
    console.log('  - Moderation system ready');
    console.log('  - Edit history tracking enabled\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

migrate()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
