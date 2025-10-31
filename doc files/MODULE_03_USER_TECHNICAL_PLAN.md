# 👤 Module 03: User - Technical Specification
## User Profiles, Settings & Account Management for Dream Protocol

**Module Number**: 03 of 22  
**Build Priority**: PRIORITY 1 - Foundation (After Module 02: Bridge Legacy)  
**Dependencies**: Module 01 (Identity), Module 02 (Bridge Legacy)  
**Dependents**: ALL feature modules  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 03 implements comprehensive user profile management, account settings, and preferences system. This is the foundation for personalization and user experience across the platform.

### **Core Responsibility**
Manage everything about a user's account EXCEPT their dual identity wallets (that's Module 01). This includes:
- Profile information (bio, avatar, display name)
- Account settings (email, password, notifications)
- Privacy preferences
- Platform customization
- Account status and metadata

### **Key Distinction**
- **Module 01 (Identity)**: Handles dual wallets and identity switching
- **Module 03 (User)**: Handles profile data and account settings

---

## 🏗️ What This Module Does

### **Primary Functions**
1. **Profile Management** - Bio, avatar, display name, social links
2. **Account Settings** - Email, password, 2FA, security settings
3. **Preferences** - Notifications, theme, language, display options
4. **Privacy Controls** - Who can see what, content filters
5. **Account Status** - Active, suspended, banned, deleted
6. **Profile Customization** - Banners, badges, profile themes

### **Key Features**
- ✅ Separate profiles for True Self and Shadow identities
- ✅ Privacy-first design (Shadow profiles are minimal by default)
- ✅ Rich profile customization for True Self
- ✅ Account security settings (2FA, session management)
- ✅ Notification preferences (email, in-app, push)
- ✅ Content filters and safety settings

---

## 📊 Database Schema

### **Table 1: `user_profiles`**
Stores profile information for BOTH identities:

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Basic Info
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    
    -- Social Links (True Self only, nullable for Shadow)
    website_url TEXT,
    twitter_handle VARCHAR(50),
    github_handle VARCHAR(50),
    linkedin_url TEXT,
    
    -- Profile Customization
    theme VARCHAR(20) DEFAULT 'default', -- 'default', 'dark', 'light', 'ocean', etc.
    accent_color VARCHAR(7), -- Hex color like #3B82F6
    profile_visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'followers_only', 'private'
    
    -- Badges & Achievements (JSON array)
    badges JSONB DEFAULT '[]', -- [{badge_id: 'founding_member', earned_at: '...'}]
    
    -- Stats (cached for performance)
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    poll_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_profile_update TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, identity_mode)
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_mode ON user_profiles(identity_mode);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX idx_user_profiles_visibility ON user_profiles(profile_visibility);
```

### **Table 2: `user_settings`**
Account-wide settings (applies to both identities):

```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Account Security
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMPTZ,
    
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT, -- Encrypted TOTP secret
    backup_codes TEXT[], -- Array of encrypted backup codes
    
    -- Password Management
    password_hash TEXT NOT NULL,
    password_last_changed TIMESTAMPTZ DEFAULT NOW(),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    
    -- Session Management
    max_concurrent_sessions INTEGER DEFAULT 3,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    
    -- Notification Preferences
    email_notifications JSONB DEFAULT '{
        "poll_results": true,
        "new_followers": true,
        "mentions": true,
        "replies": true,
        "governance_updates": true,
        "weekly_digest": true
    }',
    
    in_app_notifications JSONB DEFAULT '{
        "poll_results": true,
        "new_followers": true,
        "mentions": true,
        "replies": true,
        "reactions": true
    }',
    
    push_notifications JSONB DEFAULT '{
        "mentions": true,
        "replies": true,
        "governance_urgent": true
    }',
    
    -- Privacy Settings
    show_online_status BOOLEAN DEFAULT TRUE,
    allow_direct_messages VARCHAR(20) DEFAULT 'everyone', -- 'everyone', 'followers', 'none'
    allow_tagging VARCHAR(20) DEFAULT 'everyone',
    
    -- Content Preferences
    default_identity_mode VARCHAR(10) DEFAULT 'true_self', -- Which mode to start in
    content_filter_level VARCHAR(20) DEFAULT 'moderate', -- 'off', 'low', 'moderate', 'strict'
    show_nsfw_content BOOLEAN DEFAULT FALSE,
    
    -- Platform Preferences
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_email ON user_settings(email);
CREATE INDEX idx_user_settings_user ON user_settings(user_id);
```

### **Table 3: `user_preferences`**
Fine-grained display and behavior preferences:

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Display Preferences
    posts_per_page INTEGER DEFAULT 20,
    auto_play_videos BOOLEAN DEFAULT FALSE,
    show_preview_cards BOOLEAN DEFAULT TRUE,
    compact_view BOOLEAN DEFAULT FALSE,
    
    -- Feed Preferences
    feed_algorithm VARCHAR(20) DEFAULT 'chronological', -- 'chronological', 'relevance', 'mixed'
    show_replies_in_feed BOOLEAN DEFAULT TRUE,
    show_reposts BOOLEAN DEFAULT TRUE,
    
    -- Interaction Preferences
    auto_expand_threads BOOLEAN DEFAULT FALSE,
    show_vote_counts BOOLEAN DEFAULT TRUE,
    show_reaction_counts BOOLEAN DEFAULT TRUE,
    
    -- Accessibility
    reduce_motion BOOLEAN DEFAULT FALSE,
    high_contrast BOOLEAN DEFAULT FALSE,
    font_size VARCHAR(10) DEFAULT 'medium', -- 'small', 'medium', 'large', 'x-large'
    
    -- Chamber Preferences (which chambers user is interested in)
    favorite_chambers TEXT[] DEFAULT '{}', -- Array of chamber slugs
    hidden_chambers TEXT[] DEFAULT '{}',
    
    -- Advanced
    show_experimental_features BOOLEAN DEFAULT FALSE,
    developer_mode BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
```

### **Table 4: `user_account_status`**
Track account state and moderation:

```sql
CREATE TABLE user_account_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Account Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'banned', 'deleted', 'locked'
    status_reason TEXT,
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    status_changed_by UUID REFERENCES users(id), -- Admin who changed status
    status_expires_at TIMESTAMPTZ, -- For temporary suspensions
    
    -- Verification
    verified_account BOOLEAN DEFAULT FALSE, -- Blue check mark equivalent
    verification_type VARCHAR(50), -- 'manual', 'identity_verified', 'founding_member'
    verified_at TIMESTAMPTZ,
    
    -- Trust Metrics
    trust_score DECIMAL(5,2) DEFAULT 50.00, -- 0-100 scale
    spam_score DECIMAL(5,2) DEFAULT 0.00,
    bot_probability DECIMAL(5,2) DEFAULT 0.00,
    
    -- Account Age & Activity
    account_age_days INTEGER GENERATED ALWAYS AS 
        (EXTRACT(DAY FROM (NOW() - created_at))) STORED,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    total_sessions INTEGER DEFAULT 0,
    
    -- Warnings & Strikes
    warning_count INTEGER DEFAULT 0,
    strike_count INTEGER DEFAULT 0,
    last_warning_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_account_status_user ON user_account_status(user_id);
CREATE INDEX idx_user_account_status_status ON user_account_status(status);
CREATE INDEX idx_user_account_status_verified ON user_account_status(verified_account);
```

### **Table 5: `profile_avatars`**
Store avatar images (separate from profiles for optimization):

```sql
CREATE TABLE profile_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Image Data
    original_url TEXT NOT NULL,
    thumbnail_url TEXT, -- 150x150
    medium_url TEXT, -- 400x400
    large_url TEXT, -- 1000x1000
    
    -- Metadata
    file_size_bytes INTEGER,
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, identity_mode, is_current)
);

CREATE INDEX idx_profile_avatars_user ON profile_avatars(user_id);
CREATE INDEX idx_profile_avatars_current ON profile_avatars(user_id, identity_mode, is_current);
```

---

## 🔧 Core Functions

### **Function 1: Create User Profile**

```typescript
// packages/03-user/src/services/profile.service.ts

interface CreateProfileDTO {
  userId: string;
  identityMode: 'true_self' | 'shadow';
  displayName?: string;
  bio?: string;
  avatarFile?: File;
}

export async function createUserProfile(data: CreateProfileDTO) {
  const { userId, identityMode, displayName, bio, avatarFile } = data;
  
  // Default display name based on mode
  const defaultDisplayName = identityMode === 'shadow' 
    ? `Shadow${Math.random().toString(36).substring(7)}` // Random shadow name
    : null;
  
  // Create profile
  const profile = await db.user_profiles.create({
    user_id: userId,
    identity_mode: identityMode,
    display_name: displayName || defaultDisplayName,
    bio: bio || null,
    theme: 'default',
    profile_visibility: identityMode === 'shadow' ? 'private' : 'public'
  });
  
  // Upload avatar if provided
  if (avatarFile) {
    const avatarUrls = await uploadAndProcessAvatar(avatarFile);
    
    await db.profile_avatars.create({
      user_id: userId,
      identity_mode: identityMode,
      original_url: avatarUrls.original,
      thumbnail_url: avatarUrls.thumbnail,
      medium_url: avatarUrls.medium,
      large_url: avatarUrls.large,
      is_current: true
    });
    
    // Update profile with avatar URL
    await db.user_profiles.update(
      { id: profile.id },
      { avatar_url: avatarUrls.medium }
    );
  }
  
  return profile;
}

async function uploadAndProcessAvatar(file: File): Promise<{
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}> {
  // Upload to S3/Cloudflare/etc.
  // Process into multiple sizes
  // Return URLs
  // Implementation depends on your storage provider
  
  // Placeholder implementation
  const baseUrl = await uploadToStorage(file);
  
  return {
    original: baseUrl,
    thumbnail: `${baseUrl}?size=150`,
    medium: `${baseUrl}?size=400`,
    large: `${baseUrl}?size=1000`
  };
}
```

### **Function 2: Update User Settings**

```typescript
// packages/03-user/src/services/settings.service.ts

interface UpdateSettingsDTO {
  userId: string;
  emailNotifications?: Record<string, boolean>;
  inAppNotifications?: Record<string, boolean>;
  privacySettings?: {
    showOnlineStatus?: boolean;
    allowDirectMessages?: 'everyone' | 'followers' | 'none';
    allowTagging?: 'everyone' | 'followers' | 'none';
  };
  contentPreferences?: {
    defaultIdentityMode?: 'true_self' | 'shadow';
    contentFilterLevel?: 'off' | 'low' | 'moderate' | 'strict';
    showNsfwContent?: boolean;
  };
}

export async function updateUserSettings(data: UpdateSettingsDTO) {
  const { userId, ...updates } = data;
  
  // Get current settings
  const currentSettings = await db.user_settings.findOne({ user_id: userId });
  
  if (!currentSettings) {
    throw new Error('User settings not found');
  }
  
  // Merge updates
  const updatedSettings: any = { updated_at: new Date() };
  
  if (updates.emailNotifications) {
    updatedSettings.email_notifications = {
      ...currentSettings.email_notifications,
      ...updates.emailNotifications
    };
  }
  
  if (updates.inAppNotifications) {
    updatedSettings.in_app_notifications = {
      ...currentSettings.in_app_notifications,
      ...updates.inAppNotifications
    };
  }
  
  if (updates.privacySettings) {
    Object.assign(updatedSettings, {
      show_online_status: updates.privacySettings.showOnlineStatus ?? currentSettings.show_online_status,
      allow_direct_messages: updates.privacySettings.allowDirectMessages ?? currentSettings.allow_direct_messages,
      allow_tagging: updates.privacySettings.allowTagging ?? currentSettings.allow_tagging
    });
  }
  
  if (updates.contentPreferences) {
    Object.assign(updatedSettings, {
      default_identity_mode: updates.contentPreferences.defaultIdentityMode ?? currentSettings.default_identity_mode,
      content_filter_level: updates.contentPreferences.contentFilterLevel ?? currentSettings.content_filter_level,
      show_nsfw_content: updates.contentPreferences.showNsfwContent ?? currentSettings.show_nsfw_content
    });
  }
  
  // Save to database
  const result = await db.user_settings.update(
    { user_id: userId },
    updatedSettings
  );
  
  return result;
}
```

### **Function 3: Get User Profile**

```typescript
// packages/03-user/src/services/profile.service.ts

interface GetProfileOptions {
  userId: string;
  identityMode?: 'true_self' | 'shadow';
  viewerUserId?: string; // Who is viewing (for privacy checks)
}

export async function getUserProfile(options: GetProfileOptions) {
  const { userId, identityMode, viewerUserId } = options;
  
  // If no identity mode specified, get both
  const profiles = identityMode
    ? await db.user_profiles.findOne({ user_id: userId, identity_mode: identityMode })
    : await db.user_profiles.find({ user_id: userId });
  
  // Check privacy settings
  const settings = await db.user_settings.findOne({ user_id: userId });
  const accountStatus = await db.user_account_status.findOne({ user_id: userId });
  
  // Apply privacy filters
  const canViewFull = viewerUserId === userId || accountStatus.verified_account;
  
  if (!canViewFull && profiles.profile_visibility === 'private') {
    return null; // Profile is private
  }
  
  // Get avatar
  const avatar = await db.profile_avatars.findOne({
    user_id: userId,
    identity_mode: identityMode || 'true_self',
    is_current: true
  });
  
  // Return sanitized profile
  return {
    ...profiles,
    avatar: avatar ? {
      thumbnail: avatar.thumbnail_url,
      medium: avatar.medium_url,
      large: avatar.large_url
    } : null,
    isVerified: accountStatus.verified_account,
    accountStatus: accountStatus.status
  };
}
```

### **Function 4: Update Account Status**

```typescript
// packages/03-user/src/services/account.service.ts

interface UpdateAccountStatusDTO {
  userId: string;
  status: 'active' | 'suspended' | 'banned' | 'deleted' | 'locked';
  reason?: string;
  adminUserId: string;
  expiresAt?: Date; // For temporary suspensions
}

export async function updateAccountStatus(data: UpdateAccountStatusDTO) {
  const { userId, status, reason, adminUserId, expiresAt } = data;
  
  // Get current status
  const current = await db.user_account_status.findOne({ user_id: userId });
  
  // Update status
  const result = await db.user_account_status.update(
    { user_id: userId },
    {
      status,
      status_reason: reason,
      status_changed_at: new Date(),
      status_changed_by: adminUserId,
      status_expires_at: expiresAt,
      updated_at: new Date()
    }
  );
  
  // Log the change
  await db.admin_logs.create({
    admin_user_id: adminUserId,
    action: 'update_account_status',
    target_user_id: userId,
    details: {
      old_status: current.status,
      new_status: status,
      reason
    }
  });
  
  // Send notification to user
  await sendAccountStatusNotification(userId, status, reason);
  
  return result;
}
```

---

## 🎨 Frontend Integration

### **Profile Display Component**

```typescript
// Example React component
import { useProfile } from '@dream-protocol/user';

function UserProfile({ userId, mode }: { userId: string; mode: 'true_self' | 'shadow' }) {
  const { profile, loading, error } = useProfile(userId, mode);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading profile</div>;
  
  return (
    <div className="user-profile">
      <div className="profile-header">
        {profile.bannerUrl && (
          <img src={profile.bannerUrl} alt="Banner" className="banner" />
        )}
      </div>
      
      <div className="profile-content">
        <img 
          src={profile.avatar?.medium || '/default-avatar.png'} 
          alt={profile.displayName}
          className="avatar"
        />
        
        <h1>{profile.displayName}</h1>
        {profile.isVerified && <span className="verified-badge">✓</span>}
        
        <p className="bio">{profile.bio}</p>
        
        <div className="profile-stats">
          <span>{profile.followerCount} Followers</span>
          <span>{profile.followingCount} Following</span>
          <span>{profile.postCount} Posts</span>
        </div>
        
        {profile.websiteUrl && (
          <a href={profile.websiteUrl} target="_blank" rel="noopener">
            {profile.websiteUrl}
          </a>
        )}
      </div>
    </div>
  );
}
```

### **Settings Form Component**

```typescript
function SettingsForm() {
  const { settings, updateSettings, saving } = useSettings();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      emailNotifications: {
        poll_results: true,
        governance_updates: true
      },
      privacySettings: {
        showOnlineStatus: false,
        allowDirectMessages: 'followers'
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Notification Settings</h2>
      <label>
        <input 
          type="checkbox" 
          checked={settings.emailNotifications.poll_results}
          onChange={(e) => /* handle change */}
        />
        Email me when polls close
      </label>
      
      <h2>Privacy Settings</h2>
      <label>
        <input 
          type="checkbox"
          checked={settings.showOnlineStatus}
          onChange={(e) => /* handle change */}
        />
        Show my online status
      </label>
      
      <select value={settings.allowDirectMessages}>
        <option value="everyone">Everyone</option>
        <option value="followers">Followers only</option>
        <option value="none">No one</option>
      </select>
      
      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
```

---

## 📋 API Endpoints

### **POST `/api/v1/users/profile/create`**
Create a user profile

**Request**:
```json
{
  "identity_mode": "true_self",
  "display_name": "John Doe",
  "bio": "Builder of things",
  "avatar": "base64_image_data"
}
```

**Response**:
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "display_name": "John Doe",
    "bio": "Builder of things",
    "avatar_url": "https://...",
    "created_at": "2025-01-30T..."
  }
}
```

### **PATCH `/api/v1/users/profile/:id`**
Update user profile

**Request**:
```json
{
  "display_name": "Jane Doe",
  "bio": "Updated bio",
  "website_url": "https://example.com"
}
```

**Response**:
```json
{
  "success": true,
  "profile": { /* updated profile */ }
}
```

### **GET `/api/v1/users/profile/:userId`**
Get user profile

**Query Params**:
- `mode`: `true_self` or `shadow`

**Response**:
```json
{
  "profile": {
    "id": "uuid",
    "display_name": "John Doe",
    "bio": "Builder of things",
    "avatar": {
      "thumbnail": "https://...",
      "medium": "https://...",
      "large": "https://..."
    },
    "follower_count": 150,
    "following_count": 75,
    "post_count": 42,
    "is_verified": true
  }
}
```

### **PATCH `/api/v1/users/settings`**
Update user settings

**Request**:
```json
{
  "email_notifications": {
    "poll_results": true,
    "mentions": false
  },
  "privacy_settings": {
    "show_online_status": false,
    "allow_direct_messages": "followers"
  }
}
```

**Response**:
```json
{
  "success": true,
  "settings": { /* updated settings */ }
}
```

### **GET `/api/v1/users/settings`**
Get current user settings

**Response**:
```json
{
  "settings": {
    "email": "user@example.com",
    "email_verified": true,
    "two_factor_enabled": false,
    "email_notifications": { /*...*/ },
    "privacy_settings": { /*...*/ },
    "content_preferences": { /*...*/ }
  }
}
```

### **POST `/api/v1/users/avatar/upload`**
Upload profile avatar

**Request**: Multipart form data with image file

**Response**:
```json
{
  "success": true,
  "avatar": {
    "thumbnail": "https://...",
    "medium": "https://...",
    "large": "https://..."
  }
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- Profile creation works for both identity modes
- Settings updates merge correctly with existing settings
- Privacy checks enforce visibility rules
- Avatar upload and processing works

### **Integration Tests**
- User can create profile after registration
- Profile updates reflect immediately
- Settings changes persist across sessions
- Account status changes trigger proper notifications

### **Edge Cases**
- Shadow profile has minimal default data
- True Self profile allows rich customization
- Privacy settings respected when viewing profiles
- Suspended accounts can't update settings

---

## 📊 Success Metrics

### **Functionality**
- ✅ 100% of users can create profiles
- ✅ Profile updates take <500ms
- ✅ Settings changes persist correctly
- ✅ Avatar uploads complete in <3 seconds

### **User Experience**
- ✅ Profile pages load in <200ms
- ✅ Settings UI is intuitive (90%+ task completion)
- ✅ Privacy controls work as expected
- ✅ Zero data leaks between identities

### **Performance**
- ✅ Profile lookups: <50ms
- ✅ Settings updates: <100ms
- ✅ Avatar processing: <3 seconds
- ✅ Database queries optimized (all indexed)

---

## 🚀 Build Timeline

**Week 4** (after Module 02: Bridge Legacy is complete)

### **Day 1: Database Setup**
- Create 5 tables (profiles, settings, preferences, account_status, avatars)
- Add indexes
- Write migration scripts

### **Day 2-3: Core Services**
- Profile creation/update service
- Settings management service
- Avatar upload and processing

### **Day 4: API Layer**
- Build 6 REST endpoints
- Add authentication middleware
- Add privacy checks

### **Day 5: Testing & Integration**
- Unit tests for all services
- Integration tests
- Connect with Module 01 (Identity)

**Deliverable**: Users can manage profiles and settings for both identities!

---

## 🔗 Integration with Other Modules

### **Module 01 (Identity)** - Integrates With
- Each identity mode gets its own profile
- Settings apply across both identities
- DID used as profile identifier

### **Module 02 (Bridge Legacy)** - Uses
- Migrates existing user data from MVP
- Preserves user settings during migration

### **Module 04 (Economy)** - Provides To
- Light Score displayed on profiles
- Token balances shown (if user chooses)

### **Module 06 (Governance)** - Provides To
- Verified status affects voting weight
- Profile displayed on polls/proposals

### **Module 07 (Content)** - Provides To
- Avatar and display name shown on posts
- Bio shown on content pages

### **Module 08 (Social)** - Provides To
- Follower/following counts
- Profile discovery

---

## ⚠️ Critical Reminders

1. **Separate profiles for each identity** - True Self can be rich, Shadow should be minimal
2. **Privacy by default** - Shadow profiles default to private
3. **Settings apply globally** - Don't duplicate settings per identity
4. **Cache profile data** - Profiles are read-heavy, write-light
5. **Optimize avatar storage** - Use CDN for images
6. **Respect account status** - Suspended users can't update profiles

---

## 📚 Additional Documentation

- **Profile Customization Guide**: `docs/PROFILE_CUSTOMIZATION.md`
- **Privacy Settings**: `docs/PRIVACY_CONTROLS.md`
- **Avatar Guidelines**: `docs/AVATAR_SPECS.md`
- **Account Status Flow**: `docs/ACCOUNT_STATUS.md`

---

**Module 03 Status**: ✅ Design Complete - Ready for Week 4 Implementation

**Previous Module**: Module 02 (Bridge Legacy) - ✅ Complete  
**Next Module**: Module 04 (Economy) - 4-Token System
