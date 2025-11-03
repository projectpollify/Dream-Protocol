# Frontend Phase 3: Social Features (Week 9-12)
## Dream Protocol - Community & Interaction Layer

**Start Date**: After Phase 2 completion
**Duration**: 4 weeks
**Priority**: MEDIUM - Enhanced user engagement
**Prerequisites**: Phase 1 & 2 complete (Auth, Polls, Staking, Notifications)

---

## 🎯 Phase 3 Goal
Transform Dream Protocol into a **vibrant social platform**:
- Complete user profiles with editing
- Rich activity feeds and discovery
- Following and social graphs
- Reactions and engagement
- Direct messaging (new feature!)
- Content creation and discussions

---

## 📋 Week-by-Week Breakdown

### **Week 9: Complete User Profiles**

#### Day 57-58: Profile Editing
**Route: /profile/edit**
**Component: EditProfile.tsx**

```tsx
interface ProfileEditData {
  displayName: string;
  username: string;
  bio: string;
  avatar: File | string;
  banner: File | string;
  website?: string;
  twitter?: string;
  github?: string;
  location?: string;
  interests: string[];
  privateProfile: boolean;
}
```

**Edit Form Sections:**

**1. Basic Information**
```tsx
<ProfileBasicEdit>
  <AvatarUpload>
    - Image cropper
    - Drag & drop
    - Size limit: 5MB
    - Format: JPG/PNG
    - Preview before save
  </AvatarUpload>

  <BannerUpload>
    - Wide banner image
    - Recommended: 1500x500
    - Color overlay option
  </BannerUpload>

  <Input
    label="Display Name"
    maxLength={50}
    validation={nameValidation}
  />

  <Input
    label="Username"
    prefix="@"
    maxLength={20}
    validation={async (username) => checkAvailability(username)}
    helper="Can only be changed once per month"
  />

  <Textarea
    label="Bio"
    maxLength={500}
    rows={4}
    helper="Tell us about yourself"
  />
</ProfileBasicEdit>
```

**2. Additional Information**
```tsx
<ProfileAdditionalEdit>
  <Input
    label="Location"
    icon={<LocationIcon />}
    placeholder="City, Country"
  />

  <Input
    label="Website"
    type="url"
    icon={<LinkIcon />}
    validation={urlValidation}
  />

  <SocialLinks>
    - Twitter/X
    - GitHub
    - LinkedIn
    - Discord
    - Custom link
  </SocialLinks>

  <InterestsTags>
    - Select from predefined
    - Add custom tags
    - Max 10 interests
    - Autocomplete
  </InterestsTags>
</ProfileAdditionalEdit>
```

**3. Privacy Settings**
```tsx
<ProfilePrivacyEdit>
  <Toggle label="Private Profile" />
  <Toggle label="Show True Self publicly" />
  <Toggle label="Show Shadow activity" />
  <Toggle label="Display Light Score" />
  <Toggle label="Show vote history" />
  <Toggle label="Show stake history" />
  <Toggle label="Allow direct messages" />

  <BlockedUsersList>
    - View blocked users
    - Unblock action
    - Search blocked
  </BlockedUsersList>
</ProfilePrivacyEdit>
```

#### Day 59-60: Enhanced Profile View
**Component: ProfileView.tsx (Enhanced)**

```tsx
<ProfileLayout>
  <ProfileHeader>
    <BannerImage />
    <AvatarSection>
      - Large avatar
      - Online status indicator
      - Verification badge
      - Identity mode badge
    </AvatarSection>

    <ProfileInfo>
      - Display name
      - @username
      - Bio with links
      - Location
      - Join date
      - Social links
    </ProfileInfo>

    <ProfileActions>
      - Follow/Unfollow button
      - Message button
      - Share profile
      - More options (Block, Report)
    </ProfileActions>
  </ProfileHeader>

  <ProfileStats>
    <StatCard title="Light Score" value={lightScore} trend={trend} />
    <StatCard title="Followers" value={followers} />
    <StatCard title="Following" value={following} />
    <StatCard title="Polls Created" value={pollCount} />
    <StatCard title="Votes Cast" value={voteCount} />
    <StatCard title="Win Rate" value={`${winRate}%`} />
  </ProfileStats>

  <ProfileTabs>
    <Tab label="Activity" count={activityCount}>
      <ActivityFeed userId={userId} />
    </Tab>
    <Tab label="Polls" count={pollCount}>
      <UserPolls userId={userId} />
    </Tab>
    <Tab label="Votes" count={voteCount}>
      <UserVotes userId={userId} />
    </Tab>
    <Tab label="Stakes" count={stakeCount}>
      <UserStakes userId={userId} />
    </Tab>
    <Tab label="Followers" count={followers}>
      <FollowersList userId={userId} />
    </Tab>
    <Tab label="Following" count={following}>
      <FollowingList userId={userId} />
    </Tab>
  </ProfileTabs>
</ProfileLayout>
```

#### Day 61-63: Profile Features
**Component: ProfileHoverCard.tsx**
```tsx
// Quick preview on username hover
<HoverCard>
  <MiniAvatar />
  <Name />
  <Username />
  <ShortBio />
  <MiniStats>
    - Light Score
    - Followers
    - Following
  </MiniStats>
  <QuickActions>
    - Follow button
    - Message button
  </QuickActions>
</HoverCard>
```

**Component: ProfileSearch.tsx**
```tsx
<UserSearch>
  <SearchInput
    placeholder="Search users..."
    debounce={300}
  />

  <Filters>
    - Verified only
    - Active recently
    - Min Light Score
    - Has voted on [poll]
  </Filters>

  <SearchResults>
    <UserCard>
      - Avatar
      - Name/username
      - Bio snippet
      - Light Score
      - Follow button
    </UserCard>
  </SearchResults>
</UserSearch>
```

---

### **Week 10: Activity Feeds & Discovery**

#### Day 64-65: Activity Feed System
**Route: /feed**
**Component: ActivityFeed.tsx**

```tsx
interface FeedItem {
  id: string;
  type: FeedItemType;
  actor: User;
  action: string;
  target?: Poll | User | Post;
  timestamp: Date;
  reactions: Reaction[];
  comments: Comment[];
}

enum FeedItemType {
  POLL_CREATED = 'poll_created',
  POLL_VOTED = 'poll_voted',
  POLL_STAKED = 'poll_staked',
  USER_FOLLOWED = 'user_followed',
  POST_CREATED = 'post_created',
  ACHIEVEMENT_EARNED = 'achievement_earned',
  MILESTONE_REACHED = 'milestone_reached'
}
```

**Feed Layout:**
```tsx
<FeedContainer>
  <FeedFilters>
    <ToggleGroup>
      - All Activity
      - Following Only
      - Polls
      - Social
      - Stakes
    </ToggleGroup>
  </FeedFilters>

  <FeedList>
    {items.map(item => (
      <FeedCard key={item.id}>
        <FeedHeader>
          <UserAvatar user={item.actor} />
          <FeedAction>
            {item.actor.name} {item.action}
          </FeedAction>
          <Timestamp time={item.timestamp} />
        </FeedHeader>

        <FeedContent>
          {renderContent(item.type, item.target)}
        </FeedContent>

        <FeedActions>
          <ReactionButton />
          <CommentButton />
          <ShareButton />
        </FeedActions>

        {item.comments.length > 0 && (
          <FeedComments comments={item.comments} />
        )}
      </FeedCard>
    ))}
  </FeedList>

  <LoadMoreButton />
</FeedContainer>
```

#### Day 66-67: Discover Page
**Route: /discover**
**Component: DiscoverPage.tsx**

```tsx
<DiscoverLayout>
  <TrendingSection>
    <SectionTitle>Trending Polls</SectionTitle>
    <TrendingPolls>
      - Most voted today
      - Highest stakes
      - Closing soon
      - Controversial (high gap)
    </TrendingPolls>
  </TrendingSection>

  <PopularUsers>
    <SectionTitle>Popular Voices</SectionTitle>
    <UserGrid>
      - Top Light Score
      - Most followers gained
      - Active contributors
      - New verified users
    </UserGrid>
  </PopularUsers>

  <Categories>
    <SectionTitle>Explore Categories</SectionTitle>
    <CategoryGrid>
      {categories.map(cat => (
        <CategoryCard>
          <Icon />
          <Name />
          <Count />
          <TrendingTag />
        </CategoryCard>
      ))}
    </CategoryGrid>
  </Categories>

  <RecommendedForYou>
    <SectionTitle>Recommended For You</SectionTitle>
    <Recommendations>
      - Based on your votes
      - Similar to followers
      - In your interests
      - ML-powered suggestions
    </Recommendations>
  </RecommendedForYou>
</DiscoverLayout>
```

#### Day 68-70: Content Creation
**Route: /post/create**
**Component: CreatePost.tsx**

```tsx
interface Post {
  id: string;
  authorId: string;
  identityMode: 'true_self' | 'shadow';
  title?: string;
  content: string;
  media?: Media[];
  tags: string[];
  pollId?: string; // Link to poll
  visibility: 'public' | 'followers' | 'private';
}
```

**Post Editor:**
```tsx
<PostEditor>
  <IdentitySelector>
    Post as: [True Self] [Shadow]
  </IdentitySelector>

  <TitleInput
    placeholder="Optional title..."
    maxLength={100}
  />

  <RichTextEditor>
    - Bold, italic, underline
    - Headers (H1-H3)
    - Lists (ordered/unordered)
    - Links
    - Code blocks
    - Quotes
    - @mentions
    - #hashtags
    - Poll embeds
  </RichTextEditor>

  <MediaUpload>
    - Images (up to 4)
    - GIFs
    - Videos (up to 1 min)
    - Drag & drop
    - Paste from clipboard
  </MediaUpload>

  <PostOptions>
    <TagInput>
      - Add tags
      - Suggestions
      - Max 5 tags
    </TagInput>

    <PollLink>
      - Link to existing poll
      - Search polls
      - Preview linked poll
    </PollLink>

    <VisibilitySelector>
      - Public
      - Followers only
      - Private (draft)
    </VisibilitySelector>
  </PostOptions>

  <PostActions>
    <SaveDraftButton />
    <PreviewButton />
    <PublishButton />
  </PostActions>
</PostEditor>
```

---

### **Week 11: Following & Social Interactions**

#### Day 71-72: Following System
**Component: FollowButton.tsx**
```tsx
interface FollowState {
  isFollowing: boolean;
  isPending: boolean;
  isBlocked: boolean;
}

<FollowButton userId={userId}>
  States:
  - Follow (not following)
  - Following (hover → Unfollow)
  - Pending (private profiles)
  - Blocked (can't follow)

  Animations:
  - Button color transition
  - Confirmation modal for unfollow
  - Success animation
</FollowButton>
```

**Component: FollowLists.tsx**
```tsx
<FollowersList>
  <ListHeader>
    <Title>{count} Followers</Title>
    <SearchInput />
    <SortOptions>
      - Recent
      - Light Score
      - Most active
    </SortOptions>
  </ListHeader>

  <UserList>
    {followers.map(user => (
      <UserListItem>
        <Avatar />
        <UserInfo>
          <Name />
          <Username />
          <Bio truncated />
        </UserInfo>
        <LightScore />
        <FollowButton />
        <MoreMenu>
          - View profile
          - Send message
          - Block
        </MoreMenu>
      </UserListItem>
    ))}
  </UserList>
</FollowersList>
```

**Component: FollowSuggestions.tsx**
```tsx
<WhoToFollow>
  <Title>Who to Follow</Title>

  <SuggestionCategories>
    <Tab>For You</Tab>
    <Tab>Popular</Tab>
    <Tab>Active</Tab>
    <Tab>New</Tab>
  </SuggestionCategories>

  <SuggestionList>
    Algorithm considers:
    - Mutual followers
    - Similar voting patterns
    - Shared interests
    - Activity level
    - Not following back
  </SuggestionList>

  <ShowMore />
</WhoToFollow>
```

#### Day 73-74: Reactions System
**Component: ReactionPicker.tsx**
```tsx
interface Reaction {
  type: ReactionType;
  count: number;
  hasReacted: boolean;
}

enum ReactionType {
  LIKE = '❤️',
  INSIGHTFUL = '💡',
  AGREE = '✅',
  DISAGREE = '❌',
  FUNNY = '😄',
  AMAZING = '🤩',
  THINKING = '🤔'
}

<ReactionPicker>
  <QuickReaction type="LIKE" />

  <ReactionMenu>
    <ReactionGrid>
      {Object.values(ReactionType).map(type => (
        <ReactionButton
          emoji={type}
          tooltip={getTooltip(type)}
          onClick={() => addReaction(type)}
        />
      ))}
    </ReactionGrid>
  </ReactionMenu>

  <ReactionSummary>
    <ReactionBadge>❤️ 42</ReactionBadge>
    <ReactionBadge>💡 18</ReactionBadge>
    <MoreReactions>+3</MoreReactions>
  </ReactionSummary>
</ReactionPicker>
```

**Component: CommentSection.tsx**
```tsx
<CommentSection>
  <CommentInput>
    <Avatar />
    <Input
      placeholder="Add a comment..."
      expandable
      maxLength={500}
    />
    <PostButton />
  </CommentInput>

  <CommentList>
    <CommentSort>
      - Newest
      - Oldest
      - Most reactions
      - Most replies
    </CommentSort>

    {comments.map(comment => (
      <Comment>
        <CommentHeader>
          <UserInfo />
          <Timestamp />
          <IdentityBadge />
        </CommentHeader>

        <CommentBody>
          <Text />
          {comment.edited && <EditedTag />}
        </CommentBody>

        <CommentActions>
          <ReactionPicker />
          <ReplyButton />
          <ShareButton />
          <MoreMenu>
            - Edit (if own)
            - Delete (if own)
            - Report
          </MoreMenu>
        </CommentActions>

        {comment.replies && (
          <Replies>
            <ShowReplies count={comment.replies.length} />
            <ReplyList nested />
          </Replies>
        )}
      </Comment>
    ))}
  </CommentList>

  <LoadMore />
</CommentSection>
```

#### Day 75-77: Share & Embed System
**Component: ShareModal.tsx**
```tsx
<ShareModal>
  <ShareOptions>
    <CopyLinkButton>
      - Copy to clipboard
      - Success animation
    </CopyLinkButton>

    <SocialShare>
      - Twitter/X
      - LinkedIn
      - Reddit
      - Discord
      - Telegram
    </SocialShare>

    <EmbedCode>
      <CodeBlock>
        {`<iframe src="${embedUrl}" />`}
      </CodeBlock>
      <CopyButton />
      <PreviewButton />
    </EmbedCode>

    <QRCode>
      - Generate QR
      - Download image
    </QRCode>
  </ShareOptions>
</ShareModal>
```

---

### **Week 12: Direct Messaging (New Feature!)**

#### Day 78-79: Messaging Interface
**Route: /messages**
**Component: MessagesLayout.tsx**

```tsx
<MessagesContainer>
  <ConversationList>
    <SearchConversations />

    <ConversationFilters>
      - All
      - Unread
      - True Self
      - Shadow
    </ConversationFilters>

    <Conversations>
      {conversations.map(conv => (
        <ConversationItem>
          <Avatar />
          <ConversationInfo>
            <Username />
            <LastMessage truncated />
            <Timestamp />
          </ConversationInfo>
          <UnreadBadge />
          <IdentityIndicator />
        </ConversationItem>
      ))}
    </Conversations>

    <NewMessageButton />
  </ConversationList>

  <MessageThread>
    <ThreadHeader>
      <RecipientInfo>
        <Avatar />
        <Name />
        <OnlineStatus />
        <IdentityMode />
      </RecipientInfo>
      <ThreadActions>
        <InfoButton />
        <BlockButton />
      </ThreadActions>
    </ThreadHeader>

    <MessageList>
      {messages.map(msg => (
        <Message sent={msg.isOwn}>
          <MessageBubble>
            <Text />
            <Timestamp />
            <ReadReceipt />
          </MessageBubble>
        </Message>
      ))}
      <TypingIndicator />
    </MessageList>

    <MessageInput>
      <TextArea
        placeholder="Type a message..."
        onEnter={sendMessage}
        maxLength={1000}
      />
      <AttachButton />
      <SendButton />
    </MessageInput>
  </MessageThread>

  <ConversationInfo>
    <UserProfile compact />
    <SharedHistory>
      - Shared polls
      - Mutual follows
      - Common interests
    </SharedHistory>
    <Actions>
      - View Profile
      - Block User
      - Report
      - Delete Conversation
    </Actions>
  </ConversationInfo>
</MessagesContainer>
```

#### Day 80-81: Message Features
**Component: NewMessageModal.tsx**
```tsx
<NewMessage>
  <RecipientSelector>
    <UserSearch>
      - Search by username
      - Recent conversations
      - Followers list
      - Following list
    </UserSearch>

    <SelectedRecipient>
      - Show selected user
      - Identity they accept messages in
      - Remove button
    </SelectedRecipient>
  </RecipientSelector>

  <IdentitySelector>
    Send as: [True Self] [Shadow]
    Note: Recipient will see your identity
  </IdentitySelector>

  <MessageComposer>
    <TextArea />
    <AttachmentOptions>
      - Images
      - Poll links
      - Post links
    </AttachmentOptions>
  </MessageComposer>

  <SendButton />
</NewMessage>
```

**Component: MessageNotifications.tsx**
```tsx
<MessageNotifications>
  <NotificationBadge>
    - Unread count
    - Different color for DMs
  </NotificationBadge>

  <NotificationDropdown>
    <MessagePreview>
      - Sender avatar
      - Sender name
      - Message snippet
      - Time
      - Quick reply
    </MessagePreview>
  </NotificationDropdown>

  <DesktopNotification>
    - Browser notification
    - Sound alert
    - Tab title update
  </DesktopNotification>
</MessageNotifications>
```

#### Day 82-84: Message Settings & Privacy
**Component: MessageSettings.tsx**
```tsx
<MessagePrivacySettings>
  <WhoCanMessage>
    - Everyone
    - Followers only
    - Following only
    - No one
  </WhoCanMessage>

  <MessageFiltering>
    - Filter unknown senders
    - Block keywords
    - Auto-archive old
  </MessageFiltering>

  <NotificationSettings>
    - Message sounds
    - Desktop alerts
    - Email notifications
    - Push notifications
  </NotificationSettings>

  <BlockedUsers>
    - List of blocked
    - Unblock action
    - Block reasons
  </BlockedUsers>

  <MessageRetention>
    - Auto-delete after X days
    - Export messages
    - Clear all messages
  </MessageRetention>
</MessagePrivacySettings>
```

---

## 🛠 Technical Implementation

### Database Schema for New Features
```typescript
// Direct Messages
interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderIdentityMode: 'true_self' | 'shadow';
  recipientId: string;
  content: string;
  attachments?: Attachment[];
  readAt?: Date;
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: Date;
  lastMessageId: string;
  participant1LastRead?: Date;
  participant2LastRead?: Date;
  createdAt: Date;
  archivedBy?: string[];
}

// Posts & Content
interface Post {
  id: string;
  authorId: string;
  identityMode: 'true_self' | 'shadow';
  title?: string;
  content: string;
  media?: Media[];
  tags: string[];
  linkedPollId?: string;
  visibility: 'public' | 'followers' | 'private';
  reactions: Record<ReactionType, number>;
  commentCount: number;
  shareCount: number;
  createdAt: Date;
  editedAt?: Date;
}

// Social Graph
interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  acceptedAt?: Date; // For private profiles
}

interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: Date;
}
```

### API Endpoints Needed
```typescript
// Profile APIs
POST   /api/v1/users/profile/edit
POST   /api/v1/users/profile/avatar
POST   /api/v1/users/profile/banner
GET    /api/v1/users/search
GET    /api/v1/users/{userId}/profile
GET    /api/v1/users/{userId}/activity

// Social APIs
POST   /api/v1/social/follow
DELETE /api/v1/social/follow
GET    /api/v1/social/followers
GET    /api/v1/social/following
POST   /api/v1/social/block
DELETE /api/v1/social/block
GET    /api/v1/social/suggestions

// Content APIs
POST   /api/v1/content/posts
PUT    /api/v1/content/posts/{postId}
DELETE /api/v1/content/posts/{postId}
GET    /api/v1/content/feed
POST   /api/v1/content/posts/{postId}/react
POST   /api/v1/content/posts/{postId}/comment
GET    /api/v1/content/discover

// Messaging APIs
GET    /api/v1/messages/conversations
POST   /api/v1/messages/conversations
GET    /api/v1/messages/conversations/{convId}
POST   /api/v1/messages/send
PUT    /api/v1/messages/{messageId}
DELETE /api/v1/messages/{messageId}
POST   /api/v1/messages/{messageId}/read
```

### Real-time Events
```typescript
// WebSocket events for social features
socket.on('new_follower', (data) => {
  // Show notification
  // Update follower count
});

socket.on('new_message', (data) => {
  // Show notification
  // Update conversation list
  // Show typing indicator
});

socket.on('new_reaction', (data) => {
  // Update reaction count
  // Animate reaction
});

socket.on('user_online', (userId) => {
  // Update online status
});

socket.on('user_typing', (data) => {
  // Show typing indicator
});
```

### Performance Optimizations
```typescript
// Virtual scrolling for long lists
import { VirtualList } from '@tanstack/react-virtual';

<VirtualList
  height={600}
  itemCount={items.length}
  itemSize={80}
  renderItem={({ index, style }) => (
    <div style={style}>
      <UserListItem user={items[index]} />
    </div>
  )}
/>

// Image optimization
import Image from 'next/image';

<Image
  src={avatarUrl}
  width={100}
  height={100}
  placeholder="blur"
  loading="lazy"
  alt={username}
/>

// Infinite scroll with intersection observer
const { ref, inView } = useInView();
const { fetchNextPage } = useInfiniteQuery();

useEffect(() => {
  if (inView) fetchNextPage();
}, [inView]);
```

---

## 📊 Success Metrics

### Week 9 Completion
- [ ] Profile editing works
- [ ] All profile sections display
- [ ] Privacy settings functional
- [ ] Profile search working

### Week 10 Completion
- [ ] Activity feed displays
- [ ] Discover page populated
- [ ] Post creation works
- [ ] Rich text editor functional

### Week 11 Completion
- [ ] Follow system works
- [ ] Reactions functional
- [ ] Comments working
- [ ] Share features complete

### Week 12 Completion
- [ ] Direct messaging works
- [ ] Conversations list functional
- [ ] Message notifications working
- [ ] Privacy controls implemented

---

## 🎨 Design System Extensions

### Social Colors
```scss
// Social Actions
$follow-color: #3B82F6;      // Blue
$following-color: #10B981;   // Green
$blocked-color: #EF4444;     // Red

// Message States
$unread-color: #3B82F6;      // Blue
$read-color: #6B7280;        // Gray
$typing-color: #F59E0B;      // Orange

// Content States
$draft-color: #6B7280;       // Gray
$published-color: #10B981;   // Green
$deleted-color: #EF4444;     // Red
```

### Animation Library
```typescript
// Framer Motion animations
export const animations = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },

  // Modal animations
  modalOverlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },

  modalContent: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 }
  },

  // List item animations
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 }
  },

  // Button interactions
  buttonTap: {
    scale: 0.95,
    transition: { duration: 0.1 }
  },

  // Reaction animation
  reaction: {
    initial: { scale: 0 },
    animate: {
      scale: [0, 1.2, 1],
      transition: { duration: 0.3 }
    }
  }
};
```

### Accessibility Features
```tsx
// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  switch(e.key) {
    case 'Escape':
      closeModal();
      break;
    case 'Enter':
      if (e.metaKey || e.ctrlKey) {
        submitForm();
      }
      break;
    case '/':
      if (e.metaKey || e.ctrlKey) {
        focusSearch();
      }
      break;
  }
};

// Screen reader support
<button
  aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
  aria-pressed={isFollowing}
  role="button"
>
  {buttonText}
</button>

// Focus management
const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
};
```

---

## 🚨 Phase 3 Specific Risks

**1. Message Spam**
- Risk: Users spam with DMs
- Solution: Rate limiting, spam detection, block features

**2. Content Moderation**
- Risk: Inappropriate content
- Solution: Report system, AI moderation, community moderators

**3. Performance with Social Graph**
- Risk: Slow queries with many followers
- Solution: Graph database, caching, pagination

**4. Real-time Scaling**
- Risk: WebSocket overload
- Solution: Message queuing, horizontal scaling

**5. Storage Costs**
- Risk: Media uploads expensive
- Solution: Compression, CDN, storage limits

---

## 📝 Final Testing Checklist

### Complete User Journey Testing
- [ ] New user onboarding → first vote → first follow
- [ ] Create poll → share → stake → claim rewards
- [ ] Profile setup → post creation → engagement
- [ ] Discover users → follow → message
- [ ] Identity switching throughout all features

### Cross-Feature Integration
- [ ] Notifications for all actions
- [ ] Identity mode consistency
- [ ] Real-time updates everywhere
- [ ] Search works across all content
- [ ] Mobile experience complete

### Performance Benchmarks
- [ ] Feed loads < 1 second
- [ ] Message send < 200ms
- [ ] Profile load < 500ms
- [ ] Search results < 300ms
- [ ] Image uploads < 3 seconds

---

## 🎯 Complete Platform Delivered!

### After Phase 3, Dream Protocol has:

**✅ Complete Governance System**
- Dual-identity voting
- Poll creation and management
- Staking and rewards
- Shadow Consensus visualization

**✅ Full Social Platform**
- Rich user profiles
- Activity feeds
- Following system
- Reactions and engagement
- Direct messaging

**✅ Content Creation**
- Posts and discussions
- Rich media support
- Comments and interactions

**✅ Discovery & Growth**
- Trending content
- User recommendations
- Search and explore
- Categories and tags

---

## 🚀 Future Expansions (Post-MVP)

After these 3 phases, consider:
- **Mobile Apps** (React Native)
- **Advanced Analytics** dashboards
- **AI Integration** (Pentos assistant)
- **Token Marketplace** features
- **NFT Integration** (achievements, badges)
- **Governance Treasury** management
- **Advanced Moderation** tools
- **API for Developers**
- **Webhooks & Integrations**
- **Multi-language Support**

---

## 📈 Success Metrics Summary

### Platform KPIs After Phase 3:
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Average session duration
- Polls created per day
- Votes cast per day
- Messages sent per day
- User retention (D1, D7, D30)
- Shadow Consensus participation
- Staking volume
- Social graph density

### Technical Metrics:
- Page load times < 1s
- API response times < 200ms
- WebSocket stability > 99%
- Error rate < 0.1%
- Mobile responsiveness 100%

---

## 🎉 Congratulations!

**You now have a complete 12-week roadmap to build the Dream Protocol frontend!**

Each phase builds on the previous:
1. **Phase 1**: Foundation (Auth, Polls, Profiles)
2. **Phase 2**: Core Features (Creation, Dual-voting, Staking)
3. **Phase 3**: Social Layer (Complete profiles, Feeds, Messaging)

**Total Implementation Time**: 12 weeks (3 months)
**Total Components**: ~150-200
**Total Pages**: ~30-40
**Lines of Code**: ~40,000-50,000

**The platform is ready for thousands of users to experience true dual-identity governance!**