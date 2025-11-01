# 👥 Module 08: Social - Technical Specification
## Reactions, Follows, Notifications & Activity Feeds for Dream Protocol

**Module Number**: 08 of 22  
**Build Priority**: PRIORITY 3 - Core Value (After Module 07: Content)  
**Dependencies**: Module 01 (Identity), Module 03 (User), Module 04 (Economy), Module 07 (Content)  
**Dependents**: Module 09 (Verification), Module 10 (Analytics), Module 13 (Dashboard)  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 08 implements the social interaction layer for Dream Protocol. This is where community engagement happens—users follow each other, react to content, and stay informed about activities. This module transforms the platform from a simple content repository into a living, breathing social ecosystem where relationships matter.

### **Core Philosophy**
> "Social features drive engagement, but engagement without authenticity is just noise. Every follow, reaction, and notification should strengthen genuine community bonds. Users should feel valued when they contribute, encouraged when others engage with their ideas, and connected to a community that cares."

### **Key Innovation**
Dual-identity social engagement means users can maintain separate social graphs for True Self (professional, accountable) and Shadow (exploratory, anonymous) modes. A user can be a thought leader in True Self while exploring controversial ideas safely in Shadow—with different followers in each mode.

---

## 🏗️ What This Module Does

### **Primary Functions**

1. **Reactions System** - Users react to posts/comments (upvote, downvote, helpful, insightful, etc.)
2. **Follow System** - Users follow other users to see their content
3. **Unfollow System** - Users unfollow to stop seeing content
4. **Notification System** - Real-time alerts for mentions, follows, reactions
5. **Activity Feed** - Personalized feed of followed users' activities
6. **User Discovery** - Trending users, recommended follows
7. **Dual-Identity Relationships** - Separate social graphs per identity mode
8. **Notification Preferences** - User control over what triggers notifications
9. **Block System** - Users can block each other (no following, no mentions)
10. **Social Stats** - Follower counts, engagement metrics

### **Key Features**

- ✅ 6 reaction types: Upvote, Downvote, Helpful, Insightful, Inspiring, Funny
- ✅ Follow/unfollow system with dual-identity support
- ✅ Real-time notifications via WebSockets
- ✅ Email & in-app notification options
- ✅ Personalized activity feeds
- ✅ Trending content algorithm
- ✅ User discovery & recommendations
- ✅ Block/unblock functionality
- ✅ Notification preferences per user
- ✅ Social stats display (followers, following, engagement)
- ✅ Performance optimized (pagination, caching)

---

## 📊 Database Schema

### **Table 1: `reactions`**
Track all user reactions to content:

```sql
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
    is_active BOOLEAN DEFAULT TRUE, -- User can undo reaction
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT reactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT reaction_content_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    -- Prevent duplicate reactions (one per user per content per type)
    UNIQUE(user_id, post_id, comment_id, reaction_type)
);

-- Indexes for performance
CREATE INDEX idx_reactions_user ON reactions(user_id);
CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_reactions_comment ON reactions(comment_id);
CREATE INDEX idx_reactions_type ON reactions(reaction_type);
CREATE INDEX idx_reactions_created_at DESC ON reactions(created_at DESC);
CREATE INDEX idx_reactions_active ON reactions(is_active);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Reactions table created successfully';
END $$;
```

---

### **Table 2: `follows`**
Track follow relationships:

```sql
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Follower Info
    follower_user_id UUID NOT NULL,
    follower_identity_mode VARCHAR(10) CHECK (follower_identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Followee Info
    followee_user_id UUID NOT NULL,
    followee_identity_mode VARCHAR(10) CHECK (followee_identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- State
    is_active BOOLEAN DEFAULT TRUE, -- Can unfollow by setting to FALSE
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unfollowed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT follows_follower_fk FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT follows_followee_fk FOREIGN KEY (followee_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT follows_no_self_follow CHECK (follower_user_id != followee_user_id),
    -- One follow per identity mode pair
    UNIQUE(follower_user_id, follower_identity_mode, followee_user_id, followee_identity_mode)
);

-- Indexes for performance
CREATE INDEX idx_follows_follower ON follows(follower_user_id);
CREATE INDEX idx_follows_followee ON follows(followee_user_id);
CREATE INDEX idx_follows_active ON follows(is_active);
CREATE INDEX idx_follows_created_at DESC ON follows(created_at DESC);

-- For efficient feed generation
CREATE INDEX idx_follows_follower_active ON follows(follower_user_id, is_active);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Follows table created successfully';
END $$;
```

---

### **Table 3: `blocks`**
Track blocked relationships:

```sql
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

-- Indexes for performance
CREATE INDEX idx_blocks_blocker ON blocks(blocker_user_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_user_id);
CREATE INDEX idx_blocks_active ON blocks(is_active);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Blocks table created successfully';
END $$;
```

---

### **Table 4: `notifications`**
Track user notifications:

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    recipient_user_id UUID NOT NULL,
    
    -- Sender/Actor
    actor_user_id UUID,
    actor_identity_mode VARCHAR(10) CHECK (actor_identity_mode IN ('true_self', 'shadow')),
    actor_display_name VARCHAR(100), -- Snapshot at notification time
    
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
    action_url VARCHAR(500), -- Link to relevant content
    
    -- State
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Delivery
    delivery_channels JSONB DEFAULT '[]', -- ['in_app', 'email', 'push']
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT notification_recipient_fk FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT notification_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at DESC ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- For efficient unread count
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Notifications table created successfully';
END $$;
```

---

### **Table 5: `activity_feed`**
Denormalized activity feed for fast queries:

```sql
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
    content_type VARCHAR(20), -- 'post', 'comment', 'poll', etc.
    
    -- Engagement
    engagement_count INTEGER DEFAULT 0, -- reactions + comments
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT activity_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_activity_user ON activity_feed(user_id);
CREATE INDEX idx_activity_type ON activity_feed(activity_type);
CREATE INDEX idx_activity_created_at DESC ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_identity ON activity_feed(identity_mode);

-- For feed generation (followers of a user)
CREATE INDEX idx_activity_user_created ON activity_feed(user_id, created_at DESC);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Activity feed table created successfully';
END $$;
```

---

### **Table 6: `notification_preferences`**
User control over notification triggers:

```sql
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
    muted_users JSONB DEFAULT '[]', -- Array of user IDs
    muted_keywords JSONB DEFAULT '[]', -- Array of keywords
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT prefs_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Notification preferences table created successfully';
END $$;
```

---

### **Table 7: `social_stats`**
Denormalized stats for fast queries:

```sql
CREATE TABLE IF NOT EXISTS social_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Follower Stats
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    
    -- Engagement Stats
    post_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    
    -- Metrics
    total_engagements INTEGER DEFAULT 0, -- reactions + comments on user's content
    engagement_rate DECIMAL(5,2) DEFAULT 0, -- engagement / followers
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT stats_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_social_stats_user ON social_stats(user_id);
CREATE INDEX idx_social_stats_follower_count DESC ON social_stats(follower_count DESC);
CREATE INDEX idx_social_stats_engagement_rate DESC ON social_stats(engagement_rate DESC);

DO $$
BEGIN
    RAISE NOTICE 'Module 08: Social stats table created successfully';
END $$;
```

---

## 🔧 Core Services (5 Total)

### **Service 1: Reaction Service** (`src/services/reaction.service.ts`)

```typescript
import * as db from '../utils/database';
import { CreateReactionDTO } from '../types/reaction.types';

// ============================================================================
// ADD REACTION
// ============================================================================

export async function addReaction(data: CreateReactionDTO) {
  const {
    userId,
    identityMode,
    postId,
    commentId,
    reactionType
  } = data;

  // Validate reaction type
  const validTypes = ['upvote', 'downvote', 'helpful', 'insightful', 'inspiring', 'funny'];
  if (!validTypes.includes(reactionType)) {
    throw new Error('Invalid reaction type');
  }

  // Verify content exists
  if (postId) {
    const post = await db.query('SELECT id FROM posts WHERE id = $1 AND is_deleted = FALSE', [postId]);
    if (post.rows.length === 0) {
      throw new Error('Post not found');
    }
  } else if (commentId) {
    const comment = await db.query('SELECT id FROM comments WHERE id = $1 AND is_deleted = FALSE', [commentId]);
    if (comment.rows.length === 0) {
      throw new Error('Comment not found');
    }
  }

  // Insert or update reaction
  const result = await db.query(
    `INSERT INTO reactions (user_id, identity_mode, post_id, comment_id, reaction_type)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, post_id, comment_id, reaction_type) 
     DO UPDATE SET is_active = TRUE, updated_at = NOW()
     RETURNING *`,
    [userId, identityMode, postId, commentId, reactionType]
  );

  return result.rows[0];
}

// ============================================================================
// REMOVE REACTION
// ============================================================================

export async function removeReaction(reactionId: string, userId: string) {
  // Verify ownership
  const reactionResult = await db.query(
    'SELECT user_id FROM reactions WHERE id = $1',
    [reactionId]
  );

  if (reactionResult.rows.length === 0) {
    throw new Error('Reaction not found');
  }

  if (reactionResult.rows[0].user_id !== userId) {
    throw new Error('Unauthorized: You do not own this reaction');
  }

  // Mark as inactive instead of deleting
  await db.query(
    'UPDATE reactions SET is_active = FALSE WHERE id = $1',
    [reactionId]
  );

  return { success: true };
}

// ============================================================================
// GET REACTIONS FOR CONTENT
// ============================================================================

export async function getReactionsForContent(postId?: string, commentId?: string) {
  let query = `
    SELECT reaction_type, COUNT(*) as count
    FROM reactions
    WHERE is_active = TRUE
  `;

  const params: any[] = [];

  if (postId) {
    query += ` AND post_id = $${params.length + 1}`;
    params.push(postId);
  } else if (commentId) {
    query += ` AND comment_id = $${params.length + 1}`;
    params.push(commentId);
  }

  query += ` GROUP BY reaction_type`;

  const result = await db.query(query, params);

  // Convert to object format
  const reactions: { [key: string]: number } = {};
  result.rows.forEach(row => {
    reactions[row.reaction_type] = row.count;
  });

  return reactions;
}

// ============================================================================
// GET USER'S REACTION TO CONTENT
// ============================================================================

export async function getUserReaction(userId: string, postId?: string, commentId?: string) {
  let query = `
    SELECT reaction_type FROM reactions
    WHERE user_id = $1 AND is_active = TRUE
  `;

  const params: any[] = [userId];

  if (postId) {
    query += ` AND post_id = $${params.length + 1}`;
    params.push(postId);
  } else if (commentId) {
    query += ` AND comment_id = $${params.length + 1}`;
    params.push(commentId);
  }

  const result = await db.query(query, params);
  return result.rows.length > 0 ? result.rows[0].reaction_type : null;
}
```

---

### **Service 2: Follow Service** (`src/services/follow.service.ts`)

```typescript
import * as db from '../utils/database';

// ============================================================================
// FOLLOW USER
// ============================================================================

export async function followUser(data: {
  followerUserId: string;
  followerIdentityMode: 'true_self' | 'shadow';
  followeeUserId: string;
  followeeIdentityMode: 'true_self' | 'shadow';
}) {
  const {
    followerUserId,
    followerIdentityMode,
    followeeUserId,
    followeeIdentityMode
  } = data;

  if (followerUserId === followeeUserId) {
    throw new Error('Cannot follow yourself');
  }

  // Check if already following
  const existing = await db.query(
    `SELECT id FROM follows 
     WHERE follower_user_id = $1 AND follower_identity_mode = $2
     AND followee_user_id = $3 AND followee_identity_mode = $4`,
    [followerUserId, followerIdentityMode, followeeUserId, followeeIdentityMode]
  );

  if (existing.rows.length > 0) {
    // Reactivate if was unfollowed
    await db.query(
      `UPDATE follows SET is_active = TRUE, unfollowed_at = NULL
       WHERE id = $1`,
      [existing.rows[0].id]
    );
    return existing.rows[0];
  }

  // Create new follow
  const result = await db.query(
    `INSERT INTO follows (
      follower_user_id, follower_identity_mode, followee_user_id, followee_identity_mode
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [followerUserId, followerIdentityMode, followeeUserId, followeeIdentityMode]
  );

  // Update stats
  await updateFollowerStats(followeeUserId, followeeIdentityMode, 1);
  await updateFollowingStats(followerUserId, followerIdentityMode, 1);

  return result.rows[0];
}

// ============================================================================
// UNFOLLOW USER
// ============================================================================

export async function unfollowUser(data: {
  followerUserId: string;
  followerIdentityMode: 'true_self' | 'shadow';
  followeeUserId: string;
  followeeIdentityMode: 'true_self' | 'shadow';
}) {
  const {
    followerUserId,
    followerIdentityMode,
    followeeUserId,
    followeeIdentityMode
  } = data;

  const result = await db.query(
    `UPDATE follows SET is_active = FALSE, unfollowed_at = NOW()
     WHERE follower_user_id = $1 AND follower_identity_mode = $2
     AND followee_user_id = $3 AND followee_identity_mode = $4
     RETURNING *`,
    [followerUserId, followerIdentityMode, followeeUserId, followeeIdentityMode]
  );

  if (result.rows.length === 0) {
    throw new Error('Not following this user');
  }

  // Update stats
  await updateFollowerStats(followeeUserId, followeeIdentityMode, -1);
  await updateFollowingStats(followerUserId, followerIdentityMode, -1);

  return { success: true };
}

// ============================================================================
// GET FOLLOWERS
// ============================================================================

export async function getFollowers(userId: string, identityMode: string, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT f.*, u.display_name, p.avatar_url
     FROM follows f
     LEFT JOIN users u ON f.follower_user_id = u.id
     LEFT JOIN user_profiles p ON p.user_id = u.id AND p.identity_mode = f.follower_identity_mode
     WHERE f.followee_user_id = $1 AND f.followee_identity_mode = $2 AND f.is_active = TRUE
     ORDER BY f.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, identityMode, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// GET FOLLOWING
// ============================================================================

export async function getFollowing(userId: string, identityMode: string, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT f.*, u.display_name, p.avatar_url
     FROM follows f
     LEFT JOIN users u ON f.followee_user_id = u.id
     LEFT JOIN user_profiles p ON p.user_id = u.id AND p.identity_mode = f.followee_identity_mode
     WHERE f.follower_user_id = $1 AND f.follower_identity_mode = $2 AND f.is_active = TRUE
     ORDER BY f.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, identityMode, limit, offset]
  );

  return result.rows;
}

// Helper functions
async function updateFollowerStats(userId: string, identityMode: string, delta: number) {
  await db.query(
    `UPDATE social_stats SET follower_count = follower_count + $1
     WHERE user_id = $2 AND identity_mode = $3`,
    [delta, userId, identityMode]
  );
}

async function updateFollowingStats(userId: string, identityMode: string, delta: number) {
  await db.query(
    `UPDATE social_stats SET following_count = following_count + $1
     WHERE user_id = $2 AND identity_mode = $3`,
    [delta, userId, identityMode]
  );
}
```

---

### **Service 3: Notification Service** (`src/services/notification.service.ts`)

```typescript
import * as db from '../utils/database';
import { CreateNotificationDTO } from '../types/notification.types';

// ============================================================================
// CREATE NOTIFICATION
// ============================================================================

export async function createNotification(data: CreateNotificationDTO) {
  const {
    recipientUserId,
    actorUserId,
    actorIdentityMode,
    actorDisplayName,
    notificationType,
    postId,
    commentId,
    title,
    message,
    actionUrl,
    deliveryChannels = ['in_app']
  } = data;

  // Create notification
  const result = await db.query(
    `INSERT INTO notifications (
      recipient_user_id, actor_user_id, actor_identity_mode, actor_display_name,
      notification_type, post_id, comment_id, title, message, action_url, delivery_channels
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      recipientUserId,
      actorUserId,
      actorIdentityMode,
      actorDisplayName,
      notificationType,
      postId,
      commentId,
      title,
      message,
      actionUrl,
      JSON.stringify(deliveryChannels)
    ]
  );

  return result.rows[0];
}

// ============================================================================
// MARK AS READ
// ============================================================================

export async function markAsRead(notificationId: string, userId: string) {
  const result = await db.query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND recipient_user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Notification not found');
  }

  return result.rows[0];
}

// ============================================================================
// GET UNREAD NOTIFICATIONS
// ============================================================================

export async function getUnreadNotifications(userId: string, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT * FROM notifications
     WHERE recipient_user_id = $1 AND is_read = FALSE
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// GET UNREAD COUNT
// ============================================================================

export async function getUnreadCount(userId: string) {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM notifications
     WHERE recipient_user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}

// ============================================================================
// GET ALL NOTIFICATIONS (PAGINATED)
// ============================================================================

export async function getNotifications(userId: string, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT * FROM notifications
     WHERE recipient_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}
```

---

### **Service 4: Activity Feed Service** (`src/services/feed.service.ts`)

```typescript
import * as db from '../utils/database';

// ============================================================================
// GET PERSONALIZED FEED
// ============================================================================

export async function getPersonalizedFeed(userId: string, identityMode: string, limit = 20, offset = 0) {
  // Get all users this user follows in this identity mode
  const followingResult = await db.query(
    `SELECT followee_user_id FROM follows
     WHERE follower_user_id = $1 AND follower_identity_mode = $2 AND is_active = TRUE`,
    [userId, identityMode]
  );

  const followeeIds = followingResult.rows.map(row => row.followee_user_id);

  if (followeeIds.length === 0) {
    // Return empty feed if not following anyone
    return [];
  }

  // Get activities from followed users
  const placeholders = followeeIds.map((_, i) => `$${i + 1}`).join(',');
  
  const result = await db.query(
    `SELECT * FROM activity_feed
     WHERE user_id IN (${placeholders})
     ORDER BY created_at DESC
     LIMIT $${followeeIds.length + 1} OFFSET $${followeeIds.length + 2}`,
    [...followeeIds, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// GET USER ACTIVITIES
// ============================================================================

export async function getUserActivities(userId: string, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT * FROM activity_feed
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

// ============================================================================
// LOG ACTIVITY
// ============================================================================

export async function logActivity(data: {
  userId: string;
  identityMode: 'true_self' | 'shadow';
  displayName: string;
  activityType: string;
  postId?: string;
  commentId?: string;
  contentPreview?: string;
  contentType?: string;
}) {
  const {
    userId,
    identityMode,
    displayName,
    activityType,
    postId,
    commentId,
    contentPreview,
    contentType
  } = data;

  const result = await db.query(
    `INSERT INTO activity_feed (
      user_id, identity_mode, display_name, activity_type,
      post_id, comment_id, content_preview, content_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      userId,
      identityMode,
      displayName,
      activityType,
      postId,
      commentId,
      contentPreview,
      contentType
    ]
  );

  return result.rows[0];
}

// ============================================================================
// GET TRENDING CONTENT
// ============================================================================

export async function getTrendingActivities(timeframeHours = 24, limit = 20) {
  const result = await db.query(
    `SELECT * FROM activity_feed
     WHERE created_at > NOW() - INTERVAL '${timeframeHours} hours'
     ORDER BY engagement_count DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}
```

---

### **Service 5: Block Service** (`src/services/block.service.ts`)

```typescript
import * as db from '../utils/database';

// ============================================================================
// BLOCK USER
// ============================================================================

export async function blockUser(data: {
  blockerUserId: string;
  blockerIdentityMode: 'true_self' | 'shadow';
  blockedUserId: string;
  reason?: string;
}) {
  const {
    blockerUserId,
    blockerIdentityMode,
    blockedUserId,
    reason
  } = data;

  if (blockerUserId === blockedUserId) {
    throw new Error('Cannot block yourself');
  }

  // Check if already blocked
  const existing = await db.query(
    `SELECT id FROM blocks
     WHERE blocker_user_id = $1 AND blocker_identity_mode = $2
     AND blocked_user_id = $3`,
    [blockerUserId, blockerIdentityMode, blockedUserId]
  );

  if (existing.rows.length > 0) {
    // Reactivate block
    await db.query(
      `UPDATE blocks SET is_active = TRUE, unblocked_at = NULL
       WHERE id = $1`,
      [existing.rows[0].id]
    );
    return existing.rows[0];
  }

  // Create new block
  const result = await db.query(
    `INSERT INTO blocks (
      blocker_user_id, blocker_identity_mode, blocked_user_id, reason
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [blockerUserId, blockerIdentityMode, blockedUserId, reason]
  );

  // Remove any existing follow relationships
  await db.query(
    `DELETE FROM follows
     WHERE (follower_user_id = $1 AND followee_user_id = $2)
     OR (follower_user_id = $2 AND followee_user_id = $1)`,
    [blockerUserId, blockedUserId]
  );

  return result.rows[0];
}

// ============================================================================
// UNBLOCK USER
// ============================================================================

export async function unblockUser(data: {
  blockerUserId: string;
  blockerIdentityMode: 'true_self' | 'shadow';
  blockedUserId: string;
}) {
  const {
    blockerUserId,
    blockerIdentityMode,
    blockedUserId
  } = data;

  const result = await db.query(
    `UPDATE blocks SET is_active = FALSE, unblocked_at = NOW()
     WHERE blocker_user_id = $1 AND blocker_identity_mode = $2
     AND blocked_user_id = $3
     RETURNING *`,
    [blockerUserId, blockerIdentityMode, blockedUserId]
  );

  if (result.rows.length === 0) {
    throw new Error('Block relationship not found');
  }

  return { success: true };
}

// ============================================================================
// CHECK IF BLOCKED
// ============================================================================

export async function isUserBlocked(blockerUserId: string, blockerIdentityMode: string, blockedUserId: string) {
  const result = await db.query(
    `SELECT id FROM blocks
     WHERE blocker_user_id = $1 AND blocker_identity_mode = $2
     AND blocked_user_id = $3 AND is_active = TRUE`,
    [blockerUserId, blockerIdentityMode, blockedUserId]
  );

  return result.rows.length > 0;
}
```

---

## 🌐 API Routes (18 Endpoints)

### **Reaction Endpoints**
```
POST   /api/v1/social/reactions           - Add reaction
DELETE /api/v1/social/reactions/:id       - Remove reaction
GET    /api/v1/content/posts/:id/reactions - Get reactions on post
GET    /api/v1/content/comments/:id/reactions - Get reactions on comment
```

### **Follow Endpoints**
```
POST   /api/v1/social/follows             - Follow user
DELETE /api/v1/social/follows/:id         - Unfollow user
GET    /api/v1/users/:id/followers        - Get followers list
GET    /api/v1/users/:id/following        - Get following list
```

### **Notification Endpoints**
```
GET    /api/v1/notifications              - Get notifications
GET    /api/v1/notifications/unread       - Get unread notifications
GET    /api/v1/notifications/count        - Get unread count
PATCH  /api/v1/notifications/:id/read     - Mark as read
PATCH  /api/v1/notifications/read-all     - Mark all as read
GET    /api/v1/notifications/preferences  - Get notification preferences
PATCH  /api/v1/notifications/preferences  - Update preferences
```

### **Feed Endpoints**
```
GET    /api/v1/feed                       - Get personalized feed
GET    /api/v1/trending                   - Get trending content
```

### **Block Endpoints**
```
POST   /api/v1/social/blocks              - Block user
DELETE /api/v1/social/blocks/:id          - Unblock user
GET    /api/v1/social/blocked             - Get blocked users
```

---

## 🧪 Testing Strategy

### **Unit Tests** (50+ expected)

**Reaction Service Tests** (12 tests):
- Add reaction (valid types)
- Add reaction (invalid types)
- Remove reaction (ownership verification)
- Duplicate reaction handling
- Get reactions aggregated
- Get user's specific reaction

**Follow Service Tests** (12 tests):
- Follow user (different identity modes)
- Unfollow user
- Self-follow prevention
- Get followers paginated
- Get following paginated
- Stats updates

**Notification Service Tests** (14 tests):
- Create notification with different types
- Mark as read
- Get unread notifications
- Get unread count
- Notification preferences
- Delivery channel selection

**Feed Service Tests** (12 tests):
- Get personalized feed (follows respected)
- Empty feed when no follows
- Log different activity types
- Get user activities
- Get trending content
- Time-based filtering

**Block Service Tests** (8 tests):
- Block user
- Unblock user
- Check if blocked
- Self-block prevention
- Follow removal on block

### **Integration Tests** (20+ expected)

- Follow user → See feed
- Unfollow user → Feed updated
- React to post → Notification sent
- React to comment → Count incremented
- Block user → Remove existing follows
- Create post → Activity logged → Appears in followers' feeds
- Dual-identity follows (separate graphs)
- Notification preferences respected
- Blocked user cannot see mentions

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| **Feed generation** | <200ms |
| **Follow action** | <100ms |
| **Reaction creation** | <50ms |
| **Notifications fetch** | <100ms |
| **Trending calculation** | <500ms |
| **Concurrent followers** | 100K+ |
| **Max followers per user** | 1M+ |

---

## 🔗 Integration with Other Modules

### **Depends On**:
- **Module 01** (Identity) - User identity modes
- **Module 03** (User) - User profiles
- **Module 04** (Economy) - Light Score display
- **Module 07** (Content) - Posts/comments to react to

### **Provides To**:
- **Module 09** (Verification) - Social proof
- **Module 10** (Analytics) - Engagement metrics
- **Module 13** (Dashboard) - Activity feeds

---

## ⚠️ Critical Reminders

1. **Dual-Identity Graphs** - Keep True Self and Shadow social graphs completely separate
2. **Performance First** - Feeds are read-heavy; optimize queries
3. **Real-time Notifications** - Use WebSockets for instant delivery
4. **Privacy by Default** - Shadow followers not visible to others
5. **Block Enforcement** - Blocked users cannot see content or receive mentions
6. **Denormalized Stats** - Keep social_stats table updated for fast queries
7. **Pagination Always** - All list endpoints must be paginated
8. **Activity Logging** - Log activity asynchronously to not slow down operations
9. **Notification Preferences** - Always respect user's delivery preferences

---

## 🚀 Build Timeline

**Week 10** (after Module 07: Content is complete)

### **Days 1-2: Database Setup**
- Create 7 tables with proper indexes
- Test performance of feed queries
- Set up denormalization triggers

### **Days 3-4: Core Services**
- Reaction service (add, remove, get)
- Follow service (follow, unfollow, lists)
- Block service (block, unblock, check)

### **Days 5-6: Notification & Feed**
- Notification service (create, read, preferences)
- Activity feed service (personal feed, trending)
- Real-time WebSocket handlers

### **Days 7-8: API Layer**
- Build 18 REST endpoints
- Add WebSocket support
- Add rate limiting

### **Days 9-10: Testing & Integration**
- Unit tests (50+)
- Integration tests (20+)
- Cross-module integration with Module 07
- Performance benchmarking

**Deliverable**: Complete social engagement system!

---

## 📊 Success Metrics

### **Functionality**
- ✅ Users can follow/unfollow
- ✅ Reactions work on all content
- ✅ Feeds generate in <200ms
- ✅ Notifications delivered instantly

### **User Experience**
- ✅ Notifications feel immediate
- ✅ Feeds show relevant content
- ✅ Block functionality works seamlessly
- ✅ Preferences respected

### **Performance**
- ✅ 100K+ concurrent users supported
- ✅ Feed queries <200ms
- ✅ Real-time notifications <1s
- ✅ No notification delays

---

**Module 08 Status**: ✅ Design Complete - Ready to Build

**Previous Module**: Module 07 (Content) - Ready to Build  
**Next Module**: Module 09 (Verification) - Proof of Humanity & Veracity Bonds
