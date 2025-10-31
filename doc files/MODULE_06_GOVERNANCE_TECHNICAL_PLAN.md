# 🗳️ Module 06: Governance - Technical Specification
## Dual-Mode Democratic Decision-Making Engine for Dream Protocol

**Module Number**: 06 of 22  
**Build Priority**: PRIORITY 3 - Core Value (After Module 05: Token Exchange)  
**Dependencies**: Module 04 (Economy), Module 03 (User), Module 01 (Identity)  
**Dependents**: Module 07 (Content), Module 11 (Neural Pollinator), Module 12 (Keystone), Module 20 (Arweave)  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 06 implements the democratic decision-making engine that enables the 7-year gradual transition from founder control to full community governance. This is Dream Protocol's core differentiator—where every user has TWO votes (True Self + Shadow) and the platform learns what communities really believe vs. what they say publicly.

### **Core Philosophy**
> "Democracy works when everyone has equal voice and all incentives are aligned. We give each user two votes because reality is complex—sometimes your public self and authentic self have different perspectives. Both matter. Both are respected. Both shape the future."

### **Key Innovation**
- **Dual-Mode Voting**: True Self + Shadow vote independently on governance decisions
- **Shadow Consensus**: The system reveals gaps between public and private beliefs
- **Spot-Only Token Design**: Holders are economically aligned with platform success
- **7-Section Voting Multipliers**: Reduces whale voting power concentration
- **Constitutional Foundation**: Core parameters protected from voting

---

## 🗓️ What This Module Does

### **Primary Functions**
1. **Poll/Proposal Creation** - With PollCoin cost and verification requirements
2. **Dual-Mode Voting** - True Self and Shadow vote independently
3. **Gratium Staking** - Users stake on poll outcomes for rewards
4. **Vote Delegation** - Delegate voting power to trusted users
5. **7-Section Multipliers** - Reduce whale concentration
6. **Results Calculation** - Shadow Consensus with confidence intervals
7. **Governance Actions** - Execute approved parameter changes
8. **Rollback Protocol** - Quickly revert harmful governance decisions
9. **Constitutional Articles** - Protected parameters (never voteable)
10. **Vote History** - Complete audit trail on Arweave

### **Key Features**
- ✅ Two votes per user (True Self + Shadow)
- ✅ Equal voting weight (no wealth-based voting)
- ✅ Parameter whitelist (conservative MVP)
- ✅ 7-section voting multipliers (whale protection)
- ✅ Gratium staking on outcomes (skin in the game)
- ✅ Delegation system (represent others)
- ✅ Arweave permanence (all votes recorded forever)
- ✅ Constitutional rollback (emergency correction)
- ✅ Thalyra monitoring (detect manipulation attempts)

---

## 🗳️ Voting Architecture

### **One User = Two Votes**

```
┌─────────────────────────────────────────────┐
│          USER ABC GOVERNANCE VOTE            │
├─────────────────────────────────────────────┤
│                                              │
│  TRUE SELF (Public Persona)                  │
│  ├─ DID: did:agoranet:abc_ts                │
│  ├─ Vote: YES ✓                             │
│  └─ Reasoning: Security matters             │
│                                              │
│  SHADOW (Authentic Self)                    │
│  ├─ DID: did:agoranet:abc_sh                │
│  ├─ Vote: NO ✗                              │
│  └─ Reasoning: Freedom matters              │
│                                              │
│  Both votes recorded on Arweave             │
│  But nobody knows they're the same person   │
│                                              │
└─────────────────────────────────────────────┘
```

### **Vote Privacy Model**

| Attribute | Status | Reason |
|-----------|--------|--------|
| **Vote visibility** | Public on Arweave | Transparency |
| **DID visibility** | Shows DID (pseudonymous) | Reputation building |
| **Vote pattern** | Private (can't aggregate) | True autonomy |
| **Identity linkage** | Secret (encrypted linkage) | Privacy preservation |
| **Both identities look separate** | Yes | Appears as 2 different users |

**Example**: You see votes from `did:agoranet:abc_ts` and `did:agoranet:abc_sh`, but nothing tells you they're the same person.

---

### **7-Section Voting Multipliers**

Governance votes use the same section system as regular polls to reduce whale concentration:

```
GOVERNANCE VOTE WITH MULTIPLIERS
══════════════════════════════════════════════

Base Votes Cast:
- YES votes: 3,200 base votes
- NO votes: 1,100 base votes

APPLIED 7-SECTION MULTIPLIERS:
──────────────────────────────────────────────

Users voting in different sections get random multipliers:

Section 1: 400 votes × 0.8x (random) = 320 weighted
Section 2: 450 votes × 1.2x (random) = 540 weighted
Section 3: 380 votes × 0.9x (random) = 342 weighted
Section 4: 420 votes × 1.5x (random) = 630 weighted
Section 5: 390 votes × 1.0x (random) = 390 weighted
Section 6: 360 votes × 0.7x (random) = 252 weighted
Section 7: 200 votes × 1.1x (random) = 220 weighted

FINAL WEIGHTED TOTALS:
──────────────────────────────────────────────
YES: 2,694 weighted votes
NO: 770 weighted votes

CONFIDENCE: 77% ± 3% (Shadow Consensus)
```

**Why This Works**:
- Whale can't dominate single section with all votes
- Must spread voting power across sections
- Random multipliers each cycle prevent gaming
- Smaller holders' votes matter more on average

---

## 📊 Database Schema

### **Table 1: `governance_polls`**
Master table for all governance proposals:

```sql
CREATE TABLE governance_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Poll Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    proposal_url TEXT, -- Link to full proposal document
    
    -- Poll Type
    poll_type VARCHAR(50) NOT NULL CHECK (poll_type IN (
        'parameter_vote',      -- Change a parameter
        'constitutional',      -- Constitutional amendment (rare)
        'emergency_rollback',  -- Revert recent change
        'governance_feature',  -- Vote on new governance feature
        'general_community'    -- General community decision
    )) NOT NULL,
    
    -- Parameter Voting (if applicable)
    parameter_name VARCHAR(100), -- e.g., 'poll_creation_cost_general'
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
    
    -- Shadow Consensus
    shadow_consensus_percentage DECIMAL(5,2),
    consensus_confidence_interval DECIMAL(5,2), -- ±% confidence
    public_vs_private_gap DECIMAL(5,2), -- Difference between True Self and Shadow
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Not started
        'active',            -- Currently voting
        'closed',            -- Voting ended
        'approved',          -- Passed with yes majority
        'rejected',          -- Failed
        'executed',          -- Governance action applied
        'rolled_back',       -- Reverted by emergency rollback
        'disputed'           -- Governance dispute raised
    )),
    
    -- Results
    final_yes_percentage DECIMAL(5,2),
    final_no_percentage DECIMAL(5,2),
    approval_required_percentage INT DEFAULT 50, -- >50% for approval (configurable)
    
    -- Governance Action (if applicable)
    governance_action_id UUID REFERENCES governance_actions(id),
    execute_immediately BOOLEAN DEFAULT FALSE,
    execute_at TIMESTAMPTZ, -- Scheduled execution time
    
    -- Metadata
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Blockchain Integration (future)
    arweave_tx_id VARCHAR(100),
    cardano_tx_hash VARCHAR(100),
    
    CONSTRAINT valid_duration CHECK (poll_end_at > poll_start_at)
);

CREATE INDEX idx_governance_polls_status ON governance_polls(status);
CREATE INDEX idx_governance_polls_end_at ON governance_polls(poll_end_at DESC);
CREATE INDEX idx_governance_polls_type ON governance_polls(poll_type);
CREATE INDEX idx_governance_polls_parameter ON governance_polls(parameter_name);
```

---

### **Table 2: `governance_votes`**
Individual votes cast by users:

```sql
CREATE TABLE governance_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    poll_id UUID REFERENCES governance_polls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Vote Details
    vote_option VARCHAR(20) NOT NULL CHECK (vote_option IN (
        'yes', 'no', 'abstain'
    )),
    
    -- DID Information (pseudonymous)
    voter_did VARCHAR(100) NOT NULL, -- e.g., did:agoranet:abc_ts
    
    -- 7-Section Multiplier
    assigned_section INT CHECK (assigned_section BETWEEN 1 AND 7),
    section_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- e.g., 0.8, 1.2, etc.
    
    -- Weighted Voting
    base_vote_weight BIGINT DEFAULT 1,
    final_vote_weight BIGINT GENERATED ALWAYS AS (
        CAST(CAST(base_vote_weight AS DECIMAL) * section_multiplier AS BIGINT)
    ) STORED,
    
    -- Reasoning (optional)
    reasoning_text TEXT, -- User can optionally explain their vote
    
    -- Voting Power Delegation
    voting_power_delegated_from_user_id UUID REFERENCES users(id), -- If delegated
    is_delegated_vote BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    light_score_at_vote_time DECIMAL(5,2), -- For analysis
    is_verified_human BOOLEAN, -- PoH status at vote time
    ip_address INET, -- For fraud detection
    
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
```

---

### **Table 3: `governance_delegations`**
Vote delegation system:

```sql
CREATE TABLE governance_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Delegation Setup
    delegating_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    delegating_identity_mode VARCHAR(10) CHECK (delegating_identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    delegated_to_user_id UUID REFERENCES users(id) NOT NULL,
    delegated_to_identity_mode VARCHAR(10) CHECK (delegated_to_identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Delegation Type
    delegation_type VARCHAR(30) NOT NULL CHECK (delegation_type IN (
        'all_governance',      -- All governance votes
        'parameter_votes_only', -- Only parameter changes
        'specific_poll'        -- Specific poll only
    )),
    
    target_poll_id UUID REFERENCES governance_polls(id), -- If specific_poll type
    
    -- Duration
    active_from TIMESTAMPTZ DEFAULT NOW(),
    active_until TIMESTAMPTZ, -- NULL = indefinite
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'revoked', 'expired', 'paused'
    )),
    
    -- Metadata
    reason_text TEXT, -- Why delegating to this person?
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
```

---

### **Table 4: `parameter_whitelist`**
Conservative list of voteable parameters:

```sql
CREATE TABLE parameter_whitelist (
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
    rationale TEXT, -- Why this parameter is voteable
    
    -- Voting Rules
    requires_super_majority BOOLEAN DEFAULT FALSE, -- 66%+ instead of 50%+
    minimum_vote_duration_days INT DEFAULT 7,
    maximum_vote_duration_days INT DEFAULT 14,
    requires_verification_to_vote BOOLEAN DEFAULT TRUE,
    
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
```

---

### **Table 5: `constitutional_articles`**
Protected parameters that can NEVER be voted on:

```sql
CREATE TABLE constitutional_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Article Definition
    article_number INT NOT NULL UNIQUE,
    article_title VARCHAR(255) NOT NULL,
    
    -- Protected Rules
    protected_rule VARCHAR(255) NOT NULL,
    rationale TEXT,
    
    -- What This Protects
    examples_of_violations TEXT, -- What we DON'T allow
    
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
```

---

### **Table 6: `governance_actions`**
Track governance decisions that need execution:

```sql
CREATE TABLE governance_actions (
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
    rollback_window_hours INT DEFAULT 72, -- Time to undo decision
    
    -- Metadata
    execution_notes TEXT,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_governance_actions_status ON governance_actions(status);
CREATE INDEX idx_governance_actions_poll ON governance_actions(governance_poll_id);
```

---

### **Table 7: `shadow_consensus_snapshots`**
Record Shadow Consensus for each poll:

```sql
CREATE TABLE shadow_consensus_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    governance_poll_id UUID REFERENCES governance_polls(id) ON DELETE CASCADE UNIQUE,
    
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
    public_vs_private_gap_percentage DECIMAL(5,2), -- |TS_yes% - SH_yes%|
    gap_interpretation VARCHAR(50), -- 'large_divergence', 'moderate', 'aligned'
    
    -- Confidence
    confidence_interval_plus_minus DECIMAL(5,2),
    sample_size INT, -- Number of votes analyzed
    
    -- Analysis
    trend_direction VARCHAR(20), -- 'converging', 'diverging', 'stable'
    notable_patterns TEXT, -- e.g., "younger users diverge more"
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shadow_consensus_poll ON shadow_consensus_snapshots(governance_poll_id);
```

---

## 🔄 Governance Flow

### **Step 1: Poll Creation**

**User Requirements**:
- Verified human (PoH score 50+)
- Sufficient PollCoin balance
- Light Score 20+ (basic reputation)

**Cost**:
- Governance parameter vote: 1000 PollCoin
- General governance: 500 PollCoin
- 1% burned, 99% goes to governance rewards pool

```
User creates poll:
├─ Title: "Increase poll creation cost to 600 PollCoin?"
├─ Description: (Full rationale)
├─ Type: "parameter_vote"
├─ Parameter: "poll_creation_cost_general"
├─ Proposed value: 600
├─ Duration: 7 days
└─ Cost: 1000 PollCoin
    ├─ Burn: 10 PollCoin
    └─ Rewards pool: 990 PollCoin
```

---

### **Step 2: Voting Period**

**Each user can vote TWICE**:
- True Self votes one way
- Shadow votes (same or different way)
- Both identities have equal weight
- Voting power delegated automatically if user has delegations

**Voting Rules**:
- One vote per identity per poll
- Can change vote during voting period
- Can include optional reasoning
- Reasoning visible but vote privacy maintained

---

### **Step 3: 7-Section Allocation**

System randomly assigns voters to sections:

```
POLL VOTE DISTRIBUTION (Example)
════════════════════════════════════════════

Section 1 (12.5%): 400 votes × 0.8x = 320 weighted
Section 2 (14.3%): 450 votes × 1.2x = 540 weighted
Section 3 (10.8%): 340 votes × 0.9x = 306 weighted
Section 4 (15.2%): 480 votes × 1.5x = 720 weighted
Section 5 (12.1%): 385 votes × 1.0x = 385 weighted
Section 6 (11.8%): 370 votes × 0.7x = 259 weighted
Section 7 (13.5%): 430 votes × 1.1x = 473 weighted

RESULT:
YES: 2,694 weighted votes (77%)
NO: 770 weighted votes (23%)

Why multipliers help:
- If one voter had 1000 votes, spreading limits their max impact
- Smaller holders' votes have higher average multiplier
- Prevents whale dominance
```

---

### **Step 4: Shadow Consensus Calculation**

After voting ends, calculate the insight:

```
SHADOW CONSENSUS ANALYSIS
════════════════════════════════════════════

TRUE SELF VOTES:
- YES: 1,850 votes (58%)
- NO: 1,330 votes (42%)

SHADOW VOTES:
- YES: 1,240 votes (76%)
- NO: 390 votes (24%)

PUBLIC vs. PRIVATE GAP:
- Gap: |58% - 76%| = 18 percentage points
- Interpretation: "Significant divergence - public cautious, authentic selves confident"

CONFIDENCE:
- 3,000 total votes analyzed
- Confidence interval: ± 1.8%
- Overall result: 67% YES (± 1.8%)

KEY INSIGHT: Authentic selves are 18% more confident than public personas
```

---

### **Step 5: Execution**

If approved (>50% YES):

1. **Parameter Vote**: Governance action creates parameter update
2. **Scheduled Execution**: Waits 72 hours for rollback option
3. **Active Effect**: New parameter takes effect
4. **Logged**: Entire transaction recorded on Arweave

---

## 🛡️ Constitutional Articles (Protected from Voting)

These can **NEVER** be voted on:

| Article | Protected Rule | Why |
|---------|----------------|-----|
| **Identity** | Dual-identity system architecture | Core innovation—can't be removed |
| **Privacy** | True Self + Shadow remain pseudonymous | Users' privacy guarantee |
| **Verification** | Proof of Humanity required to vote | Prevents Sybil attacks |
| **Permanence** | All votes recorded on Arweave | Immutability guarantee |
| **Economic Alignment** | Spot-only token strategy | Can't enable shorts/leverage |
| **Rollback Protocol** | 72-hour rollback window | Emergency correction ability |

---

## 📋 Parameter Whitelist (MVP)

Conservative list for Year 1-2:

### **Economic Accessibility** (4 parameters)
```
poll_creation_cost_general
  Current: 500 PollCoin
  Min: 50 PollCoin
  Max: 1000 PollCoin
  
poll_creation_cost_governance
  Current: 1000 PollCoin
  Min: 100 PollCoin
  Max: 5000 PollCoin
  
minimum_reputation_to_post
  Current: 20 Light Score
  Min: 5
  Max: 50
  
minimum_reputation_to_create_poll
  Current: 25 Light Score
  Min: 10
  Max: 100
```

### **Feature Access** (2 parameters)
```
pentos_ai_public_access
  Current: true
  Options: true/false
  
pentos_ai_usage_limits
  Current: unlimited
  Min: 10 requests/day
  Max: unlimited
```

### **System Parameters** (3 parameters)
```
gratium_staking_apy_rate
  Current: 8%
  Min: 2%
  Max: 15%
  
reward_per_poll_participant
  Current: 50 Gratium
  Min: 10
  Max: 150
  
thought_chamber_duration_days
  Current: 7
  Min: 3
  Max: 14
```

---

## 🔌 API Endpoints

### **POST `/api/v1/governance/create-poll`**
Create a governance poll

**Request**:
```json
{
  "title": "Increase poll creation cost to 600 PollCoin?",
  "description": "Current cost is 500. Proposed increase to 600 to reduce spam.",
  "poll_type": "parameter_vote",
  "parameter_name": "poll_creation_cost_general",
  "parameter_proposed_value": "600",
  "duration_days": 7
}
```

**Response**:
```json
{
  "poll_id": "uuid",
  "status": "pending",
  "starts_at": "2025-02-15T12:00:00Z",
  "ends_at": "2025-02-22T12:00:00Z",
  "poll_cost_paid": 500,
  "tokens_burned": 5,
  "tokens_to_rewards_pool": 495
}
```

---

### **POST `/api/v1/governance/vote`**
Cast a vote on governance poll

**Request**:
```json
{
  "poll_id": "uuid",
  "identity_mode": "true_self",
  "vote_option": "yes",
  "reasoning": "Reducing spam helps maintain quality discussions"
}
```

**Response**:
```json
{
  "vote_id": "uuid",
  "poll_id": "uuid",
  "voter_did": "did:agoranet:abc_ts",
  "vote": "yes",
  "assigned_section": 4,
  "section_multiplier": 1.5,
  "status": "recorded"
}
```

---

### **POST `/api/v1/governance/delegate`**
Delegate voting power

**Request**:
```json
{
  "delegating_identity_mode": "true_self",
  "delegated_to_user_id": "uuid",
  "delegation_type": "all_governance",
  "active_until": "2026-02-15T00:00:00Z"
}
```

**Response**:
```json
{
  "delegation_id": "uuid",
  "status": "active",
  "delegating_to": "uuid",
  "valid_until": "2026-02-15T00:00:00Z"
}
```

---

### **GET `/api/v1/governance/polls/:poll_id`**
Get poll details and current results

**Response**:
```json
{
  "poll_id": "uuid",
  "title": "Increase poll creation cost to 600 PollCoin?",
  "status": "active",
  "ends_at": "2025-02-22T12:00:00Z",
  "voting_stats": {
    "base_votes": {
      "yes": 2850,
      "no": 1100,
      "abstain": 200
    },
    "weighted_votes": {
      "yes": 2694,
      "no": 770
    },
    "yes_percentage": 77.8
  },
  "shadow_consensus": {
    "public_yes_percentage": 58,
    "authentic_yes_percentage": 76,
    "gap": 18,
    "interpretation": "Significant divergence"
  },
  "user_has_voted": true,
  "user_votes": {
    "true_self": "yes",
    "shadow": "no"
  }
}
```

---

### **GET `/api/v1/governance/shadow-consensus/:poll_id`**
Deep dive into Shadow Consensus

**Response**:
```json
{
  "poll_id": "uuid",
  "poll_title": "Increase poll creation cost?",
  "true_self_breakdown": {
    "yes_count": 1850,
    "no_count": 1330,
    "abstain_count": 200,
    "yes_percentage": 58.2
  },
  "shadow_breakdown": {
    "yes_count": 2240,
    "no_count": 390,
    "abstain_count": 100,
    "yes_percentage": 76.4
  },
  "gap_analysis": {
    "gap_percentage": 18.2,
    "gap_interpretation": "significant_divergence",
    "likely_cause": "Authentic selves prioritize quality over accessibility"
  },
  "demographic_analysis": {
    "by_light_score": [
      {
        "light_score_range": "0-40",
        "gap": 12.3
      },
      {
        "light_score_range": "40-70",
        "gap": 18.9
      },
      {
        "light_score_range": "70-100",
        "gap": 8.2
      }
    ]
  }
}
```

---

### **GET `/api/v1/governance/polls`**
List all governance polls

**Query Params**:
- `status`: 'active', 'pending', 'closed', 'approved'
- `type`: 'parameter_vote', 'constitutional', etc.
- `limit`: Results per page

**Response**:
```json
{
  "polls": [
    {
      "poll_id": "uuid",
      "title": "Increase poll creation cost?",
      "type": "parameter_vote",
      "status": "active",
      "ends_at": "2025-02-22T12:00:00Z",
      "current_yes_percentage": 77.8,
      "total_votes": 4150,
      "your_votes": {
        "true_self": "yes",
        "shadow": "no"
      }
    }
  ],
  "total": 12,
  "active_count": 3
}
```

---

### **POST `/api/v1/governance/emergency-rollback`**
Initiate rollback of recent governance decision

**Request**:
```json
{
  "governance_action_id": "uuid",
  "reason": "Parameter change causing unexpected issues"
}
```

**Response**:
```json
{
  "success": true,
  "rollback_poll_created": "uuid",
  "rollback_window_remaining": "68 hours",
  "current_parameter_value": "600",
  "previous_parameter_value": "500"
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- 7-section multiplier calculation is correct
- Shadow Consensus gap calculation accurate
- Parameter validation within whitelist bounds
- Delegation logic doesn't create vote conflicts
- Constitutional articles protected from votes

### **Integration Tests**
- Complete poll creation → voting → execution flow
- Dual voting (True Self and Shadow simultaneously)
- 7-section assignment and weighted voting
- Delegation system cascades correctly
- Parameter update takes effect in other modules
- Emergency rollback reverts changes

### **Security Tests**
- Can't vote twice on same poll with same identity
- Can't change vote after delegation active
- Constitutional articles can't be nominated for voting
- Sybil protection (only verified humans vote)
- Vote delegation can't create circular chains

### **Shadow Consensus Tests**
- Gap calculation matches manual verification
- Confidence intervals statistically accurate
- Demographic breakdowns correct
- Trend analysis detects convergence/divergence

### **Performance Tests**
- Poll creation: <500ms
- Vote recording: <200ms
- Shadow Consensus calculation: <2s (even for 100k votes)
- Poll listing queries: <100ms
- No N+1 query issues

---

## 📊 Success Metrics

### **Adoption**
- ✅ 60%+ of users vote in governance polls within first 90 days
- ✅ Average 40%+ participation per poll
- ✅ 20%+ of users delegate votes at some point
- ✅ 10%+ voting divergence between True Self and Shadow (Shadow Consensus meaningful)

### **Economic Health**
- ✅ Governance poll costs sustainable (all tokens go to rewards)
- ✅ Participation rewards attractive (users get Gratium back)
- ✅ No whale domination (top 10 voters <20% of total weighted votes)
- ✅ 7-section system working (section multipliers average 1.0)

### **Governance Quality**
- ✅ Zero approved parameters that harm platform
- ✅ Emergency rollback never needed (preventive governance works)
- ✅ Constitutional articles maintained (core rules protected)
- ✅ Parameter changes show measurable improvement to metrics they target

### **Shadow Consensus Insights**
- ✅ Gap averages 12-18% (meaningful divergence)
- ✅ Different demographic groups show different gaps (insights reveal)
- ✅ Trends detectable (convergence/divergence over time)
- ✅ Shadow Consensus used for policy insights (not just a metric)

---

## 🚀 Build Timeline

**Week 9-10** (after Module 05: Token Exchange is complete)

### **Day 1-2: Database Setup**
- Create 7 tables with indexes
- Initialize constitutional articles
- Set up parameter whitelist with defaults
- Seed governance rewards pool

### **Day 3-4: Core Logic**
- Poll creation with cost enforcement
- Dual voting system (True Self + Shadow)
- 7-section assignment and multiplier calculation
- Vote recording and deduplication

### **Day 5-6: Shadow Consensus**
- Gap calculation algorithm
- Confidence interval computation
- Demographic breakdown analysis
- Trend detection (converging/diverging)

### **Day 7-8: Advanced Features**
- Vote delegation system
- Emergency rollback protocol
- Parameter update execution
- Arweave integration setup

### **Day 9-10: API & Testing**
- Build 6 REST endpoints
- Unit tests for all calculations
- Integration tests for full flow
- Security tests for vote integrity
- Performance tests at scale

**Deliverable**: Complete governance system with dual voting, Shadow Consensus, and community decision-making capability!

---

## 🔗 Integration with Other Modules

### **Module 01 (Identity)** - Uses
- Separate True Self and Shadow DIDs
- Identity mode switching for voting
- DualityToken linkage stays private

### **Module 04 (Economy)** - Uses
- PollCoin for poll creation cost
- Gratium for staking on outcomes
- Light Score affects voting eligibility
- Governance rewards distributed

### **Module 05 (Token Exchange)** - Provides To
- Users need PollCoin to create polls
- Parameter changes can affect token economy

### **Module 07 (Content)** - Integrates With
- Governance polls appear in content feed
- Poll discussions happen in comments

### **Module 11 (Neural Pollinator)** - Integrates With
- Governance polls are special Thought Seeds
- Constitutional Convention runs as Thought Chambers

### **Module 12 (Keystone)** - Provides To
- Governance decisions tracked as part of 7-pillar journey
- Constitutional milestones recorded

### **Module 13 (Pentos)** - Integrates With
- Explains governance concepts to users
- Guides through voting process
- Explains Shadow Consensus gap

### **Module 20 (Arweave)** - Provides To
- All governance votes recorded permanently
- Shadow Consensus analysis archived
- Governance decisions immutable

---

## ⚠️ Critical Reminders

1. **Dual voting is the feature** - True Self and Shadow voting separately is what makes this unique
2. **7-section multipliers prevent whales** - Random assignment each cycle prevents gaming
3. **Shadow Consensus is the insight** - The gap between public/private is the real value
4. **Parameter whitelist is conservative** - Only expand with Constitutional Convention approval
5. **Constitutional articles are inviolable** - Core rules can't be voted away
6. **Emergency rollback is real** - Bad governance decisions can be quickly reverted
7. **Equal voting weight, not wealth** - No one votes with more power based on tokens held
8. **Spot-only alignment is key** - Token holders can't short coin, so they govern for platform success

---

## 📚 Additional Documentation

- **Shadow Consensus Algorithm**: `docs/SHADOW_CONSENSUS.md`
- **Parameter Whitelist Expansion Guide**: `docs/PARAMETER_GOVERNANCE_EXPANSION.md`
- **Constitutional Articles**: `docs/CONSTITUTIONAL_FOUNDATION.md`
- **Governance Security Playbook**: `docs/GOVERNANCE_SECURITY.md`
- **Emergency Rollback Procedures**: `docs/EMERGENCY_ROLLBACK.md`

---

**Module 06 Status**: ✅ Design Complete - Ready for Week 9-10 Implementation

**Previous Module**: Module 05 (Token Exchange) - Ready to Build  
**Next Module**: Module 07 (Content) - Posts, Discussions, Comments System
