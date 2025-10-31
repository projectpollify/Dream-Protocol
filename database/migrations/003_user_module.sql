-- ============================================================================
-- MODULE 03: USER - DATABASE MIGRATION
-- ============================================================================
-- Description: User profiles, settings, preferences, account status, and avatars
-- Author: Dream Protocol Team
-- Created: 2025-01-30
-- Dependencies: Module 01 (Identity), Module 02 (Bridge Legacy)
-- ============================================================================

-- ============================================================================
-- TABLE 1: user_profiles
-- Purpose: Store profile information for BOTH identities (True Self + Shadow)
-- ============================================================================

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
    badges JSONB DEFAULT '[]', -- [{"badge_id": "founding_member", "earned_at": "..."}]

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

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_mode ON user_profiles(identity_mode);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX idx_user_profiles_visibility ON user_profiles(profile_visibility);

COMMENT ON TABLE user_profiles IS 'User profile information for both True Self and Shadow identities';
COMMENT ON COLUMN user_profiles.identity_mode IS 'Which identity this profile belongs to: true_self or shadow';
COMMENT ON COLUMN user_profiles.badges IS 'JSON array of earned badges and achievements';
COMMENT ON COLUMN user_profiles.profile_visibility IS 'Who can view this profile: public, followers_only, or private';

-- ============================================================================
-- TABLE 2: user_settings
-- Purpose: Account-wide settings (applies to both identities)
-- ============================================================================

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

-- Indexes for user_settings
CREATE INDEX idx_user_settings_email ON user_settings(email);
CREATE INDEX idx_user_settings_user ON user_settings(user_id);
CREATE INDEX idx_user_settings_email_verified ON user_settings(email_verified);

COMMENT ON TABLE user_settings IS 'Account-wide settings that apply to both identities';
COMMENT ON COLUMN user_settings.email_notifications IS 'JSON object of email notification preferences';
COMMENT ON COLUMN user_settings.default_identity_mode IS 'Which identity mode user starts in: true_self or shadow';

-- ============================================================================
-- TABLE 3: user_preferences
-- Purpose: Fine-grained display and behavior preferences
-- ============================================================================

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

-- Indexes for user_preferences
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

COMMENT ON TABLE user_preferences IS 'Fine-grained display and behavior preferences';
COMMENT ON COLUMN user_preferences.feed_algorithm IS 'How to sort feed: chronological, relevance, or mixed';
COMMENT ON COLUMN user_preferences.favorite_chambers IS 'Array of chamber slugs user wants prioritized';

-- ============================================================================
-- TABLE 4: user_account_status
-- Purpose: Track account state and moderation
-- ============================================================================

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

    -- Account Age & Activity (computed dynamically, not stored)
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

-- Indexes for user_account_status
CREATE INDEX idx_user_account_status_user ON user_account_status(user_id);
CREATE INDEX idx_user_account_status_status ON user_account_status(status);
CREATE INDEX idx_user_account_status_verified ON user_account_status(verified_account);
CREATE INDEX idx_user_account_status_trust_score ON user_account_status(trust_score);

COMMENT ON TABLE user_account_status IS 'Account state tracking and moderation metadata';
COMMENT ON COLUMN user_account_status.status IS 'Current account status: active, suspended, banned, deleted, locked';
COMMENT ON COLUMN user_account_status.trust_score IS 'Platform trust score from 0-100';

-- ============================================================================
-- TABLE 5: profile_avatars
-- Purpose: Store avatar images (separate from profiles for optimization)
-- ============================================================================

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

-- Indexes for profile_avatars
CREATE INDEX idx_profile_avatars_user ON profile_avatars(user_id);
CREATE INDEX idx_profile_avatars_current ON profile_avatars(user_id, identity_mode, is_current);

COMMENT ON TABLE profile_avatars IS 'Profile avatar images with multiple sizes for performance';
COMMENT ON COLUMN profile_avatars.is_current IS 'Whether this is the active avatar (only one can be current per identity)';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_account_status_updated_at BEFORE UPDATE ON user_account_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Get account age in days
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_age_days(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
BEGIN
    SELECT created_at INTO v_created_at
    FROM user_account_status
    WHERE user_id = p_user_id;

    RETURN EXTRACT(DAY FROM (NOW() - v_created_at))::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_account_age_days IS 'Calculate account age in days for a given user';

-- ============================================================================
-- SAMPLE DATA (for development/testing only)
-- ============================================================================

-- Note: This would be populated by the application during user registration
-- Uncomment for testing purposes:

/*
-- Sample user profile (True Self)
INSERT INTO user_profiles (user_id, identity_mode, display_name, bio, theme, profile_visibility)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'true_self',
    'John Doe',
    'Builder of decentralized systems',
    'default',
    'public'
);

-- Sample user profile (Shadow)
INSERT INTO user_profiles (user_id, identity_mode, display_name, theme, profile_visibility)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'shadow',
    'Shadow_7x3k',
    'default',
    'private'
);

-- Sample user settings
INSERT INTO user_settings (user_id, email, password_hash, email_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'john@example.com',
    '$2b$10$dummyhash', -- Use proper bcrypt hash in production
    true
);

-- Sample user preferences
INSERT INTO user_preferences (user_id)
VALUES ('00000000-0000-0000-0000-000000000001');

-- Sample account status
INSERT INTO user_account_status (user_id, status, verified_account)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'active',
    false
);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE 'Module 03: User - Migration Complete';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  1. user_profiles';
    RAISE NOTICE '  2. user_settings';
    RAISE NOTICE '  3. user_preferences';
    RAISE NOTICE '  4. user_account_status';
    RAISE NOTICE '  5. profile_avatars';
    RAISE NOTICE 'Created indexes: 14 indexes';
    RAISE NOTICE 'Created triggers: 4 update triggers';
    RAISE NOTICE 'Created functions: 1 helper function';
END $$;
