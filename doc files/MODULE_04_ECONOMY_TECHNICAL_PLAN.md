# 💰 Module 04: Economy - Technical Specification
## 4-Token Economic System for Dream Protocol

**Module Number**: 04 of 22  
**Build Priority**: PRIORITY 2 - Core Economy (After Module 03: User)  
**Dependencies**: Module 01 (Identity), Module 02 (Bridge), Module 03 (User)  
**Dependents**: Module 05 (Token Exchange), Module 06 (Governance), Module 08 (Social), Module 09 (Verification)  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 04 implements the complete economic system for Dream Protocol, including:
- **PollCoin** - Governance currency for voting and polls
- **Gratium** - Tipping and staking currency for creators
- **Light Score** - Reputation metric (managed by Pentos)
- **Spot-Only Strategy** - "Safe harbor for capital" positioning

### **Core Philosophy**
> "Create a manipulation-free economic zone where ALL token holders win together. No shorts. No leverage. No games. Just aligned stakeholders building civilization-scale infrastructure."

### **Key Innovation**
Separate token balances for **True Self** and **Shadow** identities, enabling dual-economy participation while maintaining privacy.

---

## 🏗️ What This Module Does

### **Primary Functions**
1. **Token Ledger Management** - Track PollCoin and Gratium balances
2. **Transaction Processing** - Transfers, tips, stakes, burns
3. **Light Score Calculation** - Reputation metric (secret algorithm via Pentos)
4. **Balance Separation** - Separate wallets for True Self vs Shadow
5. **Spot-Only Enforcement** - No lending protocol integrations
6. **Transaction History** - Complete audit trail
7. **Token Locking** - Stake tokens in governance/verification systems

### **Key Features**
- ✅ Dual balances (PollCoin + Gratium) for each identity
- ✅ Atomic transactions with rollback support
- ✅ Transaction fees (platform revenue)
- ✅ Token burning mechanics
- ✅ Staking/unstaking with cooldowns
- ✅ Light Score auto-updates based on user actions
- ✅ Complete transaction history and audit logs

---

## 💎 Token Specifications

### **PollCoin** 🗳️
**Purpose**: Governance and poll participation

| Property | Value |
|----------|-------|
| **Symbol** | POLL |
| **Decimals** | 18 |
| **Initial Supply** | 1,000,000,000 (1 billion) |
| **Max Supply** | 10,000,000,000 (10 billion) |
| **Emission Rate** | 5% annual inflation (decreasing) |
| **Use Cases** | Create polls, vote, governance proposals, stake on outcomes |
| **Burn Mechanism** | 1% of each transaction, spam prevention |

### **Gratium** 💰
**Purpose**: Tipping and staking currency

| Property | Value |
|----------|-------|
| **Symbol** | GRAT |
| **Decimals** | 18 |
| **Initial Supply** | 500,000,000 (500 million) |
| **Max Supply** | 5,000,000,000 (5 billion) |
| **Emission Rate** | 3% annual inflation (fixed) |
| **Use Cases** | Tips, stakes on truth claims, creator rewards, veracity bonds |
| **Burn Mechanism** | 0.5% of each transaction |

### **Light Score** 📊
**Purpose**: Reputation metric (NOT a token)

| Property | Value |
|----------|-------|
| **Range** | 0 - 100 |
| **Initial Value** | 50 (neutral) |
| **Calculation** | Secret algorithm (managed by Pentos) |
| **Factors** | Post quality, helpful actions, time on platform, verification status |
| **Cannot Be** | Bought, sold, transferred |
| **Used For** | Trust signals, feature unlocks, reputation display |

---

## 📊 Database Schema

### **Table 1: `token_ledger`**
Master ledger for all token balances:

```sql
CREATE TABLE token_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Token Balances (stored as bigint for precision, divide by 10^18 for display)
    pollcoin_balance BIGINT DEFAULT 0,
    gratium_balance BIGINT DEFAULT 0,
    
    -- Locked Balances (staked in governance, veracity bonds, etc.)
    pollcoin_locked BIGINT DEFAULT 0,
    gratium_locked BIGINT DEFAULT 0,
    
    -- Available Balances (balance - locked)
    pollcoin_available BIGINT GENERATED ALWAYS AS (pollcoin_balance - pollcoin_locked) STORED,
    gratium_available BIGINT GENERATED ALWAYS AS (gratium_balance - gratium_locked) STORED,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, identity_mode),
    CHECK (pollcoin_balance >= pollcoin_locked),
    CHECK (gratium_balance >= gratium_locked)
);

CREATE INDEX idx_token_ledger_user ON token_ledger(user_id);
CREATE INDEX idx_token_ledger_mode ON token_ledger(identity_mode);
CREATE INDEX idx_token_ledger_balances ON token_ledger(pollcoin_balance, gratium_balance);
```

### **Table 2: `token_transactions`**
Complete transaction history:

```sql
CREATE TABLE token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction Details
    transaction_type VARCHAR(30) CHECK (transaction_type IN (
        'transfer', 'tip', 'stake', 'unstake', 'burn', 
        'reward', 'purchase', 'poll_creation', 'vote_cost', 
        'veracity_bond', 'prediction_market'
    )) NOT NULL,
    
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    amount BIGINT NOT NULL, -- In smallest unit (wei equivalent)
    
    -- Parties
    from_user_id UUID REFERENCES users(id),
    from_identity_mode VARCHAR(10) CHECK (from_identity_mode IN ('true_self', 'shadow')),
    to_user_id UUID REFERENCES users(id),
    to_identity_mode VARCHAR(10) CHECK (to_identity_mode IN ('true_self', 'shadow')),
    
    -- Transaction Fees
    fee_amount BIGINT DEFAULT 0,
    burn_amount BIGINT DEFAULT 0,
    
    -- Context
    reference_type VARCHAR(50), -- 'poll', 'post', 'comment', 'verification', etc.
    reference_id UUID, -- ID of the thing being transacted on
    memo TEXT, -- Optional message
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'failed', 'reversed'
    )),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Blockchain Integration (future)
    blockchain_tx_hash VARCHAR(66), -- For Cardano integration
    blockchain_confirmed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_token_tx_from_user ON token_transactions(from_user_id, from_identity_mode);
CREATE INDEX idx_token_tx_to_user ON token_transactions(to_user_id, to_identity_mode);
CREATE INDEX idx_token_tx_type ON token_transactions(transaction_type);
CREATE INDEX idx_token_tx_reference ON token_transactions(reference_type, reference_id);
CREATE INDEX idx_token_tx_created ON token_transactions(created_at DESC);
CREATE INDEX idx_token_tx_status ON token_transactions(status);
```

### **Table 3: `token_locks`**
Track locked tokens (stakes, bonds, escrow):

```sql
CREATE TABLE token_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Lock Details
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    amount BIGINT NOT NULL,
    
    -- Lock Context
    lock_type VARCHAR(30) CHECK (lock_type IN (
        'governance_stake', 'veracity_bond', 'prediction_market',
        'poll_stake', 'escrow', 'penalty', 'cooldown'
    )) NOT NULL,
    
    reference_type VARCHAR(50), -- 'poll', 'verification', 'market', etc.
    reference_id UUID,
    
    -- Lock Timing
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_at TIMESTAMPTZ, -- When tokens become available
    released_at TIMESTAMPTZ, -- When actually released
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'released', 'slashed', 'expired'
    )),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_locks_user ON token_locks(user_id, identity_mode);
CREATE INDEX idx_token_locks_type ON token_locks(lock_type);
CREATE INDEX idx_token_locks_reference ON token_locks(reference_type, reference_id);
CREATE INDEX idx_token_locks_status ON token_locks(status);
CREATE INDEX idx_token_locks_unlock ON token_locks(unlock_at) WHERE status = 'active';
```

### **Table 4: `light_scores`**
Reputation tracking (managed by Pentos):

```sql
CREATE TABLE light_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Current Score
    current_score DECIMAL(5,2) DEFAULT 50.00, -- 0-100 scale
    
    -- Score History (for trending)
    score_7d_ago DECIMAL(5,2),
    score_30d_ago DECIMAL(5,2),
    score_90d_ago DECIMAL(5,2),
    
    -- Score Trends
    trend_direction VARCHAR(10), -- 'up', 'down', 'stable'
    trend_velocity DECIMAL(5,2), -- Rate of change
    
    -- Component Breakdown (for Pentos to manage)
    quality_score DECIMAL(5,2), -- Content quality contribution
    helpfulness_score DECIMAL(5,2), -- Helping others
    consistency_score DECIMAL(5,2), -- Regular participation
    trust_score DECIMAL(5,2), -- Verification, bonds, etc.
    
    -- Metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_light_scores_user ON light_scores(user_id);
CREATE INDEX idx_light_scores_score ON light_scores(current_score DESC);
CREATE INDEX idx_light_scores_trend ON light_scores(trend_direction);
```

### **Table 5: `light_score_events`**
Audit log of actions that affect Light Score:

```sql
CREATE TABLE light_score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(50) CHECK (event_type IN (
        'post_created', 'helpful_comment', 'verification_completed',
        'governance_participation', 'bond_created', 'prediction_correct',
        'spam_detected', 'violation', 'helpful_vote', 'quality_contribution'
    )) NOT NULL,
    
    -- Impact
    score_change DECIMAL(5,2), -- How much score changed (+/-)
    old_score DECIMAL(5,2),
    new_score DECIMAL(5,2),
    
    -- Context
    reference_type VARCHAR(50),
    reference_id UUID,
    
    -- Pentos Decision
    pentos_reasoning TEXT, -- Why Pentos adjusted the score
    pentos_confidence DECIMAL(3,2), -- 0-1 scale
    
    -- Metadata
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_light_score_events_user ON light_score_events(user_id);
CREATE INDEX idx_light_score_events_type ON light_score_events(event_type);
CREATE INDEX idx_light_score_events_occurred ON light_score_events(occurred_at DESC);
```

### **Table 6: `token_supply`**
Track total supply, circulating supply, burned amounts:

```sql
CREATE TABLE token_supply (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL UNIQUE,
    
    -- Supply Metrics (in smallest unit)
    total_minted BIGINT DEFAULT 0,
    total_burned BIGINT DEFAULT 0,
    circulating_supply BIGINT GENERATED ALWAYS AS (total_minted - total_burned) STORED,
    
    -- Locked Supply (staked, bonded, etc.)
    total_locked BIGINT DEFAULT 0,
    available_supply BIGINT GENERATED ALWAYS AS (total_minted - total_burned - total_locked) STORED,
    
    -- Emission Schedule
    emission_rate DECIMAL(5,4), -- Annual inflation rate
    last_emission_at TIMESTAMPTZ,
    next_emission_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with starting supply
INSERT INTO token_supply (token_type, total_minted, emission_rate) VALUES
('pollcoin', 1000000000000000000000000000, 0.0500), -- 1 billion POLL, 5% inflation
('gratium', 500000000000000000000000000, 0.0300);   -- 500 million GRAT, 3% inflation
```

---

## 🔧 Core Functions

### **Function 1: Initialize User Balances**

```typescript
// packages/04-economy/src/services/ledger.service.ts

interface InitializeBalancesDTO {
  userId: string;
  identityMode: 'true_self' | 'shadow';
  initialPollCoin?: bigint; // Starting bonus
  initialGratium?: bigint;
}

export async function initializeUserBalances(data: InitializeBalancesDTO) {
  const { userId, identityMode, initialPollCoin, initialGratium } = data;
  
  // Create ledger entry
  const ledger = await db.token_ledger.create({
    user_id: userId,
    identity_mode: identityMode,
    pollcoin_balance: initialPollCoin || BigInt(0),
    gratium_balance: initialGratium || BigInt(0),
    pollcoin_locked: BigInt(0),
    gratium_locked: BigInt(0)
  });
  
  // Initialize Light Score
  await db.light_scores.create({
    user_id: userId,
    current_score: 50.00, // Start neutral
    quality_score: 50.00,
    helpfulness_score: 50.00,
    consistency_score: 50.00,
    trust_score: 50.00
  });
  
  // Record initial transactions if any
  if (initialPollCoin && initialPollCoin > BigInt(0)) {
    await db.token_transactions.create({
      transaction_type: 'reward',
      token_type: 'pollcoin',
      amount: initialPollCoin,
      to_user_id: userId,
      to_identity_mode: identityMode,
      status: 'completed',
      memo: 'Welcome bonus',
      completed_at: new Date()
    });
  }
  
  if (initialGratium && initialGratium > BigInt(0)) {
    await db.token_transactions.create({
      transaction_type: 'reward',
      token_type: 'gratium',
      amount: initialGratium,
      to_user_id: userId,
      to_identity_mode: identityMode,
      status: 'completed',
      memo: 'Welcome bonus',
      completed_at: new Date()
    });
  }
  
  return ledger;
}
```

### **Function 2: Transfer Tokens**

```typescript
// packages/04-economy/src/services/transfer.service.ts

interface TransferTokensDTO {
  fromUserId: string;
  fromIdentityMode: 'true_self' | 'shadow';
  toUserId: string;
  toIdentityMode: 'true_self' | 'shadow';
  tokenType: 'pollcoin' | 'gratium';
  amount: bigint;
  memo?: string;
  referenceType?: string;
  referenceId?: string;
}

export async function transferTokens(data: TransferTokensDTO) {
  const {
    fromUserId,
    fromIdentityMode,
    toUserId,
    toIdentityMode,
    tokenType,
    amount,
    memo,
    referenceType,
    referenceId
  } = data;
  
  // Start database transaction
  return await db.transaction(async (trx) => {
    
    // Get sender balance
    const senderLedger = await trx.token_ledger.findOne({
      user_id: fromUserId,
      identity_mode: fromIdentityMode
    });
    
    if (!senderLedger) {
      throw new Error('Sender ledger not found');
    }
    
    // Check available balance
    const availableBalance = tokenType === 'pollcoin' 
      ? senderLedger.pollcoin_available
      : senderLedger.gratium_available;
    
    if (BigInt(availableBalance) < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Calculate fees
    const burnRate = tokenType === 'pollcoin' ? 0.01 : 0.005; // 1% or 0.5%
    const burnAmount = BigInt(Math.floor(Number(amount) * burnRate));
    const netAmount = amount - burnAmount;
    
    // Deduct from sender
    const balanceField = tokenType === 'pollcoin' ? 'pollcoin_balance' : 'gratium_balance';
    await trx.token_ledger.update(
      { user_id: fromUserId, identity_mode: fromIdentityMode },
      {
        [balanceField]: BigInt(senderLedger[balanceField]) - amount,
        updated_at: new Date()
      }
    );
    
    // Add to receiver
    const receiverLedger = await trx.token_ledger.findOne({
      user_id: toUserId,
      identity_mode: toIdentityMode
    });
    
    if (!receiverLedger) {
      throw new Error('Receiver ledger not found');
    }
    
    await trx.token_ledger.update(
      { user_id: toUserId, identity_mode: toIdentityMode },
      {
        [balanceField]: BigInt(receiverLedger[balanceField]) + netAmount,
        updated_at: new Date()
      }
    );
    
    // Update total supply (burned tokens)
    await trx.token_supply.update(
      { token_type: tokenType },
      {
        total_burned: trx.raw(`total_burned + ${burnAmount}`),
        updated_at: new Date()
      }
    );
    
    // Record transaction
    const transaction = await trx.token_transactions.create({
      transaction_type: 'transfer',
      token_type: tokenType,
      amount: amount,
      from_user_id: fromUserId,
      from_identity_mode: fromIdentityMode,
      to_user_id: toUserId,
      to_identity_mode: toIdentityMode,
      burn_amount: burnAmount,
      memo,
      reference_type: referenceType,
      reference_id: referenceId,
      status: 'completed',
      completed_at: new Date()
    });
    
    return transaction;
  });
}
```

### **Function 3: Lock Tokens (Stake)**

```typescript
// packages/04-economy/src/services/lock.service.ts

interface LockTokensDTO {
  userId: string;
  identityMode: 'true_self' | 'shadow';
  tokenType: 'pollcoin' | 'gratium';
  amount: bigint;
  lockType: 'governance_stake' | 'veracity_bond' | 'prediction_market' | 'poll_stake';
  referenceType?: string;
  referenceId?: string;
  unlockAt?: Date; // When tokens can be released
}

export async function lockTokens(data: LockTokensDTO) {
  const {
    userId,
    identityMode,
    tokenType,
    amount,
    lockType,
    referenceType,
    referenceId,
    unlockAt
  } = data;
  
  return await db.transaction(async (trx) => {
    
    // Get current balance
    const ledger = await trx.token_ledger.findOne({
      user_id: userId,
      identity_mode: identityMode
    });
    
    if (!ledger) {
      throw new Error('Ledger not found');
    }
    
    // Check available balance
    const availableBalance = tokenType === 'pollcoin'
      ? ledger.pollcoin_available
      : ledger.gratium_available;
    
    if (BigInt(availableBalance) < amount) {
      throw new Error('Insufficient available balance');
    }
    
    // Update locked amount in ledger
    const lockedField = tokenType === 'pollcoin' ? 'pollcoin_locked' : 'gratium_locked';
    await trx.token_ledger.update(
      { user_id: userId, identity_mode: identityMode },
      {
        [lockedField]: BigInt(ledger[lockedField]) + amount,
        updated_at: new Date()
      }
    );
    
    // Create lock record
    const lock = await trx.token_locks.create({
      user_id: userId,
      identity_mode: identityMode,
      token_type: tokenType,
      amount: amount,
      lock_type: lockType,
      reference_type: referenceType,
      reference_id: referenceId,
      unlock_at: unlockAt,
      status: 'active'
    });
    
    // Update total supply locked
    await trx.token_supply.update(
      { token_type: tokenType },
      {
        total_locked: trx.raw(`total_locked + ${amount}`),
        updated_at: new Date()
      }
    );
    
    // Record transaction
    await trx.token_transactions.create({
      transaction_type: 'stake',
      token_type: tokenType,
      amount: amount,
      from_user_id: userId,
      from_identity_mode: identityMode,
      reference_type: referenceType,
      reference_id: referenceId,
      status: 'completed',
      completed_at: new Date(),
      memo: `Locked as ${lockType}`
    });
    
    return lock;
  });
}
```

### **Function 4: Release Locked Tokens**

```typescript
// packages/04-economy/src/services/lock.service.ts

export async function releaseLockedTokens(lockId: string) {
  return await db.transaction(async (trx) => {
    
    // Get lock
    const lock = await trx.token_locks.findOne({ id: lockId });
    
    if (!lock) {
      throw new Error('Lock not found');
    }
    
    if (lock.status !== 'active') {
      throw new Error('Lock is not active');
    }
    
    // Check if unlock time has passed
    if (lock.unlock_at && new Date() < lock.unlock_at) {
      throw new Error('Tokens are still locked');
    }
    
    // Update lock status
    await trx.token_locks.update(
      { id: lockId },
      {
        status: 'released',
        released_at: new Date(),
        updated_at: new Date()
      }
    );
    
    // Reduce locked amount in ledger
    const ledger = await trx.token_ledger.findOne({
      user_id: lock.user_id,
      identity_mode: lock.identity_mode
    });
    
    const lockedField = lock.token_type === 'pollcoin' ? 'pollcoin_locked' : 'gratium_locked';
    await trx.token_ledger.update(
      { user_id: lock.user_id, identity_mode: lock.identity_mode },
      {
        [lockedField]: BigInt(ledger[lockedField]) - BigInt(lock.amount),
        updated_at: new Date()
      }
    );
    
    // Update total supply locked
    await trx.token_supply.update(
      { token_type: lock.token_type },
      {
        total_locked: trx.raw(`total_locked - ${lock.amount}`),
        updated_at: new Date()
      }
    );
    
    // Record transaction
    await trx.token_transactions.create({
      transaction_type: 'unstake',
      token_type: lock.token_type,
      amount: lock.amount,
      to_user_id: lock.user_id,
      to_identity_mode: lock.identity_mode,
      reference_type: lock.reference_type,
      reference_id: lock.reference_id,
      status: 'completed',
      completed_at: new Date(),
      memo: `Released from ${lock.lock_type}`
    });
    
    return lock;
  });
}
```

### **Function 5: Update Light Score (Pentos Integration)**

```typescript
// packages/04-economy/src/services/light-score.service.ts

interface UpdateLightScoreDTO {
  userId: string;
  eventType: string;
  scoreChange: number;
  reasoning: string;
  confidence: number; // 0-1
  referenceType?: string;
  referenceId?: string;
}

export async function updateLightScore(data: UpdateLightScoreDTO) {
  const {
    userId,
    eventType,
    scoreChange,
    reasoning,
    confidence,
    referenceType,
    referenceId
  } = data;
  
  return await db.transaction(async (trx) => {
    
    // Get current score
    const currentScore = await trx.light_scores.findOne({ user_id: userId });
    
    if (!currentScore) {
      throw new Error('Light score not found');
    }
    
    // Calculate new score (bounded 0-100)
    const newScore = Math.max(0, Math.min(100, 
      currentScore.current_score + scoreChange
    ));
    
    // Determine trend
    const trendDirection = scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'stable';
    
    // Update score
    await trx.light_scores.update(
      { user_id: userId },
      {
        current_score: newScore,
        trend_direction: trendDirection,
        trend_velocity: Math.abs(scoreChange),
        last_calculated_at: new Date(),
        calculation_count: currentScore.calculation_count + 1,
        updated_at: new Date()
      }
    );
    
    // Log event
    await trx.light_score_events.create({
      user_id: userId,
      event_type: eventType,
      score_change: scoreChange,
      old_score: currentScore.current_score,
      new_score: newScore,
      reference_type: referenceType,
      reference_id: referenceId,
      pentos_reasoning: reasoning,
      pentos_confidence: confidence
    });
    
    return {
      oldScore: currentScore.current_score,
      newScore,
      change: scoreChange
    };
  });
}

// Pentos calls this function when analyzing user actions
export async function pentosAnalyzeAction(
  userId: string,
  actionType: string,
  context: any
) {
  // Pentos secret algorithm determines:
  // 1. Should this action affect Light Score?
  // 2. By how much?
  // 3. Why?
  
  // Example: User posted helpful comment
  if (actionType === 'helpful_comment') {
    await updateLightScore({
      userId,
      eventType: 'helpful_comment',
      scoreChange: +2.5,
      reasoning: 'Comment received multiple positive reactions and helped answer question',
      confidence: 0.85,
      referenceType: 'comment',
      referenceId: context.commentId
    });
  }
  
  // Example: User posted spam
  if (actionType === 'spam_detected') {
    await updateLightScore({
      userId,
      eventType: 'spam_detected',
      scoreChange: -5.0,
      reasoning: 'Content flagged as spam by multiple users',
      confidence: 0.92,
      referenceType: 'post',
      referenceId: context.postId
    });
  }
  
  // More conditions...
}
```

---

## 🎨 Frontend Integration

### **Balance Display Component**

```typescript
// Example React component
import { useEconomy } from '@dream-protocol/economy';

function TokenBalances() {
  const { balances, loading } = useEconomy();
  
  // Convert bigint to displayable number
  const formatBalance = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(2);
  };
  
  if (loading) return <div>Loading balances...</div>;
  
  return (
    <div className="token-balances">
      <div className="balance-card">
        <h3>🗳️ PollCoin</h3>
        <div className="amount">
          {formatBalance(balances.pollcoin.available)} POLL
        </div>
        <div className="locked">
          Locked: {formatBalance(balances.pollcoin.locked)} POLL
        </div>
      </div>
      
      <div className="balance-card">
        <h3>💰 Gratium</h3>
        <div className="amount">
          {formatBalance(balances.gratium.available)} GRAT
        </div>
        <div className="locked">
          Locked: {formatBalance(balances.gratium.locked)} GRAT
        </div>
      </div>
      
      <div className="balance-card">
        <h3>📊 Light Score</h3>
        <div className="score">
          {balances.lightScore.toFixed(1)}
        </div>
        <div className="trend">
          {balances.lightScoreTrend === 'up' ? '↑' : '↓'}
        </div>
      </div>
    </div>
  );
}
```

### **Transfer Modal Component**

```typescript
function TransferModal({ tokenType }: { tokenType: 'pollcoin' | 'gratium' }) {
  const { transfer, loading } = useEconomy();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  
  const handleTransfer = async () => {
    await transfer({
      tokenType,
      toUserId: recipient,
      amount: parseFloat(amount),
      memo
    });
  };
  
  return (
    <div className="transfer-modal">
      <h2>Transfer {tokenType === 'pollcoin' ? 'PollCoin' : 'Gratium'}</h2>
      
      <input
        type="text"
        placeholder="Recipient User ID or DID"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      
      <input
        type="text"
        placeholder="Memo (optional)"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      
      <button onClick={handleTransfer} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

---

## 📋 API Endpoints

### **GET `/api/v1/economy/balances`**
Get user's token balances

**Response**:
```json
{
  "user_id": "uuid",
  "identity_mode": "true_self",
  "pollcoin": {
    "balance": "1000000000000000000000",
    "locked": "100000000000000000000",
    "available": "900000000000000000000"
  },
  "gratium": {
    "balance": "500000000000000000000",
    "locked": "50000000000000000000",
    "available": "450000000000000000000"
  },
  "light_score": {
    "current": 67.5,
    "trend": "up",
    "velocity": 2.3
  }
}
```

### **POST `/api/v1/economy/transfer`**
Transfer tokens to another user

**Request**:
```json
{
  "to_user_id": "uuid",
  "to_identity_mode": "true_self",
  "token_type": "pollcoin",
  "amount": "1000000000000000000",
  "memo": "Thanks for the help!"
}
```

**Response**:
```json
{
  "success": true,
  "transaction_id": "uuid",
  "net_amount": "990000000000000000",
  "burn_amount": "10000000000000000"
}
```

### **POST `/api/v1/economy/stake`**
Lock tokens (stake)

**Request**:
```json
{
  "token_type": "gratium",
  "amount": "100000000000000000000",
  "lock_type": "veracity_bond",
  "reference_type": "post",
  "reference_id": "uuid",
  "unlock_at": "2025-02-15T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "lock_id": "uuid",
  "amount_locked": "100000000000000000000",
  "unlock_at": "2025-02-15T00:00:00Z"
}
```

### **POST `/api/v1/economy/unstake`**
Release locked tokens

**Request**:
```json
{
  "lock_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "amount_released": "100000000000000000000",
  "token_type": "gratium"
}
```

### **GET `/api/v1/economy/transactions`**
Get transaction history

**Query Params**:
- `limit`: Number of transactions (default 20)
- `offset`: Pagination offset
- `token_type`: Filter by token
- `transaction_type`: Filter by type

**Response**:
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "transfer",
      "token_type": "pollcoin",
      "amount": "1000000000000000000",
      "from": {
        "user_id": "uuid",
        "identity_mode": "true_self"
      },
      "to": {
        "user_id": "uuid",
        "identity_mode": "shadow"
      },
      "status": "completed",
      "created_at": "2025-01-30T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### **GET `/api/v1/economy/light-score/history`**
Get Light Score history

**Response**:
```json
{
  "current_score": 67.5,
  "history": [
    {
      "event_type": "helpful_comment",
      "score_change": +2.5,
      "old_score": 65.0,
      "new_score": 67.5,
      "occurred_at": "2025-01-30T12:00:00Z",
      "reasoning": "Comment helped another user"
    }
  ]
}
```

### **GET `/api/v1/economy/supply`**
Get token supply metrics (public)

**Response**:
```json
{
  "pollcoin": {
    "total_minted": "1000000000000000000000000000",
    "total_burned": "1000000000000000000000000",
    "circulating_supply": "999000000000000000000000000",
    "total_locked": "100000000000000000000000000",
    "emission_rate": 0.05
  },
  "gratium": {
    "total_minted": "500000000000000000000000000",
    "total_burned": "500000000000000000000000",
    "circulating_supply": "499500000000000000000000000",
    "total_locked": "50000000000000000000000000",
    "emission_rate": 0.03
  }
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- Balance calculations are accurate
- Token transfers work correctly
- Burn amounts calculated properly
- Locked tokens can't be spent
- Light Score updates within bounds (0-100)

### **Integration Tests**
- Complete transfer flow (sender → receiver)
- Staking locks tokens correctly
- Unstaking releases after cooldown
- Insufficient balance errors handled
- Transaction history records all events

### **Security Tests**
- Can't transfer more than available balance
- Can't spend locked tokens
- Transaction rollback on error
- No double-spending possible
- Spot-only enforcement (no lending)

### **Performance Tests**
- Balance lookups: <50ms
- Transfers complete: <200ms
- 1000 concurrent transfers handled
- Light Score updates: <100ms

---

## 📊 Success Metrics

### **Functionality**
- ✅ 100% of balances track correctly
- ✅ Zero token loss in transfers
- ✅ All locks release on time
- ✅ Light Score updates match Pentos rules

### **Economy Health**
- ✅ Burn rate matches specification (1% POLL, 0.5% GRAT)
- ✅ Token velocity indicates healthy usage
- ✅ Staking participation >20% of supply
- ✅ Light Score distribution is bell curve

### **Performance**
- ✅ Database queries optimized
- ✅ Handles 10,000 transactions per day
- ✅ No transaction backlogs
- ✅ Real-time balance updates

---

## 🚀 Build Timeline

**Week 6-7** (after Module 03: User is complete)

### **Day 1-2: Database Setup**
- Create 6 tables (ledger, transactions, locks, light_scores, events, supply)
- Add indexes for performance
- Initialize token supply

### **Day 3-4: Core Services**
- Balance management service
- Transfer service with burn mechanics
- Lock/unlock service
- Light Score service (Pentos integration point)

### **Day 5-6: Transaction Processing**
- Atomic transaction handling
- Rollback support
- Fee calculation
- History tracking

### **Day 7-8: API Layer**
- Build 7 REST endpoints
- Add authentication
- Add rate limiting
- Transaction validation

### **Day 9-10: Testing & Integration**
- Unit tests for all services
- Integration tests
- Performance testing
- Connect with Module 06 (Governance) and Module 08 (Social)

**Deliverable**: Complete 4-token economy operational!

---

## 🔗 Integration with Other Modules

### **Module 01 (Identity)** - Uses
- Separate balances for True Self and Shadow
- DIDs used for transaction attribution

### **Module 03 (User)** - Provides To
- Light Score displayed on profiles
- Token balances shown (if user enables)

### **Module 05 (Token Exchange)** - Provides To
- Purchase tokens with fiat
- Spot-only enforcement

### **Module 06 (Governance)** - Provides To
- PollCoin for poll creation
- PollCoin staking on outcomes
- Light Score affects voting weight

### **Module 08 (Social)** - Provides To
- Gratium for tipping posts/comments
- Light Score displayed on content

### **Module 09 (Verification)** - Provides To
- Gratium for Veracity Bonds
- Light Score affected by verification status

### **Module 13 (Pentos)** - Integrates With
- Pentos calculates Light Score changes
- Secret algorithm implementation

---

## ⚠️ Critical Reminders

1. **Use bigint for token amounts** - JavaScript Number type loses precision
2. **Atomic transactions** - Use database transactions for all token operations
3. **Separate balances per identity** - True Self and Shadow are independent
4. **Burn tokens on transfers** - Platform revenue + deflationary economics
5. **Can't spend locked tokens** - Check available balance, not total balance
6. **Light Score is secret** - Only Pentos knows the full algorithm
7. **Spot-only enforcement** - No lending protocol integrations allowed

---

## 📚 Additional Documentation

- **Token Economics White Paper**: `docs/TOKENOMICS.md`
- **Light Score Algorithm**: `docs/LIGHT_SCORE_SECRET.md` (Pentos only)
- **Spot-Only Strategy**: `docs/SPOT_ONLY_ENFORCEMENT.md`
- **Transaction Types Guide**: `docs/TRANSACTION_TYPES.md`

---

**Module 04 Status**: ✅ Design Complete - Ready for Week 6-7 Implementation

**Previous Module**: Module 03 (User) - Ready to Build  
**Next Module**: Module 05 (Token Exchange) - Spot-Only Trading Platform
