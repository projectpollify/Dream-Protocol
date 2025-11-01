-- ============================================================================
-- Module 06: Governance - Seed Data
-- Dream Protocol - Initial Parameters and Constitutional Articles
-- ============================================================================

-- ============================================================================
-- Seed Constitutional Articles (Protected from voting)
-- ============================================================================

INSERT INTO constitutional_articles (article_number, article_title, protected_rule, rationale, examples_of_violations, amendment_requires_founder_approval, amendment_requires_90_percent_approval) VALUES
(1, 'Dual-Identity Architecture',
 'The platform must maintain dual-identity system (True Self + Shadow) for all users',
 'Core innovation of Dream Protocol - allows expression of both public and authentic perspectives',
 'Removing Shadow voting, forcing single identity, making True Self and Shadow linkage public',
 TRUE, TRUE),

(2, 'Vote Privacy Protection',
 'True Self and Shadow identity linkage must remain pseudonymous and unlinked',
 'Users privacy guarantee - can vote authentically without fear of correlation',
 'Publishing which True Self/Shadow pairs belong together, removing timing jitter',
 TRUE, TRUE),

(3, 'Proof of Humanity Requirement',
 'All voting must require Proof of Humanity verification',
 'Prevents Sybil attacks and ensures one human = two votes (not unlimited votes)',
 'Allowing unverified users to vote, removing PoH requirement',
 TRUE, TRUE),

(4, 'Permanence on Arweave',
 'All governance votes and decisions must be archived permanently on Arweave',
 'Immutable record of democratic decisions - democracy without memory is tyranny',
 'Deleting vote records, making votes ephemeral, removing blockchain archival',
 TRUE, TRUE),

(5, 'Spot-Only Token Strategy',
 'Platform tokens (PollCoin, Gratium) cannot enable shorts, leverage, or derivatives',
 'Economic alignment - all holders want platform success, no betting against protocol',
 'Enabling short selling, adding leverage/margin trading, creating token derivatives',
 TRUE, TRUE),

(6, 'Emergency Rollback Authority',
 'Platform must maintain 72-hour rollback window for governance decisions',
 'Safety mechanism for rapid correction of harmful decisions',
 'Removing rollback capability entirely, making decisions immediately irreversible',
 TRUE, TRUE);

-- ============================================================================
-- Seed Parameter Whitelist (MVP - Year 1-2 Parameters)
-- ============================================================================

-- Economic Accessibility Parameters
INSERT INTO parameter_whitelist
(parameter_name, parameter_category, value_type, min_value, max_value, default_value, current_value, description, rationale, requires_super_majority, minimum_vote_duration_days, requires_verification_to_vote, minimum_vote_quorum, quorum_percentage_of_verified, quorum_enforcement)
VALUES
('poll_creation_cost_general', 'economic_accessibility', 'integer', '50', '1000', '500', '500',
 'PollCoin cost to create a general community poll',
 'Balance between accessibility and spam prevention',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('poll_creation_cost_governance', 'economic_accessibility', 'integer', '100', '5000', '1000', '1000',
 'PollCoin cost to create a governance parameter vote',
 'Higher cost for governance polls due to platform impact',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('minimum_reputation_to_post', 'economic_accessibility', 'integer', '5', '50', '20', '20',
 'Minimum Light Score required to create posts',
 'Ensures basic platform familiarity before posting',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('minimum_reputation_to_create_poll', 'economic_accessibility', 'integer', '10', '100', '25', '25',
 'Minimum Light Score required to create polls',
 'Ensures users understand platform before creating polls',
 FALSE, 7, TRUE, 1000, 5.0, 'either');

-- Feature Access Parameters
INSERT INTO parameter_whitelist
(parameter_name, parameter_category, value_type, min_value, max_value, default_value, current_value, description, rationale, requires_super_majority, minimum_vote_duration_days, requires_verification_to_vote, minimum_vote_quorum, quorum_percentage_of_verified, quorum_enforcement)
VALUES
('pentos_ai_public_access', 'feature_access', 'boolean', 'false', 'true', 'true', 'true',
 'Whether Pentos AI assistant is accessible to all users',
 'Community can vote to restrict AI access if needed',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('pentos_ai_usage_limits', 'feature_access', 'integer', '10', '999999', '999999', '999999',
 'Maximum Pentos AI requests per user per day (999999 = unlimited)',
 'Rate limiting for AI if resources become constrained',
 FALSE, 7, TRUE, 1000, 5.0, 'either');

-- System Parameters
INSERT INTO parameter_whitelist
(parameter_name, parameter_category, value_type, min_value, max_value, default_value, current_value, description, rationale, requires_super_majority, minimum_vote_duration_days, requires_verification_to_vote, minimum_vote_quorum, quorum_percentage_of_verified, quorum_enforcement)
VALUES
('gratium_staking_apy_rate', 'system_parameters', 'decimal', '2.0', '15.0', '8.0', '8.0',
 'Annual percentage yield for Gratium staking',
 'Incentivize long-term holding while maintaining sustainability',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('reward_per_poll_participant', 'reward_distribution', 'integer', '10', '150', '50', '50',
 'Gratium reward for participating in governance polls',
 'Incentivize governance participation',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('thought_chamber_duration_days', 'system_parameters', 'integer', '3', '14', '7', '7',
 'Default duration for Thought Chamber discussions',
 'Balance between deliberation time and decision velocity',
 FALSE, 7, TRUE, 1000, 5.0, 'either');

-- Governance Rules
INSERT INTO parameter_whitelist
(parameter_name, parameter_category, value_type, min_value, max_value, default_value, current_value, description, rationale, requires_super_majority, minimum_vote_duration_days, requires_verification_to_vote, minimum_vote_quorum, quorum_percentage_of_verified, quorum_enforcement)
VALUES
('default_quorum_absolute', 'governance_rules', 'integer', '500', '5000', '1000', '1000',
 'Default absolute minimum votes required for polls',
 'Prevents low-participation governance attacks',
 TRUE, 14, TRUE, 2000, 10.0, 'either'),

('default_quorum_percentage', 'governance_rules', 'decimal', '1.0', '10.0', '5.0', '5.0',
 'Default percentage of verified users required for quorum',
 'Scales quorum with platform growth',
 TRUE, 14, TRUE, 2000, 10.0, 'either'),

('max_vote_changes_per_poll', 'governance_rules', 'integer', '1', '10', '5', '5',
 'Maximum times a user can change their vote on a single poll',
 'Allows deliberation while preventing spam',
 FALSE, 7, TRUE, 1000, 5.0, 'either'),

('vote_timing_jitter_max_seconds', 'governance_rules', 'integer', '3600', '14400', '7200', '7200',
 'Maximum random delay (in seconds) applied to displayed vote times',
 'Privacy protection - prevents correlation of True Self and Shadow votes',
 TRUE, 14, TRUE, 2000, 10.0, 'either'),

('section_multiplier_min', 'governance_rules', 'decimal', '0.5', '0.9', '0.7', '0.7',
 'Minimum multiplier for voting sections (reduces whale power)',
 'Lower bound for section randomization',
 TRUE, 14, TRUE, 2000, 10.0, 'either'),

('section_multiplier_max', 'governance_rules', 'decimal', '1.1', '2.0', '1.5', '1.5',
 'Maximum multiplier for voting sections (amplifies some votes)',
 'Upper bound for section randomization',
 TRUE, 14, TRUE, 2000, 10.0, 'either');

-- ============================================================================
-- Seed Founder Rollback Tokens
-- ============================================================================

-- Note: This will be created when founder creates their account
-- For now, just document the initial state

COMMENT ON COLUMN governance_actions.founder_rollback_tokens_remaining IS
'Founder starts with 10 unilateral rollback tokens (Year 1-3). Each use depletes one token. After depletion, must use verified user petition process.';

-- ============================================================================
-- Seed Complete Marker
-- ============================================================================

INSERT INTO schema_version (version, description) VALUES
    ('1.0.0-seed', 'Seeded 6 constitutional articles and 15 voteable parameters for MVP');
