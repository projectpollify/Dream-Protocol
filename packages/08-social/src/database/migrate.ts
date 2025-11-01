/**
 * Module 08: Social - Database Migration
 * Creates 7 tables for reactions, follows, blocks, notifications, activity feeds, preferences, and stats
 */

import { getPool, closePool } from '../utils/database';

async function migrate() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Starting Module 08: Social migration...\n');

    // ============================================
    // TABLE 1: reactions
    // ============================================
    console.log('Creating table: reactions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- User Info
          user_id UUID NOT NULL,
          identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,

          -- Content Reference
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- Reaction Type
          reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN (
              'upvote', 'downvote', 'helpful', 'insightful', 'inspiring', 'funny'
          )),

          -- State
          is_active BOOLEAN DEFAULT TRUE,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT reactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT reaction_content_check CHECK (
              (post_id IS NOT NULL AND comment_id IS NULL) OR
              (post_id IS NULL AND comment_id IS NOT NULL)
          )
      );
    `);

    // Partial unique indexes (fix for NULL handling)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique_post
      ON reactions(user_id, post_id, reaction_type)
      WHERE post_id IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique_comment
      ON reactions(user_id, comment_id, reaction_type)
      WHERE comment_id IS NOT NULL;
    `);

    // Regular indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
      CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id);
      CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);
      CREATE INDEX IF NOT EXISTS idx_reactions_created_at ON reactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reactions_active ON reactions(is_active);
    `);

    console.log('✅ Reactions table created\n');

    // ============================================
    // TABLE 2: follows
    // ============================================
    console.log('Creating table: follows...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Follower Info
          follower_user_id UUID NOT NULL,
          follower_identity_mode VARCHAR(10) CHECK (follower_identity_mode IN ('true_self', 'shadow')) NOT NULL,

          -- Followee Info
          followee_user_id UUID NOT NULL,
          followee_identity_mode VARCHAR(10) CHECK (followee_identity_mode IN ('true_self', 'shadow')) NOT NULL,

          -- State
          is_active BOOLEAN DEFAULT TRUE,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          unfollowed_at TIMESTAMPTZ,

          -- Constraints
          CONSTRAINT follows_follower_fk FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT follows_followee_fk FOREIGN KEY (followee_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT follows_no_self_follow CHECK (follower_user_id != followee_user_id),
          UNIQUE(follower_user_id, follower_identity_mode, followee_user_id, followee_identity_mode)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_user_id);
      CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_user_id);
      CREATE INDEX IF NOT EXISTS idx_follows_active ON follows(is_active);
      CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_follows_follower_active ON follows(follower_user_id, is_active);
    `);

    console.log('✅ Follows table created\n');

    // ============================================
    // TABLE 3: blocks
    // ============================================
    console.log('Creating table: blocks...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Blocker Info
          blocker_user_id UUID NOT NULL,
          blocker_identity_mode VARCHAR(10) CHECK (blocker_identity_mode IN ('true_self', 'shadow')) NOT NULL,

          -- Blocked User Info
          blocked_user_id UUID NOT NULL,

          -- Reason (optional)
          reason VARCHAR(200),

          -- State
          is_active BOOLEAN DEFAULT TRUE,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          unblocked_at TIMESTAMPTZ,

          -- Constraints
          CONSTRAINT blocks_blocker_fk FOREIGN KEY (blocker_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT blocks_blocked_fk FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT blocks_no_self_block CHECK (blocker_user_id != blocked_user_id),
          UNIQUE(blocker_user_id, blocker_identity_mode, blocked_user_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_user_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_user_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_active ON blocks(is_active);
    `);

    console.log('✅ Blocks table created\n');

    // ============================================
    // TABLE 4: notifications
    // ============================================
    console.log('Creating table: notifications...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Recipient
          recipient_user_id UUID NOT NULL,

          -- Sender/Actor
          actor_user_id UUID,
          actor_identity_mode VARCHAR(10) CHECK (actor_identity_mode IN ('true_self', 'shadow')),
          actor_display_name VARCHAR(100),

          -- Notification Type
          notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
              'mention', 'follow', 'reaction', 'reply', 'comment', 'governance_update',
              'verification_status', 'moderation_action', 'system'
          )),

          -- Context
          post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
          comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,

          -- Content
          title VARCHAR(200),
          message TEXT,
          action_url VARCHAR(500),

          -- State
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMPTZ,

          -- Delivery
          delivery_channels JSONB DEFAULT '[]',
          email_sent BOOLEAN DEFAULT FALSE,
          push_sent BOOLEAN DEFAULT FALSE,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT notification_recipient_fk FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT notification_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read);
    `);

    console.log('✅ Notifications table created\n');

    // ============================================
    // TABLE 5: activity_feed
    // ============================================
    console.log('Creating table: activity_feed...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_feed (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Activity Creator
          user_id UUID NOT NULL,
          identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
          display_name VARCHAR(100) NOT NULL,

          -- Activity Type
          activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
              'post_created', 'comment_created', 'reaction_added', 'discussion_created',
              'poll_created', 'poll_voted'
          )),

          -- Content Reference
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

          -- Denormalized content for feed display
          content_preview VARCHAR(500),
          content_type VARCHAR(20),

          -- Engagement
          engagement_count INTEGER DEFAULT 0,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT activity_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_feed(activity_type);
      CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_feed(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_identity ON activity_feed(identity_mode);
      CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_feed(user_id, created_at DESC);
    `);

    console.log('✅ Activity feed table created\n');

    // ============================================
    // TABLE 6: notification_preferences
    // ============================================
    console.log('Creating table: notification_preferences...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,

          -- Notification Types (enabled/disabled)
          mention_notifications BOOLEAN DEFAULT TRUE,
          follow_notifications BOOLEAN DEFAULT TRUE,
          reaction_notifications BOOLEAN DEFAULT TRUE,
          reply_notifications BOOLEAN DEFAULT TRUE,
          comment_notifications BOOLEAN DEFAULT TRUE,
          governance_notifications BOOLEAN DEFAULT TRUE,
          verification_notifications BOOLEAN DEFAULT TRUE,
          system_notifications BOOLEAN DEFAULT TRUE,

          -- Delivery Channels
          email_on_mention BOOLEAN DEFAULT TRUE,
          email_on_follow BOOLEAN DEFAULT FALSE,
          email_on_reaction BOOLEAN DEFAULT FALSE,
          email_on_reply BOOLEAN DEFAULT TRUE,
          email_on_comment BOOLEAN DEFAULT TRUE,

          push_on_mention BOOLEAN DEFAULT TRUE,
          push_on_follow BOOLEAN DEFAULT FALSE,
          push_on_reaction BOOLEAN DEFAULT FALSE,
          push_on_reply BOOLEAN DEFAULT TRUE,

          -- Frequency
          email_digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (email_digest_frequency IN (
              'instant', 'daily', 'weekly', 'never'
          )),

          -- Mute Settings
          muted_users JSONB DEFAULT '[]',
          muted_keywords JSONB DEFAULT '[]',

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT prefs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
    `);

    console.log('✅ Notification preferences table created\n');

    // ============================================
    // TABLE 7: social_stats
    // ============================================
    console.log('Creating table: social_stats...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,

          -- Follower Stats
          follower_count INTEGER DEFAULT 0,
          following_count INTEGER DEFAULT 0,

          -- Engagement Stats
          post_count INTEGER DEFAULT 0,
          comment_count INTEGER DEFAULT 0,
          reaction_count INTEGER DEFAULT 0,

          -- Metrics
          total_engagements INTEGER DEFAULT 0,
          engagement_rate DECIMAL(5,2) DEFAULT 0,

          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT stats_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, identity_mode)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_social_stats_user ON social_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_social_stats_follower_count ON social_stats(follower_count DESC);
      CREATE INDEX IF NOT EXISTS idx_social_stats_engagement_rate ON social_stats(engagement_rate DESC);
    `);

    console.log('✅ Social stats table created\n');

    await client.query('COMMIT');

    console.log('✅ Module 08: Social migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - 7 tables created');
    console.log('  - Partial unique indexes for reactions (NULL-safe)');
    console.log('  - Dual-identity support on follows/blocks');
    console.log('  - Notification system ready');
    console.log('  - Activity feed denormalized for performance');
    console.log('  - Social stats tracking enabled\n');
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
