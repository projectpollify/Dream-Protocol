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

### **Vote Privacy Protection: Timing Jitter**

To prevent correlation attacks based on voting patterns, the system adds random timing delays:

```
TIMING JITTER FOR PRIVACY
════════════════════════════════════════════

PROBLEM: Correlation Attack via Timing

If Alice votes as True Self at 10:00:00 AM
and as Shadow at 10:00:03 AM (3 seconds later),
an attacker could correlate these two votes and
infer they're the same person.

SOLUTION: Random Time Display Jitter

When user votes:
1. Record actual_vote_time internally (precise)
2. Add random jitter: 0-7200 seconds (0-2 hours)
3. Display displayed_vote_time publicly

Example:
Alice votes True Self at 10:00:00 AM
- Actual time: 10:00:00
- Jitter: +2,847 seconds (47 minutes)
- Displayed: 10:47:00

Alice votes Shadow at 10:00:03 AM
- Actual time: 10:00:03
- Jitter: +4,192 seconds (69 minutes)
- Displayed: 11:09:00

Public sees:
- True Self vote: 10:47 AM
- Shadow vote: 11:09 AM
- Gap: 22 minutes (looks unrelated)

════════════════════════════════════════════

TIMING JITTER IMPLEMENTATION:

When vote is recorded:
1. actual_vote_time = NOW() -- Real timestamp
2. jitter_seconds = RANDOM(0, 7200) -- 0 to 2 hours
3. displayed_vote_time = actual_vote_time + jitter_seconds
4. timing_jitter_seconds = jitter_seconds

Public API returns displayed_vote_time only.
Internal analytics use actual_vote_time.

════════════════════════════════════════════

JITTER RANGE RATIONALE:

0-2 hours chosen because:
- Large enough to break correlation patterns
- Small enough to still show voting trends
- Doesn't affect final results (just display timing)

For 7-day poll:
- 2-hour jitter is ~1.2% of total duration
- Negligible for outcome
- Significant for privacy

════════════════════════════════════════════

WHAT'S VISIBLE TO PUBLIC:

✓ Displayed vote time (with jitter)
✓ Voter DID (pseudonymous)
✓ Vote option (YES/NO/ABSTAIN)
✓ Section assignment
✓ Optional reasoning

✗ Actual vote time (private)
✗ Jitter amount (private)
✗ User ID (private)
✗ Link between True Self and Shadow (private)

════════════════════════════════════════════

CORRELATION ATTACK SCENARIOS:

Scenario 1: Same-second voting
Alice votes both identities at 10:00:00
- Without jitter: Both show 10:00:00 (LINKED!)
- With jitter: Show 10:23 and 11:14 (unrelated)

Scenario 2: Sequential voting pattern
Alice always votes True Self then Shadow 1 minute later
- Without jitter: Consistent 1-min gap (pattern!)
- With jitter: Random gaps (no pattern)

Scenario 3: Batch correlation
Attacker analyzes 100 polls to find voting pairs
- Without jitter: Statistical correlation possible
- With jitter: Correlation breaks down

════════════════════════════════════════════

INTERNAL VS PUBLIC TIMING:

INTERNAL (admin/analytics):
- Use actual_vote_time for accurate metrics
- Calculate true participation rates
- Analyze real voting patterns
- Generate platform health reports

PUBLIC (API/UI):
- Use displayed_vote_time for display
- Show jittered timestamps
- Preserve privacy
- Prevent correlation attacks

════════════════════════════════════════════

EDGE CASES:

Poll closing:
- Votes recorded at 23:59:59 (last second)
- Jitter might push displayed time past poll close
- Solution: Cap displayed_time at poll_end_at

Vote ordering:
- Displayed times might show votes "out of order"
- Vote #42 displays before Vote #41 due to jitter
- This is expected and acceptable (privacy > chronology)

Results calculation:
- Use actual_vote_time for all calculations
- Displayed time is ONLY for public display
- Results accuracy unaffected
```

**Why Timing Jitter Matters**:
- Prevents linking True Self and Shadow votes via timing correlation
- Protects against pattern analysis across multiple polls
- Maintains chronological context (still shows when votes happened)
- Zero impact on governance outcomes (display-only)

**Alternative Approaches Rejected**:
- ❌ Hide voting times completely (loses valuable trend data)
- ❌ Batch display all votes together (delays user feedback)
- ❌ Fixed delay (predictable, still allows correlation)
- ✅ Random jitter (unpredictable, breaks correlation, preserves trends)

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

Section 1: 400 votes × 0.8x (random) = 320,000 weighted (400 × 1000 × 0.8)
Section 2: 450 votes × 1.2x (random) = 540,000 weighted (450 × 1000 × 1.2)
Section 3: 380 votes × 0.9x (random) = 342,000 weighted (380 × 1000 × 0.9)
Section 4: 420 votes × 1.5x (random) = 630,000 weighted (420 × 1000 × 1.5)
Section 5: 390 votes × 1.0x (random) = 390,000 weighted (390 × 1000 × 1.0)
Section 6: 360 votes × 0.7x (random) = 252,000 weighted (360 × 1000 × 0.7)
Section 7: 200 votes × 1.1x (random) = 220,000 weighted (200 × 1000 × 1.1)

FINAL WEIGHTED TOTALS:
──────────────────────────────────────────────
YES: 2,694,000 weighted votes (divide by 1000 for display: 2,694)
NO: 770,000 weighted votes (divide by 1000 for display: 770)

RESULT: 77.7% YES (2,694,000 / 3,464,000)
CONFIDENCE: 77% ± 3% (Shadow Consensus)

NOTE: Base weight is 1000 to preserve decimal multipliers in integer math.
Display to users by dividing final weights by 1000.
```

**Why This Works**:
- Whale can't dominate single section with all votes
- Must spread voting power across sections
- Random multipliers each cycle prevent gaming
- Smaller holders' votes matter more on average

---

### **Section Assignment Algorithm**

Each vote is assigned to one of 7 sections with a random multiplier. The assignment is deterministic but unpredictable:

```
SECTION ASSIGNMENT ALGORITHM
════════════════════════════════════════════

GOAL: Assign each voter to a section (1-7) deterministically
but unpredictably, preventing strategic gaming.

ALGORITHM:

Step 1: Generate Deterministic Hash
hash_input = user_id + poll_id + poll_start_timestamp + identity_mode
hash_value = SHA256(hash_input)

Step 2: Convert Hash to Section Number
section_number = (hash_value % 7) + 1
// Result: Integer between 1 and 7

Step 3: Assign Section Multiplier
Each poll has pre-generated random multipliers for each section:
- Generated when poll is created (not when user votes)
- Random float between 0.7 and 1.5
- Same multipliers for all voters in that poll
- Example: Section 1 = 0.8x, Section 2 = 1.2x, etc.

Step 4: Record Assignment
governance_votes.assigned_section = section_number
governance_votes.section_multiplier = poll_sections[section_number]

════════════════════════════════════════════

EXAMPLE:

Poll Created at: 2025-02-15 12:00:00 UTC
Poll ID: "abc123-def456-ghi789"

Poll Section Multipliers (generated at creation):
Section 1: 0.8x
Section 2: 1.2x
Section 3: 0.9x
Section 4: 1.5x
Section 5: 1.0x
Section 6: 0.7x
Section 7: 1.1x

User Alice (ID: user_001) votes as True Self:
hash_input = "user_001" + "abc123-def456-ghi789" + "2025-02-15T12:00:00Z" + "true_self"
hash_value = SHA256(hash_input) = 0x3F2A8B... (very large number)
section = (hash_value % 7) + 1 = 4
multiplier = poll_sections[4] = 1.5x
Alice's True Self vote weight = 1000 × 1.5 = 1500

User Alice votes as Shadow:
hash_input = "user_001" + "abc123-def456-ghi789" + "2025-02-15T12:00:00Z" + "shadow"
hash_value = SHA256(hash_input) = 0x7D4C1E... (different number)
section = (hash_value % 7) + 1 = 2
multiplier = poll_sections[2] = 1.2x
Alice's Shadow vote weight = 1000 × 1.2 = 1200

════════════════════════════════════════════

KEY PROPERTIES:

1. DETERMINISTIC:
   - Same user + poll + identity always gets same section
   - Can recalculate section assignment any time
   - No need to store assignment logic (just store result)

2. UNPREDICTABLE:
   - User can't predict their section before poll is created
   - Can't choose poll ID or start timestamp
   - Hash function makes prediction computationally infeasible

3. GAMING-RESISTANT:
   - User learns their section only AFTER voting
   - Can't vote, check section, then change vote strategically
   - Can't create multiple identities to cherry-pick sections
     (Proof of Humanity prevents Sybil attacks)

4. FAIR DISTRIBUTION:
   - Over many polls, each user gets ~14.3% in each section
   - Averages out to 1.0x multiplier over time
   - No systematic advantage to any user

5. TRUE SELF ≠ SHADOW SECTION:
   - Same user's two identities almost always in different sections
   - identity_mode changes hash, changes section
   - Prevents correlation attacks

════════════════════════════════════════════

POLL MULTIPLIER GENERATION (when poll is created):

for section in 1..7:
    multiplier = random_float(0.7, 1.5)
    poll_sections[section] = multiplier

Store in poll metadata or separate table.

Example storage (JSON column in governance_polls):
section_multipliers = {
    "1": 0.8,
    "2": 1.2,
    "3": 0.9,
    "4": 1.5,
    "5": 1.0,
    "6": 0.7,
    "7": 1.1
}

════════════════════════════════════════════

ANTI-GAMING MECHANISMS:

Scenario 1: Whale tries to vote many times to land in best section
Defense: Proof of Humanity (one vote per verified human)

Scenario 2: Whale sees section assignment, decides not to vote
Defense: Doesn't matter - still one vote max

Scenario 3: Whale tries to predict section before voting
Defense: Hash is unpredictable without knowing exact poll_start_timestamp

Scenario 4: Whale splits tokens across multiple accounts
Defense: One vote per account (voting weight = 1, not token-weighted)
           Spreading across accounts doesn't increase voting power

════════════════════════════════════════════

IMPLEMENTATION NOTES:

1. Section assignment happens when vote is cast (not when poll is created)
2. Multipliers are generated when poll is created (before any votes)
3. User sees their assigned section after vote is recorded
4. Display to user: "Your vote has 1.2x multiplier (Section 2)"
5. Total weighted votes calculated by summing all final_vote_weight values
```

**Why This Algorithm**:
- **Deterministic**: Same input always produces same output (reproducible)
- **Unpredictable**: User can't game the system by predicting section
- **Fair**: Averages to 1.0x multiplier over many polls
- **Simple**: Easy to implement and understand
- **Secure**: Resistant to strategic manipulation

---

### **Quorum Requirements**

To prevent low-participation governance attacks, every poll requires minimum participation:

```
QUORUM ENFORCEMENT MODELS
════════════════════════════════════════════

Model 1: ABSOLUTE (fixed number)
- Minimum: 1,000 votes required
- Example: Poll needs 1,000+ votes to pass
- Use case: Early platform (small user base)

Model 2: PERCENTAGE (relative to verified users)
- Minimum: 5% of verified users
- Example: If 50,000 verified users, need 2,500 votes
- Use case: Mature platform (scales with growth)

Model 3: EITHER (flexible)
- Requirement: 1,000 votes OR 5% of verified users
- Example: Whichever threshold is met first
- Use case: Transition period (Year 1-3)

════════════════════════════════════════════

QUORUM CALCULATION (votes, not weighted votes):
- Count unique voters (user_id + identity_mode pairs)
- True Self vote = 1 participant
- Shadow vote = 1 participant (same user, different identity)
- User voting both ways = 2 participants toward quorum

POLL STATUS WITH QUORUM:
┌─────────────────────────────────────────┐
│ Poll Results: 1,850 YES vs 1,330 NO     │
│ Total Voters: 3,180 unique votes        │
│ Quorum Required: 1,000 votes            │
│ Quorum Met: ✓ YES (3,180 > 1,000)      │
│ Approval: 58% YES (> 50% required)      │
│ STATUS: APPROVED ✓                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Poll Results: 380 YES vs 150 NO         │
│ Total Voters: 530 unique votes          │
│ Quorum Required: 1,000 votes            │
│ Quorum Met: ✗ NO (530 < 1,000)         │
│ Approval: 71% YES (> 50% required)      │
│ STATUS: REJECTED (quorum not met) ✗     │
└─────────────────────────────────────────┘
```

**Why Quorum Matters**:
- Prevents governance attacks with low participation
- Ensures broad community input on decisions
- Protects against coordinated minority takeover
- Scales with platform growth (percentage model)

**Quorum Exceptions**:
- Emergency rollback votes: 50% lower quorum (fast response needed)
- Constitutional amendments: 200% higher quorum (critical decisions)
- General community polls: Standard quorum
- Parameter votes: Standard quorum

---

### **Delegation System & Chain Prevention**

Users can delegate voting power, but strict rules prevent manipulation:

```
DELEGATION RULES
════════════════════════════════════════════

ALLOWED:
✓ Alice delegates True Self → Bob's True Self
✓ Alice delegates Shadow → Carol's Shadow
✓ Alice delegates True Self → Bob, Shadow → Carol (split)
✓ Alice can revoke delegation anytime
✓ Alice can vote manually (overrides delegation for that poll)

NOT ALLOWED:
✗ Alice delegates → Bob, Bob delegates → Carol (CHAIN BLOCKED)
✗ Alice delegates True Self AND Shadow → same person (identity leak risk)
✗ Alice delegates to herself (self-delegation)
✗ Circular delegations (A→B→A)

════════════════════════════════════════════

DELEGATION CHAIN PREVENTION LOGIC:

User A wants to delegate to User B:
1. Check: Is B currently delegating to anyone else?
   - YES → BLOCK delegation (would create A→B→C chain)
   - NO → ALLOW delegation

Example (BLOCKED):
┌──────────────────────────────────────────┐
│ Bob has delegated to Carol (B→C)         │
│ Alice tries to delegate to Bob (A→B)     │
│ Result: Would create A→B→C chain         │
│ Action: BLOCK Alice's delegation         │
│ Error: "User has already delegated their │
│         voting power. Chains not allowed."│
└──────────────────────────────────────────┘

Example (ALLOWED):
┌──────────────────────────────────────────┐
│ Bob has NOT delegated to anyone           │
│ Alice delegates to Bob (A→B)             │
│ Result: Simple one-hop delegation        │
│ Action: ALLOW delegation                 │
└──────────────────────────────────────────┘

════════════════════════════════════════════

DELEGATION TYPES:

1. ALL_GOVERNANCE
   - Delegate all governance votes
   - Until revoked or expiration
   - Can still vote manually on specific polls

2. PARAMETER_VOTES_ONLY
   - Only parameter change votes
   - Constitutional/emergency votes still manual
   - More conservative delegation

3. SPECIFIC_POLL
   - Single poll delegation
   - Auto-expires when poll closes
   - Useful for one-time expertise trust

════════════════════════════════════════════

DUAL IDENTITY DELEGATION CONFLICT PREVENTION:

PROBLEM: If Alice delegates BOTH True Self and Shadow to Bob,
Bob could infer they're the same person (privacy leak).

SOLUTION: System WARNS but ALLOWS (user choice):
┌──────────────────────────────────────────┐
│ ⚠️  WARNING: Privacy Risk Detected       │
│                                           │
│ You're delegating both True Self and     │
│ Shadow voting power to the same person.  │
│                                           │
│ This may allow them to infer your True   │
│ Self and Shadow are linked.              │
│                                           │
│ Recommendation: Delegate to different    │
│ people or keep one identity for manual   │
│ voting.                                  │
│                                           │
│ [Cancel] [Delegate Anyway]               │
└──────────────────────────────────────────┘
```

**Why Chain Prevention Matters**:
- Prevents power concentration (A→B→C means C controls A+B+C votes)
- Maintains accountability (Bob knows Alice trusts him directly)
- Simplifies delegation tracking (no recursive lookups)
- Prevents delegation attacks (can't build voting cartels)

**Delegation Override**:
Even with active delegation, users can vote manually on any specific poll:
- Manual vote > Delegation for that poll
- Delegation remains active for other polls
- No need to revoke/re-delegate

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

    -- Section Multipliers (generated at poll creation)
    section_multipliers JSONB DEFAULT '{"1":1.0,"2":1.0,"3":1.0,"4":1.0,"5":1.0,"6":1.0,"7":1.0}'::jsonb,
    -- Example: {"1": 0.8, "2": 1.2, "3": 0.9, "4": 1.5, "5": 1.0, "6": 0.7, "7": 1.1}
    
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

    -- Quorum Requirements
    minimum_vote_quorum INT DEFAULT 1000, -- Minimum votes needed
    quorum_as_percentage_of_verified DECIMAL(5,2) DEFAULT 5.0, -- OR: % of verified users
    quorum_met BOOLEAN DEFAULT FALSE, -- Calculated when poll closes
    total_unique_voters INT DEFAULT 0, -- Count of unique users who voted
    
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
    
    -- Weighted Voting (base is 1000 to preserve decimal multipliers)
    base_vote_weight BIGINT DEFAULT 1000,
    final_vote_weight BIGINT GENERATED ALWAYS AS (
        CAST(base_vote_weight * section_multiplier AS BIGINT)
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

    -- Vote Privacy Protection (timing jitter)
    actual_vote_time TIMESTAMPTZ DEFAULT NOW(), -- Real time user voted
    displayed_vote_time TIMESTAMPTZ, -- Time shown publicly (with jitter)
    timing_jitter_seconds INT, -- Random delay applied (0-7200 seconds = 0-2 hours)

    -- Vote Changes
    vote_change_count INT DEFAULT 0, -- Track how many times vote changed
    max_vote_changes INT DEFAULT 5, -- Maximum changes allowed

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
    ),

    -- Prevent delegation chains (A→B→C not allowed)
    CONSTRAINT no_delegation_chains CHECK (
        delegated_to_user_id NOT IN (
            SELECT delegating_user_id
            FROM governance_delegations gd2
            WHERE gd2.status = 'active'
            AND gd2.delegating_identity_mode = governance_delegations.delegated_to_identity_mode
        )
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

    -- Quorum Rules
    minimum_vote_quorum INT DEFAULT 1000, -- Absolute minimum votes
    quorum_percentage_of_verified DECIMAL(5,2) DEFAULT 5.0, -- OR: % of verified users
    quorum_enforcement VARCHAR(20) DEFAULT 'absolute' CHECK (quorum_enforcement IN (
        'absolute',   -- Use minimum_vote_quorum
        'percentage', -- Use quorum_percentage_of_verified
        'either'      -- Whichever is met first
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
    rollback_window_expires_at TIMESTAMPTZ, -- Calculated from executed_at + rollback_window_hours
    rollback_count_for_parameter INT DEFAULT 0, -- Track rollbacks per parameter
    parameter_frozen_until TIMESTAMPTZ, -- If 3+ rollbacks, freeze parameter

    -- Rollback Authority Tracking
    rollback_initiated_by_user_id UUID REFERENCES users(id),
    rollback_initiation_type VARCHAR(30) CHECK (rollback_initiation_type IN (
        'founder_unilateral',    -- Founder used token
        'verified_user_petition', -- 100+ users petitioned
        'automatic_trigger'       -- System detected issue
    )),
    founder_rollback_tokens_remaining INT, -- Track founder's remaining tokens
    
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

### **Table 8: `governance_stakes`**
Track Gratium staking on poll outcomes:

```sql
CREATE TABLE governance_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stake Details
    governance_poll_id UUID REFERENCES governance_polls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,

    -- Staker DID (pseudonymous)
    staker_did VARCHAR(100) NOT NULL,

    -- Stake Position
    staked_position VARCHAR(10) NOT NULL CHECK (staked_position IN ('yes', 'no')),
    gratium_amount BIGINT NOT NULL CHECK (gratium_amount > 0),

    -- Stake Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',      -- Stake locked until poll closes
        'won',         -- Staker's position won
        'lost',        -- Staker's position lost
        'refunded',    -- Poll cancelled/invalid
        'slashed'      -- Stake lost (if applicable)
    )),

    -- Rewards
    reward_multiplier DECIMAL(4,2) DEFAULT 1.5, -- Winners get 1.5x their stake
    gratium_reward BIGINT DEFAULT 0, -- Calculated when poll closes
    reward_paid_at TIMESTAMPTZ,

    -- Risk & Confidence
    confidence_level VARCHAR(20) CHECK (confidence_level IN (
        'low',    -- Staked <100 Gratium
        'medium', -- Staked 100-1000 Gratium
        'high',   -- Staked 1000-10000 Gratium
        'extreme' -- Staked >10000 Gratium
    )),

    -- Metadata
    reasoning_text TEXT, -- Why staking on this position?
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
```

---

### **Table 9: `governance_stake_pools`**
Track total stake pools per poll:

```sql
CREATE TABLE governance_stake_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    governance_poll_id UUID REFERENCES governance_polls(id) ON DELETE CASCADE UNIQUE NOT NULL,

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
        'open',       -- Accepting stakes
        'closed',     -- Poll closed, calculating rewards
        'distributed', -- Rewards paid out
        'refunded'    -- Poll cancelled
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
```

---

## 💰 Gratium Staking Mechanics

### **Purpose**
Allow users to "put skin in the game" by staking Gratium on poll outcomes. Winners earn rewards, losers lose their stake (redistributed to winners).

```
GRATIUM STAKING ON GOVERNANCE POLLS
════════════════════════════════════════════

CONCEPT: Prediction Market for Governance Outcomes

Users can stake Gratium tokens on YES or NO:
- If your position wins, earn 1.5x your stake
- If your position loses, lose your stake (goes to winners)
- Creates financial incentive to vote thoughtfully

════════════════════════════════════════════

EXAMPLE: Poll "Increase poll cost to 600 PollCoin?"

STAKE POOL STATUS (During Voting):
┌─────────────────────────────────────────┐
│ YES Stakes: 50,000 Gratium (120 stakers)│
│ NO Stakes: 30,000 Gratium (80 stakers)  │
│ Total Pool: 80,000 Gratium              │
│ Status: Open (accepting stakes)         │
└─────────────────────────────────────────┘

POLL CLOSES:
Final Result: 58% YES, 42% NO
Winner: YES position wins

REWARD DISTRIBUTION:
┌─────────────────────────────────────────┐
│ YES STAKERS (Winners):                   │
│ - Return: 50,000 Gratium (original)    │
│ - Reward: 30,000 Gratium (from losers) │
│ - Total: 80,000 Gratium                │
│ - Effective gain: 1.6x (60% profit)    │
│                                          │
│ NO STAKERS (Losers):                    │
│ - Lost: 30,000 Gratium (redistributed) │
│ - Return: 0 Gratium                     │
│ - Effective loss: -100%                 │
└─────────────────────────────────────────┘

INDIVIDUAL STAKER EXAMPLE:
Alice staked 1,000 Gratium on YES:
- Pool share: 1,000 / 50,000 = 2% of YES pool
- Her reward: 2% of 80,000 total = 1,600 Gratium
- Net profit: 600 Gratium (+60%)

Bob staked 500 Gratium on NO:
- Lost: 500 Gratium (went to YES stakers)
- Return: 0 Gratium
- Net loss: -500 Gratium (-100%)

════════════════════════════════════════════

STAKING RULES:

1. WHEN TO STAKE:
   - Anytime during voting period
   - Stakes lock until poll closes
   - Cannot withdraw early (commitment)

2. MINIMUM STAKE:
   - 10 Gratium minimum
   - No maximum (stake as much as you want)

3. DUAL IDENTITY STAKING:
   - True Self can stake on one position
   - Shadow can stake on different position
   - Example: Hedge your bets (True Self YES, Shadow NO)

4. STAKE + VOTE INDEPENDENCE:
   - Can stake without voting
   - Can vote without staking
   - Most users do both (vote + stake on same position)

5. REWARD CALCULATION:
   Formula:
   - Total pool = YES stakes + NO stakes
   - Winners split entire pool proportionally
   - Your share = (your stake / total winning stakes) × total pool

6. EDGE CASES:
   - Poll cancelled: All stakes refunded
   - Quorum not met: All stakes refunded
   - Exact tie (50/50): All stakes refunded
   - Poll rolled back: Stakes refunded

════════════════════════════════════════════

CONFIDENCE LEVELS (Risk Categories):

LOW (< 100 Gratium):
- Small bet, testing the waters
- Low risk, low reward
- Beginner-friendly

MEDIUM (100-1,000 Gratium):
- Moderate conviction
- Reasonable risk/reward
- Most common stake size

HIGH (1,000-10,000 Gratium):
- Strong conviction
- Significant capital at risk
- Serious governance participant

EXTREME (> 10,000 Gratium):
- Absolute certainty
- Whale-level stake
- Major influence if correct

════════════════════════════════════════════

STAKING STATISTICS (Displayed to Users):

Poll Dashboard Shows:
┌─────────────────────────────────────────┐
│ Stake Pool Analysis                     │
│                                          │
│ YES Stakes: 50,000 Gratium (120 users)  │
│ NO Stakes: 30,000 Gratium (80 users)    │
│                                          │
│ If YES wins, you earn: 1.6x your stake │
│ If NO wins, you earn: 2.67x your stake │
│                                          │
│ Pool Ratio: 62.5% YES vs 37.5% NO      │
│ Voting Ratio: 58% YES vs 42% NO        │
│ Gap: Stakers more confident in YES      │
└─────────────────────────────────────────┘

KEY INSIGHT: Compare stake ratio vs. vote ratio
- If aligned: Confidence matches voting
- If divergent: Stakers have different conviction than voters
```

**Why Staking Matters**:
1. **Financial Accountability**: Voters put money where their mouth is
2. **Information Signal**: Stake ratios reveal confidence levels
3. **Economic Incentive**: Rewards careful analysis over impulsive voting
4. **Conviction Measurement**: See who's willing to risk capital
5. **Skin in the Game**: Creates alignment between voters and outcomes

**Staking vs. Voting**:
- **Voting**: Free, everyone has equal weight, determines outcome
- **Staking**: Costs Gratium, proportional to stake, rewards prediction accuracy
- **Both Together**: Ideal behavior (vote + stake on same position)

**Anti-Manipulation**:
- Can't stake after seeing vote results (pool closes with poll)
- 7-section multipliers apply to votes, not stakes (whales can't dominate voting)
- Stake rewards proportional (not winner-take-all)
- Thalyra monitors for coordinated staking attacks

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

### **Vote Changing Logic**

Users can change their votes during the voting period:

```
VOTE CHANGING MECHANICS
════════════════════════════════════════════

WHEN ALLOWED:
- Any time during active voting period
- Before poll closes
- For both True Self and Shadow independently

WHEN NOT ALLOWED:
- After poll closes
- After delegation is active for that poll
- During vote tallying (brief window)

════════════════════════════════════════════

DATABASE IMPLEMENTATION:

Option 1: REPLACE (Recommended)
- UPDATE existing governance_votes record
- Keep same vote_id
- Update vote_option, reasoning_text, updated_at
- No history of previous vote (clean)
- Simple, efficient

SQL:
UPDATE governance_votes
SET vote_option = 'no',
    reasoning_text = 'Changed my mind after discussion',
    updated_at = NOW()
WHERE poll_id = $1
  AND user_id = $2
  AND identity_mode = $3;

Option 2: VERSIONING (Alternative)
- Keep vote history (v1, v2, v3)
- Add vote_version column
- Mark old votes as superseded
- More complex, but preserves history

(NOT RECOMMENDED for governance - privacy concern)

════════════════════════════════════════════

VOTE CHANGE WORKFLOW:

Step 1: User clicks "Change Vote"
┌─────────────────────────────────────────┐
│ Your Current Vote                        │
│ Position: YES                           │
│ Section: 4 (1.5x multiplier)           │
│ Reasoning: "Security matters"           │
│                                          │
│ [Change Vote]                           │
└─────────────────────────────────────────┘

Step 2: User selects new vote
┌─────────────────────────────────────────┐
│ Change Your Vote                         │
│ ◉ YES                                   │
│ ◯ NO                                    │
│ ◯ ABSTAIN                               │
│                                          │
│ Updated Reasoning:                      │
│ [Changed after reading counterarguments]│
│                                          │
│ [Confirm Change] [Cancel]               │
└─────────────────────────────────────────┘

Step 3: System updates vote
- Replace vote_option in governance_votes
- Keep same section assignment (section doesn't change)
- Keep same multiplier (multiplier doesn't change)
- Update reasoning_text
- Update updated_at timestamp
- Recalculate poll totals

Step 4: User confirmation
┌─────────────────────────────────────────┐
│ ✓ Vote Updated                          │
│ Your new vote: NO                       │
│ Section: 4 (1.5x multiplier unchanged) │
│ Poll totals updated                     │
└─────────────────────────────────────────┘

════════════════════════════════════════════

IMPORTANT: SECTION DOESN'T CHANGE

User's section assignment is deterministic:
- Based on: hash(user_id + poll_id + poll_start + identity_mode)
- Same inputs = same section
- Changing vote doesn't change section
- Multiplier stays the same

Example:
Alice votes YES in Section 4 (1.5x)
Alice changes to NO in Section 4 (1.5x)
- Section unchanged
- Multiplier unchanged
- Only vote_option changes

════════════════════════════════════════════

VOTE TOTALS RECALCULATION:

When vote changes from YES to NO:
1. Decrement total_yes_votes by 1
2. Increment total_no_votes by 1
3. Subtract vote's final_vote_weight from total_yes_weighted
4. Add vote's final_vote_weight to total_no_weighted
5. Update shadow_consensus_snapshots (if applicable)

Trigger or cron job handles this automatically.

════════════════════════════════════════════

DELEGATION CONFLICTS:

If user has active delegation:
┌─────────────────────────────────────────┐
│ ⚠️  Active Delegation Detected          │
│                                          │
│ You've delegated voting power to Alice  │
│ for all governance polls.               │
│                                          │
│ Voting manually will:                   │
│ - Override delegation for THIS poll only│
│ - Keep delegation active for other polls│
│                                          │
│ [Vote Manually] [Keep Delegation]       │
└─────────────────────────────────────────┘

Manual vote > Delegation (poll-specific override)

════════════════════════════════════════════

TIMING JITTER ON VOTE CHANGE:

When vote is changed:
- actual_vote_time updated to NOW()
- New timing jitter applied (different from original)
- New displayed_vote_time calculated

This prevents correlation via "change timing":
- If Alice always changes both votes within 1 minute
- Jitter breaks this pattern
- True Self change: displayed +45 min
- Shadow change: displayed +1hr 23min

════════════════════════════════════════════

ANTI-GAMING:

Scenario: User tries to game section by changing vote
Defense: Section is deterministic, doesn't change with vote change

Scenario: User changes vote repeatedly to spam system
Defense: Rate limiting (max 5 changes per poll)

Scenario: User waits until last second to change vote
Defense: Allowed! User can change until poll closes

Scenario: Whale sees results trending, changes vote
Defense: Results not visible until poll closes
         Users see vote counts but not weighted totals
         Can't predict outcome precisely

════════════════════════════════════════════

VOTE CHANGE LIMIT:

Parameter: max_vote_changes_per_poll
Default: 5 changes per identity per poll
Rationale: Prevents spam, allows legitimate reconsideration

After 5 changes:
┌─────────────────────────────────────────┐
│ ⚠️  Vote Change Limit Reached           │
│                                          │
│ You've changed your vote 5 times.       │
│ This is the maximum allowed per poll.  │
│                                          │
│ Your current vote: NO                   │
│ This vote is final for this poll.      │
└─────────────────────────────────────────┘

Track changes:
ALTER TABLE governance_votes
ADD COLUMN vote_change_count INT DEFAULT 0;

Increment on each change.

════════════════════════════════════════════

ANALYTICS:

Track vote changes for insights:
- % of users who change votes
- Average time before changing
- Direction of changes (YES→NO vs NO→YES)
- Correlation with poll trending

Example insight:
"18% of voters changed their mind during the voting period,
with 72% switching from NO to YES after community discussion."

This data helps understand deliberation quality.
```

**Why Vote Changing Matters**:
- **Deliberation**: Users learn new information during voting period
- **Flexibility**: Allows reconsideration based on discussion
- **No Penalty**: No cost or punishment for changing mind
- **Gaming-Resistant**: Section assignment prevents manipulation

**Best Practice**:
- Vote early based on initial judgment
- Read discussions and counterarguments
- Change vote if genuinely convinced
- Don't spam changes (5 change limit)

---

### **Step 3: 7-Section Allocation**

System randomly assigns voters to sections:

```
POLL VOTE DISTRIBUTION (Example)
════════════════════════════════════════════

Section 1 (12.5%): 400 votes × 0.8x = 320,000 weighted
Section 2 (14.3%): 450 votes × 1.2x = 540,000 weighted
Section 3 (10.8%): 340 votes × 0.9x = 306,000 weighted
Section 4 (15.2%): 480 votes × 1.5x = 720,000 weighted
Section 5 (12.1%): 385 votes × 1.0x = 385,000 weighted
Section 6 (11.8%): 370 votes × 0.7x = 259,000 weighted
Section 7 (13.5%): 430 votes × 1.1x = 473,000 weighted

RESULT (displayed as votes/1000):
YES: 2,694 effective votes (77%)
NO: 770 effective votes (23%)

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

════════════════════════════════════════════

CONFIDENCE INTERVAL CALCULATION:

Formula: CI = z × √(p(1-p)/n)

Where:
- z = 1.96 (for 95% confidence level)
- p = proportion voting yes (decimal)
- n = sample size (total votes)

Example:
- Yes votes: 2,010 (67%)
- Total votes: 3,000
- p = 0.67
- n = 3,000

CI = 1.96 × √(0.67 × 0.33 / 3,000)
CI = 1.96 × √(0.2211 / 3,000)
CI = 1.96 × √0.0000737
CI = 1.96 × 0.00858
CI = 0.0168
CI = ±1.68%

Result: 67% ± 1.7% YES (rounded)

CONFIDENCE LEVELS BY SAMPLE SIZE:

n = 100 votes:
- CI = ±9.8% (very wide, low confidence)

n = 500 votes:
- CI = ±4.4% (moderate)

n = 1,000 votes:
- CI = ±3.1% (good)

n = 3,000 votes:
- CI = ±1.8% (very good)

n = 10,000 votes:
- CI = ±1.0% (excellent)

INTERPRETATION:

Tight interval (< 3%):
- High confidence in result
- Large sample size
- Result is statistically significant

Wide interval (> 5%):
- Lower confidence
- Small sample size
- Result less certain

For governance decisions:
- Minimum 1,000 votes (quorum) gives ~3% CI
- Most polls will have 1-3% confidence intervals
- Close votes (48-52%) need larger samples

════════════════════════════════════════════

SHADOW CONSENSUS GAP WITH CONFIDENCE:

Calculate CI for both True Self and Shadow separately:

True Self: 58% ± 2.3% (n=1,500)
Shadow: 76% ± 2.1% (n=1,500)

Gap: |58% - 76%| = 18 percentage points

Is gap significant?
- Yes, if gap > combined CI
- 18% > (2.3% + 2.1%) = 18% > 4.4%
- Gap is statistically significant

Not significant example:
True Self: 52% ± 3.8%
Shadow: 54% ± 3.9%
Gap: 2% < (3.8% + 3.9%) = 2% < 7.7%
- Gap might be random noise, not real divergence
```

---

### **Step 5: Execution**

If approved (>50% YES):

1. **Parameter Vote**: Governance action creates parameter update
2. **Scheduled Execution**: Waits 72 hours for rollback option
3. **Active Effect**: New parameter takes effect
4. **Logged**: Entire transaction recorded on Arweave

---

### **Step 6: Arweave Archival & Cost Management**

All governance decisions are permanently archived on Arweave:

```
ARWEAVE ARCHIVAL STRATEGY
════════════════════════════════════════════

WHAT GETS ARCHIVED:

Critical (Immediate archival):
- Constitutional amendments
- Parameter changes that execute
- Emergency rollback decisions
- Governance action completions
- Final poll results with Shadow Consensus

Standard (Batched archival every 24 hours):
- Individual votes (all votes in batch)
- Poll creation records
- Delegation changes
- Stake pool results

ARCHIVAL FREQUENCY:

Immediate (< 5 minutes):
- Constitutional polls
- Emergency rollbacks
- Parameter updates
- Critical governance actions

Batched (every 24 hours at 00:00 UTC):
- All votes cast in last 24 hours
- Non-critical poll results
- Delegation updates
- Stake records

════════════════════════════════════════════

COST MANAGEMENT STRATEGY:

AR Token Economics:
- Arweave charges per byte stored
- Governance data is text (cheap)
- Estimated cost: ~$0.01-0.10 per poll
- Annual estimate: ~$1,000-5,000 for 10,000 polls

WHO PAYS:

Year 1-3: Platform Subsidy
- Dream Protocol pays all AR costs
- Users not charged
- Builds trust and adoption
- Budgeted from treasury

Year 4-5: Hybrid Model
- Platform subsidizes 50%
- Poll creator pays 50%
- Example: Poll costs 100 PollCoin, 1% for AR storage
- Gradual transition to sustainability

Year 6+: User-Pays Model
- Poll creators pay AR costs
- Included in poll creation fee
- Governance can vote to adjust if AR price spikes
- Fully sustainable model

DYNAMIC COST ADJUSTMENT:

If AR token price spikes >5x:
- Governance can vote to reduce archival frequency
- Batch more votes per transaction
- Archive only critical decisions immediately
- Standard votes batched weekly instead of daily

If AR token price drops <20%:
- Increase archival frequency
- More granular archival
- Additional metadata archived

════════════════════════════════════════════

BATCHING STRATEGY (to reduce costs):

Daily Batch Example:
┌─────────────────────────────────────────┐
│ Batch: 2025-02-15 votes                 │
│ Votes included: 2,847 votes             │
│ Polls included: 12 active polls         │
│ Data size: ~500 KB                      │
│ AR cost: ~$0.50                         │
│ Per-vote cost: $0.00017                 │
└─────────────────────────────────────────┘

Single Vote Archival (immediate):
┌─────────────────────────────────────────┐
│ Constitutional poll closed               │
│ Votes: 8,942 votes                      │
│ Data size: ~1.2 MB                      │
│ AR cost: ~$1.20                         │
│ Archived immediately (not batched)      │
└─────────────────────────────────────────┘

BATCH FORMAT (JSON):
{
  "batch_id": "uuid",
  "batch_date": "2025-02-15",
  "platform": "Dream Protocol",
  "governance_version": "1.0",
  "votes": [
    {
      "poll_id": "uuid",
      "voter_did": "did:agoranet:abc_ts",
      "vote": "yes",
      "section": 4,
      "multiplier": 1.5,
      "timestamp": "2025-02-15T14:23:17Z",
      "reasoning": "..."
    },
    // ... 2,846 more votes
  ],
  "polls_closed": [
    {
      "poll_id": "uuid",
      "title": "...",
      "result": "approved",
      "yes_percentage": 58.2,
      "shadow_consensus_gap": 18.2,
      "final_yes": 2850,
      "final_no": 1100,
      "arweave_tx_id": "..."
    }
  ],
  "shadow_consensus_snapshots": [...]
}

════════════════════════════════════════════

RETRIEVAL & VERIFICATION:

After archival:
1. Arweave returns transaction ID
2. Store tx_id in governance_polls.arweave_tx_id
3. Users can verify data on Arweave explorer
4. Platform displays link: "View on Arweave ↗"

Verification Example:
https://viewblock.io/arweave/tx/[tx_id]

Data is permanently retrievable, immutable, verifiable.

════════════════════════════════════════════

COST PROJECTION (10-year horizon):

Year 1: 1,000 polls × $0.10 = $100
Year 2: 5,000 polls × $0.08 = $400
Year 3: 10,000 polls × $0.06 = $600
Year 4-5: Platform subsidizes 50%
Year 6+: Users pay via poll creation fee

Total 10-year cost: ~$15,000-30,000
(Manageable from treasury)

If AR price spikes:
- Governance votes to adjust archival strategy
- Move to weekly batching
- Reduce non-critical archival
- Maintain constitutional archival always

════════════════════════════════════════════

GOVERNANCE PARAMETER FOR ARCHIVAL:

Parameter: arweave_archival_frequency
Options:
- "immediate" (all votes)
- "daily_batch" (standard votes)
- "weekly_batch" (cost-saving mode)
- "critical_only" (emergency mode)

Community can vote to adjust if costs become burdensome.

════════════════════════════════════════════

WHY ARWEAVE MATTERS:

1. Immutability: Can't rewrite governance history
2. Transparency: Anyone can audit decisions
3. Permanence: Data survives platform shutdown
4. Trust: Community knows records are eternal
5. Accountability: All votes publicly verifiable
```

**Why This Strategy Works**:
- **Gradual transition**: Platform subsidizes early, users pay later
- **Flexible batching**: Adjust frequency based on costs
- **Critical-first**: Always archive important decisions
- **Governance-controlled**: Community can adjust strategy via voting
- **Sustainable**: Long-term costs manageable

---

## 🔄 Emergency Rollback Protocol

When governance decisions cause unexpected harm, the community can quickly revert them:

```
EMERGENCY ROLLBACK AUTHORITY
════════════════════════════════════════════

WHO CAN INITIATE ROLLBACK:

Tier 1: FOUNDER (Year 1-3)
- Can initiate rollback unilaterally
- Limited to first 3 years of platform
- Decreasing power: Year 1 (100%), Year 2 (66%), Year 3 (33%)
- All founder rollbacks must include public rationale

Tier 2: VERIFIED USER PETITION (All years)
- Requires 100+ verified users (PoH 70+)
- Must provide detailed harm documentation
- Creates automatic emergency vote
- 48-hour voting period (faster than normal)

Tier 3: AUTOMATIC TRIGGERS (System-detected)
- Critical bug causing financial loss
- Security vulnerability actively exploited
- Parameter change causing >20% user exodus
- Thalyra detects governance manipulation
- System automatically creates rollback proposal

════════════════════════════════════════════

ROLLBACK APPROVAL THRESHOLDS:

Standard Rollback:
- 66% supermajority required (not simple 50%)
- 50% reduced quorum (500 votes minimum)
- 48-hour voting period
- Must be within 72 hours of original execution

Constitutional Rollback:
- 75% supermajority required
- 2x normal quorum (2,000 votes minimum)
- 96-hour voting period
- Must be within 168 hours (7 days) of execution
- Requires founder approval (Year 1-5)

Emergency Security Rollback:
- Founder can execute immediately (Year 1-3)
- Community vote required within 7 days to confirm
- If community rejects founder's rollback, original decision restored
- Founder loses one rollback authority point

════════════════════════════════════════════

ROLLBACK LIMITATIONS:

Per Parameter:
- Maximum 1 rollback per parameter per 30 days
- After 3 rollbacks on same parameter, parameter frozen for 90 days
- Prevents rollback wars

Per User/Founder:
- Founder has 10 unilateral rollback tokens (Year 1-3)
- Each use depletes one token
- When tokens exhausted, must use Tier 2 (petition) process
- Encourages judicious use of power

Time Windows:
- Standard changes: 72-hour rollback window
- Constitutional changes: 7-day rollback window
- After window expires, rollback requires new governance vote
- Emergency security: No time limit (any time)

════════════════════════════════════════════

ROLLBACK EXECUTION PROCESS:

Step 1: INITIATION
┌─────────────────────────────────────────┐
│ User/Founder initiates rollback         │
│ System checks: Within time window?      │
│ System checks: Initiator has authority? │
│ System checks: Parameter not frozen?    │
│ Result: Create rollback governance poll │
└─────────────────────────────────────────┘

Step 2: VOTING
┌─────────────────────────────────────────┐
│ Emergency rollback poll created          │
│ 48-hour voting period (fast)            │
│ Reduced quorum (500 votes)              │
│ Supermajority required (66% YES)        │
│ Dual voting: True Self + Shadow         │
└─────────────────────────────────────────┘

Step 3: EXECUTION
┌─────────────────────────────────────────┐
│ Poll closes                              │
│ Result: 68% YES (>66% required)         │
│ Quorum: 620 votes (>500 required)       │
│ Action: Revert parameter immediately    │
│ Arweave: Log rollback with full context │
│ Notify: All users of rollback + reason  │
└─────────────────────────────────────────┘

Step 4: POST-ROLLBACK
┌─────────────────────────────────────────┐
│ Parameter reverted to previous value     │
│ Original governance action marked        │
│   as 'rolled_back'                      │
│ Rollback counter incremented for param  │
│ If 3rd rollback, freeze param 90 days   │
│ Governance report published             │
└─────────────────────────────────────────┘

════════════════════════════════════════════

FOUNDER ROLLBACK TOKEN DEPLETION SCHEDULE:

Year 1: 10 tokens available
- Founder has full authority
- Use for critical early corrections
- Each rollback depletes 1 token

Year 2: 6 tokens remaining (example)
- Founder still has emergency power
- Community gaining confidence
- More selective use

Year 3: 2 tokens remaining (example)
- Founder rarely intervenes
- Community handles most issues
- Reserved for true emergencies

Year 4+: 0 tokens
- Founder must use Tier 2 (petition)
- Full community governance
- Founder = regular user for rollbacks
```

**Why This Design**:
1. **Founder Protection (Early Days)**: Platform needs quick correction authority in Year 1-3
2. **Community Empowerment**: Petition path always available to community
3. **Automatic Safety**: System detects critical issues and triggers rollbacks
4. **Supermajority Requirement**: Higher bar for rollback prevents frivolous reversions
5. **Time Windows**: Prevents ancient decisions from being relitigated
6. **Token Depletion**: Founder power gradually transitions to community
7. **Rollback Limits**: Prevents parameter instability from constant changes

**Rollback vs. New Vote**:
- **Rollback**: Fast (48hrs), reduced quorum, reverts recent decision
- **New Vote**: Standard (7 days), full quorum, makes new decision
- Use rollback for harm mitigation, new vote for policy changes

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
