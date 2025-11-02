# Module 09: Verification - Session 2 Planning & Status

**Date**: November 2, 2025  
**Status**: Ready to begin  
**Previous Session**: Session 1 complete with fixes pending  
**Target Components**: Prediction Markets + Epistemic Scoring (+ NFTs + Thalyra in extended scope)

---

## Executive Summary

Session 1 successfully implemented the **Proof of Humanity** and **Veracity Bonds** systems with a comprehensive database schema (4/4 tables). Minor TypeScript fixes are required before Session 2 can begin.

**Session 2** will implement:
1. **Prediction Markets** (LMSR algorithm) - Crowd wisdom for truth discovery
2. **Epistemic Scoring** (5-layer funnel) - Multi-level trust assessment
3. **Content NFT Certification** (if time permits) - Permanent proof of value
4. **Thalyra AI** (if time permits) - Threat detection with 7-second heartbeat

---

## Session 1: Current Status

### Completed Components

#### Database Schema (4/4 Tables ✅)
- `proof_of_humanity` - User verification records with 5-factor scoring
- `humanity_verification_events` - Verification attempt logs
- `veracity_bonds` - Gratium stakes on truth claims
- `bond_challenges` - Bond challenge records

All tables have proper:
- Constraints (CHECK, UNIQUE, FK)
- Indexes for query performance
- JSONB fields for extensibility

#### Services (2/2 ✅)
- **ProofOfHumanityService** - 8 methods implemented
  - `initiateVerification()` - Start verification session
  - `submitVerificationMethod()` - Add verification proof
  - `getVerificationStatus()` - Check current level/status
  - `checkAccess()` - Gate features by PoH level
  - Helper methods for scoring and level calculation

- **VeracityBondService** - 9 methods implemented
  - `createBond()` - Create new truth bond
  - `getBond()` / `getUserBonds()` - Retrieve bonds
  - `challengeBond()` - Challenge a bond's truthfulness
  - `resolveBond()` - Resolve with slashing logic
  - Helper methods for validation

#### API Endpoints (9/9 ✅)
- PoH: POST /poh/initiate, /poh/verify, GET /poh/status, /poh/access
- Bonds: POST /bonds, GET /bonds/:id, /bonds/user/:userId, /bonds/:id/challenge, /bonds/:id/resolve

#### Type System (40+ types ✅)
Complete TypeScript interfaces matching database schema with proper snake_case property names

### Known Issues to Fix Before Session 2

**Status**: 8 TypeScript errors (all fixable, no logic issues)

**Quick Fixes Required**:
1. ✅ Property naming - Types already use snake_case (some old camelCase references remain in comments)
2. ❌ Null safety - Add checks after `queryOne()` calls in proof-of-humanity.service.ts (2 places)
3. ❌ Private keywords - Remove `private` from object literal methods (3 places)
4. ❌ Dependencies - Run `npm install` in the module directory

**Time to fix**: 15-20 minutes
**Risk**: None - pure type system cleanup

**Detailed fix guide available**: See `/Users/shawn/Desktop/dreamprotocol/FIXES_09_SESSION1.md`

---

## Session 2: Implementation Plan

### Component 1: Prediction Markets (LMSR)

#### Database Tables (3 new)

```sql
-- Migration 005: prediction_markets
CREATE TABLE prediction_markets (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id),
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    
    -- LMSR parameters
    liquidity_parameter DECIMAL(10,4) NOT NULL, -- 'b' in formula
    initial_probability DECIMAL(3,2) DEFAULT 0.50,
    current_probability DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    
    -- Outcomes for binary markets
    outcome_yes_shares BIGINT DEFAULT 0,
    outcome_no_shares BIGINT DEFAULT 0,
    
    -- Status & Resolution
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    resolution VARCHAR(10), -- yes, no, invalid
    resolved_at TIMESTAMP,
    
    -- Timing & Stats
    opens_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closes_at TIMESTAMP NOT NULL,
    total_volume BIGINT DEFAULT 0,
    unique_traders INTEGER DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration 006: market_positions
CREATE TABLE market_positions (
    id UUID PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES prediction_markets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    identity_mode VARCHAR(10) NOT NULL,
    
    -- Position details
    outcome VARCHAR(10) NOT NULL, -- yes or no
    shares BIGINT NOT NULL DEFAULT 0,
    average_price DECIMAL(10,4) NOT NULL,
    
    -- P&L tracking
    invested_gratium BIGINT NOT NULL DEFAULT 0,
    current_value BIGINT NOT NULL DEFAULT 0,
    realized_profit BIGINT DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration 007: market_trades
CREATE TABLE market_trades (
    id UUID PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES prediction_markets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    identity_mode VARCHAR(10) NOT NULL,
    
    -- Trade details
    trade_type VARCHAR(10) NOT NULL, -- buy or sell
    outcome VARCHAR(10) NOT NULL, -- yes or no
    shares BIGINT NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    gratium_amount BIGINT NOT NULL,
    
    -- Market state
    probability_before DECIMAL(3,2) NOT NULL,
    probability_after DECIMAL(3,2) NOT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Service: PredictionMarketService

**Key Methods**:
```typescript
// LMSR Calculator (core)
calculatePrice(b: number, qYes: number, qNo: number, outcome: 'yes' | 'no'): number
calculateCost(b: number, qYes: number, qNo: number): number
calculatePurchaseCost(b: number, qYes: number, qNo: number, outcome: 'yes' | 'no', shares: bigint): bigint

// Market operations
createMarket(params: CreateMarketParams): Promise<PredictionMarket>
buyShares(params: BuySharesParams): Promise<MarketTrade>
sellShares(params: SellSharesParams): Promise<MarketTrade>
resolveMarket(marketId: string, outcome: 'yes' | 'no' | 'invalid'): Promise<void>
distributeWinnings(marketId: string): Promise<void>

// Queries
getMarketProbability(marketId: string): Promise<number>
getUserPosition(marketId: string, userId: string, identityMode: IdentityMode): Promise<MarketPosition>
getMarketHistory(marketId: string): Promise<MarketTrade[]>
```

#### API Endpoints (8 new)
```
POST   /markets                      - Create market
GET    /markets                      - List markets
GET    /markets/:marketId            - Get details
GET    /markets/:marketId/price/:outcome
POST   /markets/:marketId/quote      - Get trade quote
POST   /markets/:marketId/buy        - Buy shares
POST   /markets/:marketId/sell       - Sell shares
POST   /markets/:marketId/resolve    - Resolve market
```

#### Critical Implementation Details

**LMSR Formula** (Logarithmic Market Scoring Rule):
```
Cost Function: C(q) = b * ln(Σe^(qi/b))
Price Function: p_i = e^(qi/b) / Σe^(qj/b)
```

Where:
- b = liquidity parameter (higher = less volatile)
- q_i = quantity of shares for outcome i
- Price always sums to 1.0
- Cost increases as you buy more shares

**Key Properties**:
- Automatic market making (AMM)
- Liquidity guaranteed
- Price reflects market beliefs
- Sybil-resistant (higher cost per share with more trading)

---

### Component 2: Epistemic Scoring (5-Layer Funnel)

#### Database Tables (2 new)

```sql
-- Migration 008: epistemic_scores
CREATE TABLE epistemic_scores (
    id UUID PRIMARY KEY,
    
    -- Target (polymorphic reference)
    target_type VARCHAR(50) NOT NULL, -- user, post, comment, claim, market
    target_id UUID NOT NULL,
    
    -- 5-layer scores (0-100 each)
    surface_score INTEGER DEFAULT 50,       -- Formatting, grammar, structure
    contextual_score INTEGER DEFAULT 50,    -- Relevance, timeliness, sources
    analytical_score INTEGER DEFAULT 50,    -- Logic, evidence, arguments
    synthesis_score INTEGER DEFAULT 50,     -- Integration, creativity, insight
    meta_score INTEGER DEFAULT 50,          -- Self-awareness, limitations
    
    -- Final weighted score
    final_score INTEGER NOT NULL DEFAULT 50,
    confidence DECIMAL(3,2) DEFAULT 0.50,
    
    -- Factors that contributed
    factors JSONB DEFAULT '{}',
    
    -- Temporal management
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration 009: epistemic_factors
CREATE TABLE epistemic_factors (
    id UUID PRIMARY KEY,
    score_id UUID NOT NULL REFERENCES epistemic_scores(id),
    
    layer VARCHAR(20) NOT NULL, -- surface, contextual, etc
    factor_type VARCHAR(50) NOT NULL, -- source_credibility, citation_quality, etc
    
    value DECIMAL(5,2) NOT NULL,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    
    evidence JSONB DEFAULT '{}',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Service: EpistemicScoringService

**Layer Calculations** (each returns 0-100 score):

1. **Surface Layer** (10% weight)
   - Grammar/spelling
   - Formatting quality
   - Readability metrics
   - Content length appropriateness

2. **Contextual Layer** (15% weight)
   - Author credibility
   - Source quality
   - Relevance to topic
   - Timeliness

3. **Analytical Layer** (25% weight)
   - Logical consistency
   - Evidence quality
   - Argument strength
   - Counterargument handling

4. **Synthesis Layer** (25% weight)
   - Integration across ideas
   - Originality/creativity
   - Novel insights
   - Practical impact

5. **Meta Layer** (25% weight)
   - Self-awareness
   - Acknowledged limitations
   - Uncertainty quantification
   - Openness to updates

**Key Methods**:
```typescript
calculateScore(targetType: string, targetId: string): Promise<EpistemicScore>
calculateSurfaceLayer(target: any): Promise<number>
calculateContextualLayer(target: any): Promise<number>
calculateAnalyticalLayer(target: any): Promise<number>
calculateSynthesisLayer(target: any): Promise<number>
calculateMetaLayer(target: any): Promise<number>
addFactor(scoreId: string, layer: string, factorType: string, value: number, weight: number): Promise<void>
refreshScore(targetType: string, targetId: string): Promise<EpistemicScore>
```

#### API Endpoints (5 new)
```
POST   /epistemic/calculate              - Calculate score
GET    /epistemic/:targetType/:targetId  - Get score
GET    /epistemic/top/:targetType        - Get top scores
POST   /epistemic/factors                - Add custom factor
POST   /epistemic/:targetType/:targetId/refresh
```

---

### Component 3: Content NFT Certification

#### Database Table (1 new)

```sql
-- Migration 010: content_nfts
CREATE TABLE content_nfts (
    id UUID PRIMARY KEY,
    
    -- Content reference
    content_type VARCHAR(50) NOT NULL, -- post, comment, analysis
    content_id UUID NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    
    -- NFT details
    token_id VARCHAR(100), -- Blockchain token ID
    metadata_uri TEXT, -- IPFS/Arweave URI
    certification_level VARCHAR(20) NOT NULL, -- bronze, silver, gold, platinum
    
    -- Verification
    epistemic_score_id UUID REFERENCES epistemic_scores(id),
    minimum_score_required INTEGER NOT NULL DEFAULT 75,
    
    -- Minting
    minted BOOLEAN DEFAULT false,
    minted_at TIMESTAMP,
    mint_transaction_hash VARCHAR(100),
    
    -- Value tracking (future: Module 23)
    cosmoflux_locked BIGINT DEFAULT 0,
    trading_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Service: ContentNFTService

**Key Methods**:
```typescript
certifyContent(params: CertifyParams): Promise<ContentNFT>
prepareMintData(nftId: string): Promise<NFTMetadata>
recordMint(nftId: string, tokenId: string, txHash: string): Promise<void>
getNFT(nftId: string): Promise<ContentNFT>
getCreatorNFTs(creatorId: string): Promise<ContentNFT[]>
getCertificationRequirements(level: string): Promise<CertificationRequirements>
```

#### API Endpoints (5 new)
```
POST   /nfts/certify              - Certify content
GET    /nfts/:nftId               - Get NFT details
GET    /nfts/creator/:creatorId   - List creator NFTs
GET    /nfts/:nftId/mint-data     - Get mint metadata
POST   /nfts/:nftId/mint          - Record mint
```

---

### Component 4: Thalyra AI (Extended Scope)

#### Database Table (1 new)

```sql
-- Migration 011: thalyra_detections
CREATE TABLE thalyra_detections (
    id UUID PRIMARY KEY,
    
    -- Threat identification
    threat_type VARCHAR(50) NOT NULL, -- manipulation, coordination, misinformation, spam
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    confidence DECIMAL(3,2) NOT NULL,
    
    -- Target
    target_type VARCHAR(50),
    target_id UUID,
    
    -- Evidence
    detection_data JSONB NOT NULL DEFAULT '{}',
    patterns_detected TEXT[],
    affected_users UUID[],
    
    -- Response
    auto_action_taken VARCHAR(50), -- flag, hide, freeze, alert
    manual_review_required BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    review_outcome VARCHAR(20), -- confirmed, false_positive
    
    -- 7-second heartbeat
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heartbeat_cycle INTEGER NOT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Service: ThalyraService

**Key Methods**:
```typescript
startHeartbeat(): void // Start 7-second monitoring
stopHeartbeat(): void
scanForThreats(): Promise<ThreatReport[]>
detectCoordination(userIds: string[]): Promise<CoordinationPattern[]>
detectManipulation(contentId: string): Promise<ManipulationSignal[]>
detectMisinformation(text: string): Promise<MisinformationScore>
flagContent(contentId: string, reason: string): Promise<void>
freezeAccount(userId: string, duration: number): Promise<void>
```

---

## Implementation Schedule

### Phase 1: Prediction Markets (Days 1-2)
1. Create 3 new migrations (005-007)
2. Implement PredictionMarketService with LMSR calculator
3. Create 8 API endpoints
4. Write unit tests for LMSR algorithm
5. Test buying/selling/resolution flows

### Phase 2: Epistemic Scoring (Days 3-4)
1. Create 2 new migrations (008-009)
2. Implement EpistemicScoringService with 5 layers
3. Create 5 API endpoints
4. Write unit tests for each layer
5. Test score calculation and decay

### Phase 3: Content NFT + Thalyra (Days 5 - Optional)
1. Create 2 migrations (010-011)
2. Implement ContentNFTService
3. Implement ThalyraService with heartbeat
4. Add remaining API endpoints
5. Integration testing

### Phase 4: Integration & Testing (Day 6+)
1. Fix Session 1 TypeScript errors (15 min)
2. Run full test suite
3. Verify database migrations
4. Integration tests with Modules 04, 06
5. Performance testing
6. Documentation

---

## Key Technical Challenges

### 1. LMSR Algorithm Implementation

**Critical**: Must implement exactly as specified
```typescript
// The formula is mathematically precise - no approximations
const cost = b * Math.log(Math.exp(qYes/b) + Math.exp(qNo/b));
const price = Math.exp(qOutcome/b) / (Math.exp(qYes/b) + Math.exp(qNo/b));
```

**Watch out for**:
- Numerical overflow with large share quantities
- Price must always sum to 1.0
- Cost must increase monotonically
- Floating point precision with DECIMAL type

### 2. Epistemic Scoring Layers

**Challenge**: Evaluating abstract concepts programmatically
- Layer 1-2: Can use regex/simple analysis
- Layer 3-4: Need NLP models or heuristics
- Layer 5: Requires pattern matching

**Approach**: Start with heuristics, add ML models later

### 3. Temporal Decay

**Challenge**: Scores should expire after ~30 days
- Need scheduled background job to mark expired
- Or calculate expiry on read

**Approach**: Add `expires_at` timestamp, refresh on access

### 4. Null Safety in TypeScript

**Already fixed in Session 1**, but Pattern to follow:
```typescript
const record = await queryOne(sql, params);
if (!record) {
  throw new Error('Record not found');
}
// Now record is guaranteed non-null
```

---

## Type Definitions to Add

### Prediction Market Types
```typescript
type PredictionMarketStatus = 'open' | 'closed' | 'resolved' | 'cancelled';
type MarketResolution = 'yes' | 'no' | 'invalid';
type TradeType = 'buy' | 'sell';
type Outcome = 'yes' | 'no';

interface PredictionMarket { /* ... */ }
interface MarketPosition { /* ... */ }
interface MarketTrade { /* ... */ }
interface LMSRCalculation { /* ... */ }
```

### Epistemic Scoring Types
```typescript
type EpistemicLayer = 'surface' | 'contextual' | 'analytical' | 'synthesis' | 'meta';
type TargetType = 'user' | 'post' | 'comment' | 'claim' | 'market';

interface EpistemicScore { /* ... */ }
interface LayerScore { /* ... */ }
interface EpistemicFactor { /* ... */ }
```

### NFT Types
```typescript
type CertificationLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

interface ContentNFT { /* ... */ }
interface NFTMetadata { /* ... */ }
```

### Thalyra Types
```typescript
type ThreatType = 'manipulation' | 'coordination' | 'misinformation' | 'spam' | 'impersonation';
type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
type AutoAction = 'flag' | 'hide' | 'freeze' | 'alert_admin';

interface ThalyraDetection { /* ... */ }
interface ThreatReport { /* ... */ }
```

---

## Testing Strategy for Session 2

### LMSR Testing (Critical)

```typescript
describe('LMSR Calculator', () => {
  test('price always sums to 1');
  test('cost increases monotonically');
  test('handles edge cases (0 liquidity)');
  test('matches mathematical formula exactly');
  test('large share quantities handled correctly');
});
```

### Epistemic Scoring Testing

```typescript
describe('Epistemic Funnel', () => {
  test('each layer returns 0-100');
  test('layers weight correctly in final score');
  test('factors integrate properly');
  test('temporal decay works');
});
```

### Integration Testing

```typescript
// End-to-end market workflow
test('Create market → Trade → Resolve → Distribute');

// Epistemic integration
test('Content created → Score calculated → NFT eligible');

// Thalyra integration  
test('Threat detected → Auto-action → Manual review');
```

---

## Pre-Session 2 Checklist

Before starting Session 2, complete these:

- [ ] Fix Session 1 TypeScript errors (See FIXES_09_SESSION1.md)
  - [ ] Run `npm install` in module directory
  - [ ] Remove `private` keywords from object methods
  - [ ] Add null checks after `queryOne()` calls
  - [ ] Type annotations added to arrow functions
- [ ] Verify all Session 1 tests pass
  - [ ] `npm test` should succeed
  - [ ] `npm run build` should have 0 errors
- [ ] Review LMSR algorithm and formulas
- [ ] Plan database migration file numbering (005-011)
- [ ] Set up performance testing framework
- [ ] Review integration points with Modules 04, 06

---

## Current File Structure

```
packages/09-verification/
├── src/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_proof_of_humanity.sql       ✅
│   │   │   ├── 002_create_humanity_verification_events.sql ✅
│   │   │   ├── 003_create_veracity_bonds.sql          ✅
│   │   │   ├── 004_create_bond_challenges.sql         ✅
│   │   │   ├── 005_create_prediction_markets.sql      📝 TODO Session 2
│   │   │   ├── 006_create_market_positions.sql        📝 TODO Session 2
│   │   │   ├── 007_create_market_trades.sql           📝 TODO Session 2
│   │   │   ├── 008_create_epistemic_scores.sql        📝 TODO Session 2
│   │   │   ├── 009_create_epistemic_factors.sql       📝 TODO Session 2
│   │   │   ├── 010_create_content_nfts.sql            📝 TODO Session 2
│   │   │   └── 011_create_thalyra_detections.sql      📝 TODO Session 2
│   │   ├── index.ts                                    ✅
│   │   ├── migrate.ts                                  ✅
│   │   └── seed.ts                                     ✅
│   ├── services/
│   │   ├── proof-of-humanity.service.ts               ✅ (needs fixes)
│   │   ├── veracity-bond.service.ts                   ✅ (needs fixes)
│   │   ├── prediction-market.service.ts               📝 TODO Session 2
│   │   ├── epistemic-scoring.service.ts               📝 TODO Session 2
│   │   ├── content-nft.service.ts                     📝 TODO Session 2
│   │   └── thalyra.service.ts                         📝 TODO Session 2
│   ├── types/
│   │   └── index.ts                                    ✅ (needs Session 2 types)
│   ├── tests/
│   │   ├── verification.test.ts                        ✅ (partial)
│   │   ├── prediction-market.test.ts                  📝 TODO Session 2
│   │   ├── epistemic-scoring.test.ts                  📝 TODO Session 2
│   │   └── integration.test.ts                         📝 TODO Session 2
│   └── index.ts                                         ✅ (needs routes)
├── package.json                                         ✅
├── tsconfig.json                                        ✅
├── vitest.config.ts                                     ✅
└── README.md                                            ✅
```

---

## Integration Points for Session 2

### Module 04: Economy Integration
```typescript
// When buying/selling in prediction markets
economyService.transferTokens(user, marketPool, 'GRAT', amount);

// When NFT is certified
economyService.lockCosmoFlux(nftId, amount);
```

### Module 06: Governance Integration
```typescript
// Create prediction markets for governance proposals
const market = await predictionMarketService.createMarket({
  question: `Will proposal ${id} pass?`,
  closesAt: proposal.votingEndsAt
});
```

### Module 10: Analytics Integration
```typescript
// Record epistemic scores
analyticsService.recordEpistemicScore(targetType, targetId, score);

// Track market accuracy
analyticsService.recordMarketResolution(marketId, predicted, actual);
```

### Module 14: Pentos Integration
```typescript
// Sync heartbeat with Thalyra
pentosService.syncHeartbeat(cycle);
```

---

## References & Resources

**Session 1 Review**: `/Users/shawn/Desktop/dreamprotocol/REVIEW_09_SESSION1.md`
**Session 1 Fixes**: `/Users/shawn/Desktop/dreamprotocol/FIXES_09_SESSION1.md`
**Full Spec**: `/Users/shawn/Desktop/dreamprotocol/MODULE_09_SPEC.md`

**LMSR Algorithm**: See lines 540-573 in MODULE_09_SPEC.md
**Epistemic Funnel**: See lines 604-726 in MODULE_09_SPEC.md
**Security Considerations**: See lines 1317-1343 in MODULE_09_SPEC.md

---

## Questions to Answer Before Starting

1. **LMSR Liquidity Parameter**: What default value? (Spec suggests 1000)
2. **Epistemic Decay**: Should scores expire at 30 days?
3. **Thalyra Schedule**: Should heartbeat sync with Pentos exactly?
4. **NFT Minting**: Should we mock blockchain or wait for Module 19?
5. **Performance Target**: Max trading volume per heartbeat?

---

## Success Metrics for Session 2

### Prediction Markets
- LMSR calculator passes all mathematical tests
- Market creation and trading work end-to-end
- Resolution and winnings distribution accurate
- 1000+ concurrent traders supported

### Epistemic Scoring
- All 5 layers calculate correctly
- Scores distribution is normal (bell curve)
- Temporal decay works properly
- Integration with NFT certification works

### Content NFTs
- Certification levels properly assigned
- Metadata generation working
- Ready for future minting

### Thalyra AI (if in scope)
- Detects 5+ threat types
- 7-second heartbeat operates correctly
- Manual review process works
- False positive rate < 10%

---

**Next Action**: Fix Session 1 errors, then begin Session 2 with Prediction Markets

**Estimated Duration**: 5-6 days for core components (Prediction Markets + Epistemic Scoring)
**Extended Duration**: 8-10 days with NFTs + Thalyra included

