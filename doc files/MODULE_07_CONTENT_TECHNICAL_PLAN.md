# 📝 Module 07: Content - Technical Specification
## Posts, Discussions, Comments with Dual-Identity Support for Dream Protocol

**Module Number**: 07 of 22  
**Build Priority**: PRIORITY 3 - Core Value (After Module 06: Governance)  
**Dependencies**: Module 01 (Identity), Module 03 (User), Module 04 (Economy), Module 06 (Governance)  
**Dependents**: Module 08 (Social), Module 09 (Verification), Module 10 (Analytics), Module 13 (Dashboard)  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 07 implements the foundational content creation system for Dream Protocol. This is where users create posts, start discussions, and engage with ideas. This module is critical because everything else depends on it—governance needs polls to vote on, social features need content to engage with, and analytics needs content data to analyze.

### **Core Philosophy**
> "Content is the lifeblood of community discourse. Every post, discussion, and comment is an opportunity for truth-seeking. Users should be able to create content in their chosen identity mode with confidence that their privacy is respected and their contributions are valued."

### **Key Innovation**
Dual-identity content creation means the same user can participate in both True Self (accountable, public-facing) and Shadow (anonymous, exploratory) modes within the same platform. This enables both brave public leadership AND safe space for exploring controversial ideas.

---

## 🏗️ What This Module Does

### **Primary Functions**

1. **Post Creation & Management** - Users create posts in either identity mode
2. **Discussion Threads** - Organize conversations around topics
3. **Comments & Replies** - Nested comment threads on posts and discussions
4. **Content Editing & Deletion** - Manage content lifecycle
5. **Content Moderation** - Flag, report, and manage inappropriate content
6. **Rich Text Support** - Markdown formatting, mentions, links
7. **Media Attachments** - Images, videos, files (basic support)
8. **Content Discovery** - Recent, trending, filtered by category
9. **Cross-Identity Separation** - Keep True Self and Shadow content separate
10. **Audit Trail** - Track all content changes for accountability

### **Key Features**

- ✅ Dual-identity post creation (True Self vs Shadow)
- ✅ Three content types: Posts, Discussions, Comments
- ✅ Nested comment threads (tree structure)
- ✅ Rich text editor with Markdown support
- ✅ Mention system (@username tags)
- ✅ Hashtag system (#topic tracking)
- ✅ Media attachments (images, documents)
- ✅ Content flagging & reporting system
- ✅ Basic moderation tools (hide, remove)
- ✅ Edit history tracking
- ✅ Soft deletes (preserve audit trail)
- ✅ Performance optimized (pagination, caching)

---

## 📊 Database Schema

### **Table 1: `posts`**
Master table for all user-created posts:

```sql
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

-- Indexes for performance
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_identity_mode ON posts(identity_mode);
CREATE INDEX idx_posts_created_at DESC ON posts(created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX idx_posts_moderation_status ON posts(moderation_status);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);

-- Full-text search index
CREATE INDEX idx_posts_search ON posts USING GIN(
    to_tsvector('english', title || ' ' || content)
);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Posts table created successfully';
END $$;
```

---

### **Table 2: `discussions`**
Container for organized topic discussions:

```sql
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

CREATE INDEX idx_discussions_user ON discussions(user_id);
CREATE INDEX idx_discussions_topic ON discussions(topic);
CREATE INDEX idx_discussions_created_at DESC ON discussions(created_at DESC);
CREATE INDEX idx_discussions_is_open ON discussions(is_open);
CREATE INDEX idx_discussions_is_deleted ON discussions(is_deleted);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Discussions table created successfully';
END $$;
```

---

### **Table 3: `comments`**
Nested comment threads (supports replies to comments):

```sql
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
        (parent_post_id IS NOT NULL AND parent_comment_id IS NULL) OR
        (parent_post_id IS NULL AND parent_comment_id IS NOT NULL AND parent_discussion_id IS NULL) OR
        (parent_discussion_id IS NOT NULL AND parent_comment_id IS NULL)
    )
);

CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_post ON comments(parent_post_id);
CREATE INDEX idx_comments_discussion ON comments(parent_discussion_id);
CREATE INDEX idx_comments_parent_comment ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at DESC ON comments(created_at DESC);
CREATE INDEX idx_comments_is_deleted ON comments(is_deleted);
CREATE INDEX idx_comments_moderation_status ON comments(moderation_status);
CREATE INDEX idx_comments_identity ON comments(identity_mode);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Comments table created successfully';
END $$;
```

---

### **Table 4: `content_media`**
Media attachments (images, videos, documents):

```sql
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

CREATE INDEX idx_media_user ON content_media(user_id);
CREATE INDEX idx_media_post ON content_media(post_id);
CREATE INDEX idx_media_comment ON content_media(comment_id);
CREATE INDEX idx_media_file_type ON content_media(file_type);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Content media table created successfully';
END $$;
```

---

### **Table 5: `content_mentions`**
Track @mentions for notifications:

```sql
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

CREATE INDEX idx_mentions_mentioned ON content_mentions(mentioned_user_id);
CREATE INDEX idx_mentions_is_read ON content_mentions(is_read);
CREATE INDEX idx_mentions_created_at DESC ON content_mentions(created_at DESC);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Content mentions table created successfully';
END $$;
```

---

### **Table 6: `content_reports`**
User-submitted moderation reports:

```sql
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

CREATE INDEX idx_reports_status ON content_reports(status);
CREATE INDEX idx_reports_reason ON content_reports(reason);
CREATE INDEX idx_reports_created_at DESC ON content_reports(created_at DESC);
CREATE INDEX idx_reports_post ON content_reports(post_id);
CREATE INDEX idx_reports_comment ON content_reports(comment_id);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Content reports table created successfully';
END $$;
```

---

### **Table 7: `content_edit_history`**
Track all edits for transparency:

```sql
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

CREATE INDEX idx_edit_history_post ON content_edit_history(post_id);
CREATE INDEX idx_edit_history_comment ON content_edit_history(comment_id);
CREATE INDEX idx_edit_history_edited_at DESC ON content_edit_history(edited_at DESC);

DO $$
BEGIN
    RAISE NOTICE 'Module 07: Content edit history table created successfully';
END $$;
```

---

## 🔧 Core Services (4 Total)

### **Service 1: Post Service** (`src/services/post.service.ts`)

**Functions**:
- `createPost(data)` - Create post with validation
- `getPost(postId, viewerUserId)` - Retrieve and increment views
- `updatePost(postId, userId, data)` - Update with ownership check
- `deletePost(postId, userId)` - Soft delete
- `listPosts(options)` - Paginated list with filters
- `flagPost(postId, reason, description, reporterId)` - Submit report

**Key Validations**:
- Title: required, max 300 chars
- Content: required, max 50,000 chars
- Owner verification for updates/deletes
- View count increment on retrieval

---

### **Service 2: Comment Service** (`src/services/comment.service.ts`)

**Functions**:
- `createComment(data)` - Create with depth limiting (max 5 levels)
- `getCommentThread(commentId)` - Recursive retrieval of all replies
- `deleteComment(commentId, userId)` - Soft delete with ownership check
- `getPostComments(postId, options)` - Paginated top-level comments

**Key Features**:
- Automatic depth calculation
- Parent count updates
- Nested reply support
- Max nesting depth enforcement

---

### **Service 3: Discussion Service** (`src/services/discussion.service.ts`)

**Functions**:
- `createDiscussion(data)` - Create new discussion
- `getDiscussion(discussionId)` - Retrieve discussion details
- `listDiscussions(options)` - Paginated list by topic

**Key Features**:
- Topic-based organization
- Open/closed status tracking
- Approval requirement option

---

### **Service 4: Moderation Service** (`src/services/moderation.service.ts`)

**Functions**:
- `hideContent(contentId, contentType, reason, moderatorId)` - Soft moderation
- `removeContent(contentId, contentType, reason, moderatorId)` - Hard deletion
- `resolveReport(reportId, resolution, reason, moderatorId)` - Resolve investigation
- `getPendingReports(limit, offset)` - Admin queue

**Key Features**:
- Moderation status tracking
- Audit trail recording
- Report resolution workflow

---

## 🌐 API Routes (10 Endpoints)

### **Post Endpoints**

```
POST /api/v1/content/posts
- Create new post
- Auth required

GET /api/v1/content/posts/:postId
- Get post details (increments view count)
- Public

PATCH /api/v1/content/posts/:postId
- Update post (owner only)
- Auth required

DELETE /api/v1/content/posts/:postId
- Soft delete post (owner only)
- Auth required

GET /api/v1/content/posts
- List posts with pagination
- Query params: limit, offset, category, identity_mode, sort_by
- Public
```

### **Comment Endpoints**

```
POST /api/v1/content/comments
- Create comment
- Auth required

GET /api/v1/content/posts/:postId/comments
- Get post comments (paginated)
- Query params: limit, offset
- Public
```

### **Discussion Endpoints**

```
POST /api/v1/content/discussions
- Create new discussion
- Auth required

GET /api/v1/content/discussions
- List discussions
- Query params: limit, offset, topic
- Public
```

### **Moderation Endpoints**

```
POST /api/v1/content/posts/:postId/flag
- Flag post for moderation
- Auth required

GET /api/v1/admin/content/reports
- Get pending reports (admin only)
- Query params: status, limit, offset
- Admin auth required
```

---

## 🧪 Testing Strategy

### **Unit Tests** (45+ tests expected)

**Post Service Tests** (15 tests):
- Create post with valid/invalid data
- Update post (owner verification)
- Delete post (soft delete verification)
- Get post (view count increment)
- List posts with filters and pagination
- Flag post (report creation)
- Edit history tracking

**Comment Service Tests** (15 tests):
- Create comment on post
- Create nested replies (depth limiting)
- Invalid content validation
- Delete comment (soft delete)
- Get comment thread (recursive)
- List post comments (pagination)
- Parent count updates

**Discussion Service Tests** (8 tests):
- Create discussion
- Get discussion details
- List discussions by topic
- Filter open/closed discussions

**Moderation Service Tests** (7 tests):
- Hide content
- Remove content
- Resolve report (upheld/dismissed)
- Get pending reports

### **Integration Tests** (15+ tests expected)

- End-to-end post creation workflow
- Dual-identity content separation (True Self vs Shadow)
- Post creation → comment → nested reply flow
- Moderation workflow: flag → review → resolve
- Edit history tracking and verification
- Soft delete verification
- Cross-module integration with Module 06 (Governance)

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| **Post retrieval** | <50ms |
| **Comment thread loading** | <100ms |
| **List 20 posts** | <100ms |
| **Full-text search** | <200ms |
| **Concurrent post creations** | 100+ |
| **Concurrent reads** | 1000+ |
| **Max posts in DB** | 10,000+ |

---

## 🔗 Integration with Other Modules

### **Depends On**:
- **Module 01** (Identity) - User identity modes
- **Module 03** (User) - User profiles & display names
- **Module 04** (Economy) - Light Score on posts
- **Module 06** (Governance) - Posts/discussions for polls

### **Provides To**:
- **Module 08** (Social) - Reactions & follows on posts
- **Module 09** (Verification) - Content verification
- **Module 10** (Analytics) - Content analytics
- **Module 13** (Dashboard) - Activity feeds

---

## ⚠️ Critical Reminders

1. **Dual-Identity Separation** - True Self and Shadow posts must be completely separate
2. **Soft Deletes** - Always use soft deletes (set is_deleted flag) for audit trail
3. **Edit History** - Track ALL edits transparently
4. **Moderation First** - Content is hidden by default after 3 reports
5. **Privacy by Default** - Shadow mode should never reveal identity
6. **Markdown Support** - Posts support rich text, not HTML (security)
7. **Performance** - Pagination required for all list endpoints
8. **Nesting Limit** - Comments can nest max 5 levels deep
9. **Character Limits** - Enforce strictly (titles 300 chars, posts 50k, comments 5k)

---

## 🚀 Build Timeline

**Week 9** (after Module 06: Governance is complete)

### **Days 1-2: Database Setup**
- Create 7 tables
- Add all indexes and full-text search indexes
- Run migrations

### **Days 3-4: Core Services**
- Post service (create, read, update, delete, list)
- Comment service (create, thread retrieval, deletion)
- Discussion service (create, retrieve, list)

### **Days 5-6: Moderation Services**
- Moderation service (hide, remove, report handling)
- Report management (list pending, resolve)
- Edit history tracking

### **Days 7-8: API Layer**
- Build 10 REST endpoints
- Add authentication middleware
- Add input validation
- Add rate limiting

### **Days 9-10: Testing & Integration**
- Unit tests for all services
- Integration tests for workflows
- Performance testing
- Cross-module integration with Module 06

**Deliverable**: Full content creation system with moderation!

---

## 📊 Success Metrics

### **Functionality**
- ✅ 100% of users can create posts
- ✅ Posts create in <500ms
- ✅ Comments retrieve in <100ms
- ✅ Edit history tracked for all edits

### **User Experience**
- ✅ Post creation flow is intuitive (<5 clicks)
- ✅ Comment threads load smoothly
- ✅ Moderation actions visible to admins

### **Content Quality**
- ✅ 0 HTML injection attacks
- ✅ Markdown rendering works correctly
- ✅ Media uploads secure

---

**Module 07 Status**: ✅ Design Complete - Ready to Build

**Previous Module**: Module 06 (Governance) - Ready to Build  
**Next Module**: Module 08 (Social) - Reactions, Follows, Notifications
