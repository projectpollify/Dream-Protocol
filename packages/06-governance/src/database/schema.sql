-- ============================================================================
-- Module 06: Governance - Database Schema
-- Dream Protocol - Dual-Mode Democratic Decision-Making Engine
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table 1: governance_polls
-- Master table for all governance proposals
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Poll Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    proposal_url TEXT,

    -- Poll Type
    poll_type VARCHAR(50) NOT NULL CHECK (poll_type IN (
        'parameter_vote',
        'constitutional',
        'emergency_rollback',
        'governance_feature',
        'general_community'
    )),

    -- Parameter Voting (if applicable)
    parameter_name VARCHAR(100),
    parameter_current_value VARCHAR(255),
    parameter_proposed_value VARCHAR(255),
    parameter_min_value VARCHAR(255),
    parameter_max_value VARCHAR(255),
    parameter_in_whitelist BOOLEAN DEFAULT FALSE,

    -- Voting Details
    poll_start_at TIMESTAMPTZ NOT NULL,
    poll_end_at TIMESTAMPTZ NOT NULL,
    poll_duration_minutes INT NOT NULL,

    total_yes_votes BIGINT DEFAULT 0,
    total_no_votes BIGINT DEFAULT 0,
    total_abstain_votes BIGINT DEFAULT 0,

    -- Weighted Voting (with 7-section multipliers)
    total_yes_weighted BIGINT DEFAULT 0,
    total_no_weighted BIGINT DEFAULT 0,

    -- Section Multipliers (generated at poll creation)
    section_multipliers JSONB DEFAULT '{"1":1.0,"2":1.0,"3":1.0,"4":1.0,"5":1.0,"6":1.0,"7":1.0}'::jsonb,

    -- Shadow Consensus
    shadow_consensus_percentage DECIMAL(5,2),
    consensus_confidence_interval DECIMAL(5,2),
    public_vs_private_gap DECIMAL(5,2),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'active',
        'closed',
        'approved',
        'rejected',
        'executed',
        'rolled_back',
        'disputed'
    )),

    -- Results
    final_yes_percentage DECIMAL(5,2),
    final_no_percentage DECIMAL(5,2),
    approval_required_percentage INT DEFAULT 50,

    -- Quorum Requirements
    minimum_vote_quorum INT DEFAULT 1000,
    quorum_as_percentage_of_verified DECIMAL(5,2) DEFAULT 5.0,
    quorum_met BOOLEAN DEFAULT FALSE,
    total_unique_voters INT DEFAULT 0,

    -- Governance Action (if applicable)
    governance_action_id UUID,
    execute_immediately BOOLEAN DEFAULT FALSE,
    execute_at TIMESTAMPTZ,

    -- Metadata
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Blockchain Integration
    arweave_tx_id VARCHAR(100),
    cardano_tx_hash VARCHAR(100),

    CONSTRAINT valid_duration CHECK (poll_end_at > poll_start_at)
);

CREATE INDEX idx_governance_polls_status ON governance_polls(status);
CREATE INDEX idx_governance_polls_end_at ON governance_polls(poll_end_at DESC);
CREATE INDEX idx_governance_polls_type ON governance_polls(poll_type);
CREATE INDEX idx_governance_polls_parameter ON governance_polls(parameter_name);
CREATE INDEX idx_governance_polls_creator ON governance_polls(created_by_user_id);

-- ============================================================================
-- Table 2: governance_votes
-- Individual votes cast by users
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    identity_mode VARCHAR(10) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),

    -- Vote Details
    vote_option VARCHAR(20) NOT NULL CHECK (vote_option IN ('yes', 'no', 'abstain')),

    -- DID Information (pseudonymous)
    voter_did VARCHAR(100) NOT NULL,

    -- 7-Section Multiplier
    assigned_section INT CHECK (assigned_section BETWEEN 1 AND 7),
    section_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,

    -- Weighted Voting (base is 1000 to preserve decimal multipliers)
    base_vote_weight BIGINT DEFAULT 1000,
    final_vote_weight BIGINT GENERATED ALWAYS AS (
        CAST(base_vote_weight * section_multiplier AS BIGINT)
    ) STORED,

    -- Reasoning (optional)
    reasoning_text TEXT,

    -- Voting Power Delegation
    voting_power_delegated_from_user_id UUID,
    is_delegated_vote BOOLEAN DEFAULT FALSE,

    -- Metadata
    light_score_at_vote_time DECIMAL(5,2),
    is_verified_human BOOLEAN,
    ip_address INET,

    -- Vote Privacy Protection (timing jitter)
    actual_vote_time TIMESTAMPTZ DEFAULT NOW(),
    displayed_vote_time TIMESTAMPTZ,
    timing_jitter_seconds INT,

    -- Vote Changes
    vote_change_count INT DEFAULT 0,
    max_vote_changes INT DEFAULT 5,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Privacy: Can't see which True Self and Shadow belong together
    UNIQUE(poll_id, user_id, identity_mode)
);

CREATE INDEX idx_governance_votes_poll ON governance_votes(poll_id);
CREATE INDEX idx_governance_votes_user ON governance_votes(user_id);
CREATE INDEX idx_governance_votes_did ON governance_votes(voter_did);
CREATE INDEX idx_governance_votes_section ON governance_votes(assigned_section);
CREATE INDEX idx_governance_votes_created ON governance_votes(created_at DESC);

-- ============================================================================
-- Table 3: governance_delegations
-- Vote delegation system
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Delegation Setup
    delegating_user_id UUID NOT NULL,
    delegating_identity_mode VARCHAR(10) NOT NULL CHECK (delegating_identity_mode IN ('true_self', 'shadow')),

    delegated_to_user_id UUID NOT NULL,
    delegated_to_identity_mode VARCHAR(10) NOT NULL CHECK (delegated_to_identity_mode IN ('true_self', 'shadow')),

    -- Delegation Type
    delegation_type VARCHAR(30) NOT NULL CHECK (delegation_type IN (
        'all_governance',
        'parameter_votes_only',
        'specific_poll'
    )),

    target_poll_id UUID,

    -- Duration
    active_from TIMESTAMPTZ DEFAULT NOW(),
    active_until TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'revoked', 'expired', 'paused'
    )),

    -- Metadata
    reason_text TEXT,
    is_revocable BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT self_delegation_not_allowed CHECK (
        delegating_user_id != delegated_to_user_id
    )
);

CREATE INDEX idx_delegations_delegating ON governance_delegations(delegating_user_id);
CREATE INDEX idx_delegations_delegated_to ON governance_delegations(delegated_to_user_id);
CREATE INDEX idx_delegations_status ON governance_delegations(status);

-- ============================================================================
-- Table 4: parameter_whitelist
-- Conservative list of voteable parameters
-- ============================================================================

CREATE TABLE IF NOT EXISTS parameter_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parameter Definition
    parameter_name VARCHAR(100) NOT NULL UNIQUE,
    parameter_category VARCHAR(50) NOT NULL CHECK (parameter_category IN (
        'economic_accessibility',
        'feature_access',
        'system_parameters',
        'reward_distribution',
        'governance_rules'
    )),

    -- Value Constraints
    value_type VARCHAR(20) NOT NULL CHECK (value_type IN (
        'integer', 'decimal', 'boolean', 'text'
    )),
    min_value VARCHAR(255),
    max_value VARCHAR(255),
    default_value VARCHAR(255) NOT NULL,
    current_value VARCHAR(255) NOT NULL,

    -- Description
    description TEXT NOT NULL,
    rationale TEXT,

    -- Voting Rules
    requires_super_majority BOOLEAN DEFAULT FALSE,
    minimum_vote_duration_days INT DEFAULT 7,
    maximum_vote_duration_days INT DEFAULT 14,
    requires_verification_to_vote BOOLEAN DEFAULT TRUE,

    -- Quorum Rules
    minimum_vote_quorum INT DEFAULT 1000,
    quorum_percentage_of_verified DECIMAL(5,2) DEFAULT 5.0,
    quorum_enforcement VARCHAR(20) DEFAULT 'absolute' CHECK (quorum_enforcement IN (
        'absolute',
        'percentage',
        'either'
    )),

    -- Status
    is_voteable BOOLEAN DEFAULT TRUE,
    is_emergency_parameter BOOLEAN DEFAULT FALSE,

    -- History
    last_voted_on TIMESTAMPTZ,
    times_voted_on INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parameters_category ON parameter_whitelist(parameter_category);
CREATE INDEX idx_parameters_voteable ON parameter_whitelist(is_voteable);

-- ============================================================================
-- Table 5: constitutional_articles
-- Protected parameters that can NEVER be voted on
-- ============================================================================

CREATE TABLE IF NOT EXISTS constitutional_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Article Definition
    article_number INT NOT NULL UNIQUE,
    article_title VARCHAR(255) NOT NULL,

    -- Protected Rules
    protected_rule VARCHAR(255) NOT NULL,
    rationale TEXT,

    -- What This Protects
    examples_of_violations TEXT,

    -- Amendment Rules
    amendment_requires_founder_approval BOOLEAN DEFAULT FALSE,
    amendment_requires_90_percent_approval BOOLEAN DEFAULT FALSE,
    amendment_minimum_discussion_days INT DEFAULT 60,

    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'deprecated', 'archived'
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_constitutional_articles_status ON constitutional_articles(status);

-- ============================================================================
-- Table 6: governance_actions
-- Track governance decisions that need execution
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Action Details
    governance_poll_id UUID REFERENCES governance_polls(id),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'parameter_update',
        'feature_toggle',
        'reward_adjustment',
        'emergency_rollback',
        'custom_action'
    )),

    -- Parameter Change
    parameter_name VARCHAR(100),
    old_value VARCHAR(255),
    new_value VARCHAR(255),

    -- Execution
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'scheduled', 'executing', 'completed', 'failed', 'rolled_back'
    )),

    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,

    -- Rollback Info
    is_rollback_of_action_id UUID REFERENCES governance_actions(id),
    can_be_rolled_back BOOLEAN DEFAULT TRUE,
    rollback_window_hours INT DEFAULT 72,
    rollback_window_expires_at TIMESTAMPTZ,
    rollback_count_for_parameter INT DEFAULT 0,
    parameter_frozen_until TIMESTAMPTZ,

    -- Rollback Authority Tracking
    rollback_initiated_by_user_id UUID,
    rollback_initiation_type VARCHAR(30) CHECK (rollback_initiation_type IN (
        'founder_unilateral',
        'verified_user_petition',
        'automatic_trigger'
    )),
    founder_rollback_tokens_remaining INT,

    -- Metadata
    execution_notes TEXT,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_governance_actions_status ON governance_actions(status);
CREATE INDEX idx_governance_actions_poll ON governance_actions(governance_poll_id);

-- ============================================================================
-- Table 7: shadow_consensus_snapshots
-- Record Shadow Consensus for each poll
-- ============================================================================

CREATE TABLE IF NOT EXISTS shadow_consensus_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    governance_poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE UNIQUE,

    -- Voting Breakdown
    true_self_yes_count INT,
    true_self_no_count INT,
    true_self_abstain_count INT,

    shadow_yes_count INT,
    shadow_no_count INT,
    shadow_abstain_count INT,

    -- Percentages
    true_self_yes_percentage DECIMAL(5,2),
    shadow_yes_percentage DECIMAL(5,2),

    -- The Gap (Key Insight)
    public_vs_private_gap_percentage DECIMAL(5,2),
    gap_interpretation VARCHAR(50),

    -- Confidence
    confidence_interval_plus_minus DECIMAL(5,2),
    sample_size INT,

    -- Analysis
    trend_direction VARCHAR(20),
    notable_patterns TEXT,

    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shadow_consensus_poll ON shadow_consensus_snapshots(governance_poll_id);

-- ============================================================================
-- Table 8: governance_stakes
-- Track Gratium staking on poll outcomes
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stake Details
    governance_poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    identity_mode VARCHAR(10) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),

    -- Staker DID (pseudonymous)
    staker_did VARCHAR(100) NOT NULL,

    -- Stake Position
    staked_position VARCHAR(10) NOT NULL CHECK (staked_position IN ('yes', 'no')),
    gratium_amount BIGINT NOT NULL CHECK (gratium_amount > 0),

    -- Stake Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'won',
        'lost',
        'refunded',
        'slashed'
    )),

    -- Rewards
    reward_multiplier DECIMAL(4,2) DEFAULT 1.5,
    gratium_reward BIGINT DEFAULT 0,
    reward_paid_at TIMESTAMPTZ,

    -- Risk & Confidence
    confidence_level VARCHAR(20) CHECK (confidence_level IN (
        'low',
        'medium',
        'high',
        'extreme'
    )),

    -- Metadata
    reasoning_text TEXT,
    light_score_at_stake_time DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One stake per identity per poll
    UNIQUE(governance_poll_id, user_id, identity_mode)
);

CREATE INDEX idx_governance_stakes_poll ON governance_stakes(governance_poll_id);
CREATE INDEX idx_governance_stakes_user ON governance_stakes(user_id);
CREATE INDEX idx_governance_stakes_status ON governance_stakes(status);
CREATE INDEX idx_governance_stakes_did ON governance_stakes(staker_did);

-- ============================================================================
-- Table 9: governance_stake_pools
-- Track total stake pools per poll
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_stake_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    governance_poll_id UUID NOT NULL REFERENCES governance_polls(id) ON DELETE CASCADE UNIQUE,

    -- Pool Totals
    total_yes_stake BIGINT DEFAULT 0,
    total_no_stake BIGINT DEFAULT 0,
    total_pool_size BIGINT GENERATED ALWAYS AS (total_yes_stake + total_no_stake) STORED,

    -- Staker Counts
    yes_stakers_count INT DEFAULT 0,
    no_stakers_count INT DEFAULT 0,
    total_stakers INT GENERATED ALWAYS AS (yes_stakers_count + no_stakers_count) STORED,

    -- Pool Status
    pool_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (pool_status IN (
        'open',
        'closed',
        'distributed',
        'refunded'
    )),

    -- Reward Distribution
    winning_position VARCHAR(10) CHECK (winning_position IN ('yes', 'no', 'tie')),
    total_rewards_distributed BIGINT DEFAULT 0,
    distribution_completed_at TIMESTAMPTZ,

    -- Metadata
    average_yes_stake BIGINT,
    average_no_stake BIGINT,
    largest_single_stake BIGINT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stake_pools_poll ON governance_stake_pools(governance_poll_id);
CREATE INDEX idx_stake_pools_status ON governance_stake_pools(pool_status);

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Function: Update poll updated_at timestamp
CREATE OR REPLACE FUNCTION update_governance_poll_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_governance_poll_timestamp
    BEFORE UPDATE ON governance_polls
    FOR EACH ROW
    EXECUTE FUNCTION update_governance_poll_timestamp();

-- Function: Calculate confidence level for stake
CREATE OR REPLACE FUNCTION calculate_stake_confidence_level(amount BIGINT)
RETURNS VARCHAR AS $$
BEGIN
    IF amount < 100 THEN
        RETURN 'low';
    ELSIF amount < 1000 THEN
        RETURN 'medium';
    ELSIF amount < 10000 THEN
        RETURN 'high';
    ELSE
        RETURN 'extreme';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE governance_polls IS 'Master table for all governance proposals and polls';
COMMENT ON TABLE governance_votes IS 'Individual votes cast by users (True Self + Shadow)';
COMMENT ON TABLE governance_delegations IS 'Vote delegation system with chain prevention';
COMMENT ON TABLE parameter_whitelist IS 'Conservative list of voteable parameters';
COMMENT ON TABLE constitutional_articles IS 'Protected parameters that cannot be voted on';
COMMENT ON TABLE governance_actions IS 'Governance decisions requiring execution';
COMMENT ON TABLE shadow_consensus_snapshots IS 'Shadow Consensus analysis per poll';
COMMENT ON TABLE governance_stakes IS 'Individual Gratium stakes on poll outcomes';
COMMENT ON TABLE governance_stake_pools IS 'Aggregate stake pool data per poll';

-- ============================================================================
-- Schema Version
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES
    ('1.0.0', 'Initial governance schema with 9 tables, dual voting, Shadow Consensus, staking, and rollback protocol');
