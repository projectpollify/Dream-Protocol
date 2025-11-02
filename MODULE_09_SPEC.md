# Module 09: Verification - Complete Specification

**Version**: 1.0
**Date**: November 2, 2025
**Status**: Specification Phase
**Timeline**: Weeks 11-12 (2 weeks)
**Dependencies**: Modules 01-08 (Complete)
**Integration Points**: Modules 04 (Economy), 06 (Governance), 10 (Analytics), 11 (7 Pillars), 14 (Pentos)

---

## 📋 Executive Summary

Module 09: Verification implements a multi-layer truth discovery system that ensures platform integrity through six interconnected components. It prevents manipulation, verifies human participants, and creates financial incentives for truthful behavior.

### Core Philosophy
"Trust through verification, truth through incentives, integrity through transparency."

### Key Innovations
1. **Multi-signal truth discovery** - No single point of failure
2. **Financial skin-in-the-game** - Gratium bonds align incentives
3. **AI + Human hybrid** - Thalyra AI works with human verification
4. **5-layer epistemic scoring** - Graduated trust levels
5. **Prediction markets** - Crowd wisdom reveals truth
6. **NFT certification** - Permanent proof of valuable content

---

## 🎯 Component Overview

### 1. Proof of Humanity (PoH) - "Are you human?"
- Multi-factor verification combining behavioral, biometric, and social signals
- Prevents bots, sybil attacks, and fake accounts
- Gates access to voting, staking, and governance

### 2. Veracity Bonds - "Put your money where your truth is"
- Stake Gratium on claims being truthful
- Higher stakes = higher credibility signal
- Slashing for proven falsehoods

### 3. Prediction Markets - "What will happen?"
- LMSR-based (Logarithmic Market Scoring Rule) for efficient pricing
- Users trade on outcome probabilities
- Market prices reveal collective intelligence

### 4. Epistemic Funnel - "How trustworthy is this?"
- 5 layers: Surface → Contextual → Analytical → Synthesis → Meta
- Each layer adds depth to trust evaluation
- Produces final 0-100 epistemic score

### 5. Content NFT Certification - "This matters forever"
- Certify high-value content as NFTs
- Immutable proof of creation and authenticity
- Integration with Module 20 (Arweave) for permanence

### 6. Thalyra AI - "Guardian against manipulation"
- Real-time threat detection
- Pattern recognition for coordinated attacks
- 7-second heartbeat sync with Pentos and 7 Pillars

---

## 🗄️ Database Schema

### Core Tables (11 total)

#### 1. `proof_of_humanity` - Human verification records
```sql
CREATE TABLE proof_of_humanity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    identity_mode VARCHAR(10) NOT NULL CHECK (identity_mode IN ('true_self', 'shadow')),

    -- Verification levels
    level INTEGER NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Multi-factor scores
    behavioral_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
    biometric_score DECIMAL(3,2) DEFAULT 0,
    social_score DECIMAL(3,2) DEFAULT 0,
    temporal_score DECIMAL(3,2) DEFAULT 0,
    economic_score DECIMAL(3,2) DEFAULT 0,

    -- Verification methods used
    methods_completed JSONB DEFAULT '[]'::jsonb,

    -- Timing
    last_verified TIMESTAMP,
    next_reverification TIMESTAMP,
    expires_at TIMESTAMP,

    -- Metadata
    verification_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, identity_mode),
    INDEX idx_poh_status (status, expires_at),
    INDEX idx_poh_level (level, is_active)
);
```

#### 2. `humanity_verification_events` - Verification attempt log
```sql
CREATE TABLE humanity_verification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poh_id UUID NOT NULL REFERENCES proof_of_humanity(id),

    method VARCHAR(50) NOT NULL, -- captcha, worldcoin, vouching, etc
    result VARCHAR(20) NOT NULL, -- passed, failed, inconclusive
    score DECIMAL(3,2),

    -- Evidence
    evidence JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_hve_poh (poh_id, created_at DESC),
    INDEX idx_hve_method (method, result)
);
```

#### 3. `veracity_bonds` - Truth stakes on content/claims
```sql
CREATE TABLE veracity_bonds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    identity_mode VARCHAR(10) NOT NULL,

    -- What is being bonded
    bond_type VARCHAR(20) NOT NULL, -- claim, post, comment, prediction
    target_id UUID NOT NULL, -- polymorphic reference
    target_type VARCHAR(50) NOT NULL,

    -- Bond details
    gratium_amount BIGINT NOT NULL CHECK (gratium_amount >= 100), -- Min 100 GRAT
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, resolved_truthful, resolved_false, expired

    -- Resolution
    resolved_at TIMESTAMP,
    resolution_evidence JSONB,
    slashed_amount BIGINT DEFAULT 0,

    -- Metadata
    claim_text TEXT,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 10),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    INDEX idx_vb_user (user_id, identity_mode, status),
    INDEX idx_vb_target (target_type, target_id),
    INDEX idx_vb_status (status, expires_at)
);
```

#### 4. `bond_challenges` - Challenges to veracity bonds
```sql
CREATE TABLE bond_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bond_id UUID NOT NULL REFERENCES veracity_bonds(id),
    challenger_id UUID NOT NULL REFERENCES users(id),

    challenge_amount BIGINT NOT NULL, -- Must match or exceed bond
    challenge_reason TEXT NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,

    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    resolved_at TIMESTAMP,
    resolution_notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_bc_bond (bond_id, status),
    INDEX idx_bc_challenger (challenger_id)
);
```

#### 5. `prediction_markets` - LMSR-based prediction markets
```sql
CREATE TABLE prediction_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id),

    -- Market details
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),

    -- LMSR parameters
    liquidity_parameter DECIMAL(10,4) NOT NULL, -- 'b' in LMSR formula
    initial_probability DECIMAL(3,2) DEFAULT 0.50, -- Starting probability
    current_probability DECIMAL(3,2) NOT NULL DEFAULT 0.50,

    -- Outcomes (for binary markets)
    outcome_yes_shares BIGINT DEFAULT 0,
    outcome_no_shares BIGINT DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed, resolved, cancelled
    resolution VARCHAR(10), -- yes, no, invalid
    resolved_at TIMESTAMP,
    resolution_source TEXT,

    -- Timing
    opens_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closes_at TIMESTAMP NOT NULL,

    -- Stats
    total_volume BIGINT DEFAULT 0,
    unique_traders INTEGER DEFAULT 0,
    last_trade_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_pm_status (status, closes_at),
    INDEX idx_pm_category (category, status),
    INDEX idx_pm_creator (creator_id)
);
```

#### 6. `market_positions` - User positions in prediction markets
```sql
CREATE TABLE market_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES prediction_markets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    identity_mode VARCHAR(10) NOT NULL,

    -- Position
    outcome VARCHAR(10) NOT NULL, -- yes, no
    shares BIGINT NOT NULL DEFAULT 0,
    average_price DECIMAL(10,4) NOT NULL,

    -- P&L tracking
    invested_gratium BIGINT NOT NULL DEFAULT 0,
    current_value BIGINT NOT NULL DEFAULT 0,
    realized_profit BIGINT DEFAULT 0,

    -- Activity
    last_trade_at TIMESTAMP,
    trades_count INTEGER DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(market_id, user_id, identity_mode, outcome),
    INDEX idx_mp_user (user_id, identity_mode),
    INDEX idx_mp_market (market_id, outcome)
);
```

#### 7. `market_trades` - Individual trades in prediction markets
```sql
CREATE TABLE market_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES prediction_markets(id),
    user_id UUID NOT NULL REFERENCES users(id),
    identity_mode VARCHAR(10) NOT NULL,

    -- Trade details
    trade_type VARCHAR(10) NOT NULL, -- buy, sell
    outcome VARCHAR(10) NOT NULL, -- yes, no
    shares BIGINT NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    gratium_amount BIGINT NOT NULL,

    -- Market state at trade time
    probability_before DECIMAL(3,2) NOT NULL,
    probability_after DECIMAL(3,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_mt_market (market_id, created_at DESC),
    INDEX idx_mt_user (user_id, identity_mode, created_at DESC)
);
```

#### 8. `epistemic_scores` - Multi-layer trust scoring
```sql
CREATE TABLE epistemic_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target (polymorphic)
    target_type VARCHAR(50) NOT NULL, -- user, post, comment, claim, market
    target_id UUID NOT NULL,

    -- 5-layer scores (0-100 each)
    surface_score INTEGER DEFAULT 50,
    contextual_score INTEGER DEFAULT 50,
    analytical_score INTEGER DEFAULT 50,
    synthesis_score INTEGER DEFAULT 50,
    meta_score INTEGER DEFAULT 50,

    -- Final weighted score
    final_score INTEGER NOT NULL DEFAULT 50,
    confidence DECIMAL(3,2) DEFAULT 0.50, -- How confident in the score

    -- Components that contributed
    factors JSONB DEFAULT '{}'::jsonb,

    -- Temporal decay
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(target_type, target_id),
    INDEX idx_es_target (target_type, target_id),
    INDEX idx_es_score (final_score DESC),
    INDEX idx_es_expires (expires_at)
);
```

#### 9. `epistemic_factors` - Individual factors in epistemic scoring
```sql
CREATE TABLE epistemic_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    score_id UUID NOT NULL REFERENCES epistemic_scores(id),

    layer VARCHAR(20) NOT NULL, -- surface, contextual, analytical, synthesis, meta
    factor_type VARCHAR(50) NOT NULL, -- source_credibility, citation_quality, logical_consistency, etc

    value DECIMAL(5,2) NOT NULL, -- Factor value
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- Importance weight

    evidence JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_ef_score (score_id, layer),
    INDEX idx_ef_type (factor_type)
);
```

#### 10. `content_nfts` - NFT certification for valuable content
```sql
CREATE TABLE content_nfts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Content reference
    content_type VARCHAR(50) NOT NULL, -- post, comment, analysis, prediction
    content_id UUID NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),

    -- NFT details
    token_id VARCHAR(100), -- Blockchain token ID (when minted)
    metadata_uri TEXT, -- IPFS/Arweave URI
    certification_level VARCHAR(20) NOT NULL, -- bronze, silver, gold, platinum

    -- Verification
    epistemic_score_id UUID REFERENCES epistemic_scores(id),
    minimum_score_required INTEGER NOT NULL DEFAULT 75,

    -- Minting
    minted BOOLEAN DEFAULT false,
    minted_at TIMESTAMP,
    mint_transaction_hash VARCHAR(100),

    -- Value tracking
    cosmoflux_locked BIGINT DEFAULT 0, -- Future: Module 23
    trading_enabled BOOLEAN DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(content_type, content_id),
    INDEX idx_cn_creator (creator_id, minted),
    INDEX idx_cn_level (certification_level, minted)
);
```

#### 11. `thalyra_detections` - AI threat detection events
```sql
CREATE TABLE thalyra_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Threat identification
    threat_type VARCHAR(50) NOT NULL, -- manipulation, coordination, misinformation, spam, impersonation
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    confidence DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00

    -- Target
    target_type VARCHAR(50), -- user, post, comment, vote_pattern, network
    target_id UUID,

    -- Evidence
    detection_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    patterns_detected TEXT[],
    affected_users UUID[],

    -- Response
    auto_action_taken VARCHAR(50), -- flag, hide, freeze, alert_admin
    manual_review_required BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    review_outcome VARCHAR(20), -- confirmed, false_positive, inconclusive

    -- Timing (7-second heartbeat)
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heartbeat_cycle INTEGER NOT NULL, -- Which 7-second cycle

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_td_type_severity (threat_type, severity, detected_at DESC),
    INDEX idx_td_target (target_type, target_id),
    INDEX idx_td_review (manual_review_required, reviewed_at),
    INDEX idx_td_heartbeat (heartbeat_cycle, detected_at DESC)
);
```

---

## 🔧 Service Architecture

### Service Layer Structure

```typescript
// Core service interfaces
interface VerificationService {
    proofOfHumanity: ProofOfHumanityService;
    veracityBonds: VeracityBondService;
    predictionMarkets: PredictionMarketService;
    epistemicScoring: EpistemicScoringService;
    contentNFT: ContentNFTService;
    thalyra: ThalyraService;
}
```

### 1. ProofOfHumanityService

```typescript
interface ProofOfHumanityService {
    // Core verification
    initiateVerification(userId: string, identityMode: IdentityMode): Promise<PoHSession>;
    submitVerificationMethod(sessionId: string, method: VerificationMethod, data: any): Promise<VerificationResult>;

    // Multi-factor scoring
    calculateBehavioralScore(userId: string): Promise<number>;
    calculateBiometricScore(userId: string, biometricData: any): Promise<number>;
    calculateSocialScore(userId: string): Promise<number>;
    calculateTemporalScore(userId: string): Promise<number>;
    calculateEconomicScore(userId: string): Promise<number>;

    // Status management
    getVerificationStatus(userId: string, identityMode: IdentityMode): Promise<PoHStatus>;
    upgradeLevel(userId: string, identityMode: IdentityMode): Promise<boolean>;
    scheduleReverification(userId: string): Promise<Date>;

    // Gating
    checkAccess(userId: string, feature: string): Promise<boolean>;
    getRequiredLevel(feature: string): Promise<number>;
}
```

### 2. VeracityBondService

```typescript
interface VeracityBondService {
    // Bond creation
    createBond(params: {
        userId: string;
        identityMode: IdentityMode;
        targetType: string;
        targetId: string;
        amount: bigint;
        claimText?: string;
        confidence: number;
    }): Promise<VeracityBond>;

    // Bond management
    getBond(bondId: string): Promise<VeracityBond>;
    getUserBonds(userId: string, identityMode: IdentityMode): Promise<VeracityBond[]>;
    getTargetBonds(targetType: string, targetId: string): Promise<VeracityBond[]>;

    // Challenges
    challengeBond(bondId: string, challengerId: string, amount: bigint, reason: string): Promise<BondChallenge>;
    resolveBond(bondId: string, truthful: boolean, evidence: any): Promise<BondResolution>;

    // Slashing
    slashBond(bondId: string, slashPercentage: number): Promise<bigint>;
    distributeSlahedFunds(bondId: string): Promise<void>;
}
```

### 3. PredictionMarketService (LMSR Implementation)

```typescript
interface PredictionMarketService {
    // Market creation
    createMarket(params: {
        creatorId: string;
        question: string;
        description: string;
        liquidityParameter: number; // 'b' in LMSR
        closesAt: Date;
    }): Promise<PredictionMarket>;

    // LMSR pricing functions
    calculatePrice(market: PredictionMarket, outcome: 'yes' | 'no'): number;
    calculateCost(market: PredictionMarket, outcome: 'yes' | 'no', shares: bigint): bigint;
    calculateProbability(market: PredictionMarket): number;

    // Trading
    buyShares(params: {
        marketId: string;
        userId: string;
        identityMode: IdentityMode;
        outcome: 'yes' | 'no';
        maxCost: bigint;
    }): Promise<MarketTrade>;

    sellShares(params: {
        marketId: string;
        userId: string;
        identityMode: IdentityMode;
        outcome: 'yes' | 'no';
        shares: bigint;
    }): Promise<MarketTrade>;

    // Resolution
    resolveMarket(marketId: string, outcome: 'yes' | 'no' | 'invalid', source: string): Promise<void>;
    distributeWinnings(marketId: string): Promise<void>;

    // Queries
    getMarketProbability(marketId: string): Promise<number>;
    getUserPosition(marketId: string, userId: string, identityMode: IdentityMode): Promise<MarketPosition>;
    getMarketHistory(marketId: string): Promise<MarketTrade[]>;
}

// LMSR Formula Implementation
class LSMRCalculator {
    /**
     * LMSR Cost Function: C(q) = b * ln(sum(e^(qi/b)))
     * Where:
     * - b = liquidity parameter (higher = more liquid, less volatile)
     * - qi = quantity of outcome i
     */
    calculateCost(b: number, qYes: number, qNo: number): number {
        return b * Math.log(Math.exp(qYes / b) + Math.exp(qNo / b));
    }

    /**
     * Price of outcome i: pi = e^(qi/b) / sum(e^(qj/b))
     */
    calculatePrice(b: number, qYes: number, qNo: number, outcome: 'yes' | 'no'): number {
        const expYes = Math.exp(qYes / b);
        const expNo = Math.exp(qNo / b);
        const sum = expYes + expNo;

        return outcome === 'yes' ? expYes / sum : expNo / sum;
    }

    /**
     * Cost to buy n shares: C(q + n) - C(q)
     */
    calculatePurchaseCost(b: number, qYes: number, qNo: number, outcome: 'yes' | 'no', shares: number): number {
        const currentCost = this.calculateCost(b, qYes, qNo);
        const newQYes = outcome === 'yes' ? qYes + shares : qYes;
        const newQNo = outcome === 'no' ? qNo + shares : qNo;
        const newCost = this.calculateCost(b, newQYes, newQNo);

        return newCost - currentCost;
    }
}
```

### 4. EpistemicScoringService

```typescript
interface EpistemicScoringService {
    // Score calculation
    calculateScore(targetType: string, targetId: string): Promise<EpistemicScore>;

    // Layer calculations
    calculateSurfaceLayer(target: any): Promise<LayerScore>;
    calculateContextualLayer(target: any): Promise<LayerScore>;
    calculateAnalyticalLayer(target: any): Promise<LayerScore>;
    calculateSynthesisLayer(target: any): Promise<LayerScore>;
    calculateMetaLayer(target: any): Promise<LayerScore>;

    // Factor management
    addFactor(scoreId: string, layer: string, factorType: string, value: number, weight: number): Promise<void>;
    updateFactorWeights(factorType: string, newWeight: number): Promise<void>;

    // Queries
    getScore(targetType: string, targetId: string): Promise<EpistemicScore>;
    getTopScores(targetType: string, limit: number): Promise<EpistemicScore[]>;

    // Decay management
    refreshScore(targetType: string, targetId: string): Promise<EpistemicScore>;
    pruneExpiredScores(): Promise<number>;
}

// Epistemic Funnel Implementation
class EpistemicFunnel {
    /**
     * Layer 1: Surface (0-100)
     * Quick heuristics: formatting, grammar, basic coherence
     */
    async calculateSurfaceScore(content: any): Promise<number> {
        const factors = {
            grammar: await this.checkGrammar(content.text),
            formatting: this.checkFormatting(content.text),
            length: this.evaluateLength(content.text),
            readability: await this.calculateReadability(content.text)
        };

        return this.weightedAverage(factors, {
            grammar: 0.3,
            formatting: 0.2,
            length: 0.2,
            readability: 0.3
        });
    }

    /**
     * Layer 2: Contextual (0-100)
     * Relevance, timeliness, author credibility
     */
    async calculateContextualScore(content: any, author: any): Promise<number> {
        const factors = {
            relevance: await this.checkRelevance(content),
            timeliness: this.evaluateTimeliness(content.createdAt),
            authorCredibility: author.lightScore || 50,
            sourceQuality: await this.evaluateSources(content.references)
        };

        return this.weightedAverage(factors, {
            relevance: 0.3,
            timeliness: 0.2,
            authorCredibility: 0.3,
            sourceQuality: 0.2
        });
    }

    /**
     * Layer 3: Analytical (0-100)
     * Logic, evidence, argumentation
     */
    async calculateAnalyticalScore(content: any): Promise<number> {
        const factors = {
            logicalConsistency: await this.checkLogic(content),
            evidenceQuality: await this.evaluateEvidence(content),
            argumentStrength: await this.evaluateArguments(content),
            counterarguments: await this.checkCounterarguments(content)
        };

        return this.weightedAverage(factors, {
            logicalConsistency: 0.3,
            evidenceQuality: 0.3,
            argumentStrength: 0.2,
            counterarguments: 0.2
        });
    }

    /**
     * Layer 4: Synthesis (0-100)
     * Integration, creativity, insight
     */
    async calculateSynthesisScore(content: any): Promise<number> {
        const factors = {
            integration: await this.evaluateIntegration(content),
            creativity: await this.evaluateCreativity(content),
            insight: await this.evaluateInsight(content),
            impact: await this.evaluateImpact(content)
        };

        return this.weightedAverage(factors, {
            integration: 0.25,
            creativity: 0.25,
            insight: 0.25,
            impact: 0.25
        });
    }

    /**
     * Layer 5: Meta (0-100)
     * Self-awareness, limitations, uncertainty
     */
    async calculateMetaScore(content: any): Promise<number> {
        const factors = {
            selfAwareness: await this.evaluateSelfAwareness(content),
            limitations: await this.checkLimitations(content),
            uncertainty: await this.evaluateUncertainty(content),
            updates: await this.checkForUpdates(content)
        };

        return this.weightedAverage(factors, {
            selfAwareness: 0.3,
            limitations: 0.3,
            uncertainty: 0.2,
            updates: 0.2
        });
    }

    /**
     * Final weighted score across all layers
     */
    calculateFinalScore(layers: LayerScores): number {
        // Later layers get more weight (funnel narrows)
        const weights = {
            surface: 0.1,
            contextual: 0.15,
            analytical: 0.25,
            synthesis: 0.25,
            meta: 0.25
        };

        return Math.round(
            layers.surface * weights.surface +
            layers.contextual * weights.contextual +
            layers.analytical * weights.analytical +
            layers.synthesis * weights.synthesis +
            layers.meta * weights.meta
        );
    }
}
```

### 5. ContentNFTService

```typescript
interface ContentNFTService {
    // Certification
    certifyContent(params: {
        contentType: string;
        contentId: string;
        creatorId: string;
        minimumScore?: number;
    }): Promise<ContentNFT>;

    // Minting (future integration with Module 19: Cardano)
    prepareMintData(nftId: string): Promise<NFTMetadata>;
    recordMint(nftId: string, tokenId: string, txHash: string): Promise<void>;

    // Queries
    getNFT(nftId: string): Promise<ContentNFT>;
    getCreatorNFTs(creatorId: string): Promise<ContentNFT[]>;
    getCertificationRequirements(level: string): Promise<CertificationRequirements>;

    // Trading (future)
    enableTrading(nftId: string): Promise<void>;
    lockCosmoFlux(nftId: string, amount: bigint): Promise<void>; // Module 23
}
```

### 6. ThalyraService

```typescript
interface ThalyraService {
    // Threat detection
    scanForThreats(): Promise<ThreatReport[]>;
    analyzeTarget(targetType: string, targetId: string): Promise<ThreatAssessment>;

    // Pattern detection
    detectCoordination(userIds: string[]): Promise<CoordinationPattern[]>;
    detectManipulation(contentId: string): Promise<ManipulationSignal[]>;
    detectMisinformation(text: string): Promise<MisinformationScore>;

    // Real-time monitoring (7-second heartbeat)
    startHeartbeat(): void;
    stopHeartbeat(): void;
    onHeartbeat(callback: (cycle: number) => void): void;

    // Response actions
    flagContent(contentId: string, reason: string): Promise<void>;
    freezeAccount(userId: string, duration: number): Promise<void>;
    alertAdmins(threat: ThreatDetection): Promise<void>;

    // Review system
    submitForReview(detectionId: string): Promise<void>;
    reviewDetection(detectionId: string, outcome: string): Promise<void>;
}

// Thalyra Implementation
class ThalyraAI {
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private currentCycle = 0;

    /**
     * Start 7-second heartbeat synchronized with Pentos and 7 Pillars
     */
    startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            this.currentCycle++;
            this.performScan();
        }, 7000); // 7 seconds
    }

    /**
     * Core threat detection algorithm
     */
    async performScan(): Promise<void> {
        const threats = await Promise.all([
            this.scanForCoordination(),
            this.scanForManipulation(),
            this.scanForMisinformation(),
            this.scanForSpam(),
            this.scanForImpersonation()
        ]);

        const flatThreats = threats.flat();

        for (const threat of flatThreats) {
            await this.processThreat(threat);
        }
    }

    /**
     * Coordination detection using graph analysis
     */
    async scanForCoordination(): Promise<ThreatDetection[]> {
        // Look for unusual voting patterns
        // Detect synchronized account creation
        // Identify brigading behavior
        // Check for network effects
    }

    /**
     * Manipulation detection using ML patterns
     */
    async scanForManipulation(): Promise<ThreatDetection[]> {
        // Detect vote manipulation
        // Identify astroturfing
        // Find sockpuppet accounts
        // Check for artificial amplification
    }
}
```

---

## 🔌 API Endpoints

### Base Path: `/api/verification`

#### Proof of Humanity Endpoints

```typescript
// Initiate verification
POST /poh/initiate
Body: { userId: string, identityMode: string }
Response: { sessionId: string, requiredMethods: string[], expiresAt: Date }

// Submit verification method
POST /poh/verify
Body: { sessionId: string, method: string, data: any }
Response: { success: boolean, score: number, nextSteps?: string[] }

// Get verification status
GET /poh/status/:userId/:identityMode
Response: { level: number, status: string, scores: PoHScores, expiresAt: Date }

// Check feature access
GET /poh/access/:userId/:feature
Response: { hasAccess: boolean, requiredLevel?: number, currentLevel: number }

// Get verification methods
GET /poh/methods
Response: { methods: VerificationMethod[] }
```

#### Veracity Bond Endpoints

```typescript
// Create a bond
POST /bonds
Body: {
    targetType: string,
    targetId: string,
    amount: bigint,
    claimText?: string,
    confidence: number
}
Response: { bondId: string, status: string, expiresAt: Date }

// Get bond details
GET /bonds/:bondId
Response: { bond: VeracityBond }

// Get user's bonds
GET /bonds/user/:userId/:identityMode
Query: { status?: string, limit?: number, offset?: number }
Response: { bonds: VeracityBond[], total: number }

// Challenge a bond
POST /bonds/:bondId/challenge
Body: { amount: bigint, reason: string, evidence?: any }
Response: { challengeId: string, status: string }

// Resolve a bond
POST /bonds/:bondId/resolve
Body: { truthful: boolean, evidence: any }
Response: { resolution: BondResolution, slashedAmount?: bigint }

// Get bonds for target
GET /bonds/target/:targetType/:targetId
Response: { bonds: VeracityBond[], totalStaked: bigint }
```

#### Prediction Market Endpoints (LMSR)

```typescript
// Create market
POST /markets
Body: {
    question: string,
    description: string,
    liquidityParameter: number,
    closesAt: Date,
    category?: string
}
Response: { marketId: string, initialProbability: number }

// Get market details
GET /markets/:marketId
Response: { market: PredictionMarket, probability: number, volume: bigint }

// Get market price
GET /markets/:marketId/price/:outcome
Response: { price: number, shares: bigint }

// Calculate trade cost
POST /markets/:marketId/quote
Body: { outcome: string, shares: bigint }
Response: { cost: bigint, newProbability: number, priceImpact: number }

// Buy shares
POST /markets/:marketId/buy
Body: { outcome: string, maxCost: bigint }
Response: { trade: MarketTrade, shares: bigint, actualCost: bigint }

// Sell shares
POST /markets/:marketId/sell
Body: { outcome: string, shares: bigint }
Response: { trade: MarketTrade, proceeds: bigint }

// Get user position
GET /markets/:marketId/position/:userId/:identityMode
Response: { position: MarketPosition, currentValue: bigint, pnl: bigint }

// Get market history
GET /markets/:marketId/history
Query: { limit?: number, offset?: number }
Response: { trades: MarketTrade[], priceHistory: PricePoint[] }

// Resolve market
POST /markets/:marketId/resolve
Body: { outcome: string, source: string }
Response: { resolution: MarketResolution, payouts: Payout[] }

// List markets
GET /markets
Query: { status?: string, category?: string, sort?: string, limit?: number }
Response: { markets: PredictionMarket[], total: number }
```

#### Epistemic Scoring Endpoints

```typescript
// Calculate score
POST /epistemic/calculate
Body: { targetType: string, targetId: string, force?: boolean }
Response: { score: EpistemicScore, layers: LayerScores }

// Get score
GET /epistemic/:targetType/:targetId
Response: { score: EpistemicScore, factors: EpistemicFactor[] }

// Get top scores
GET /epistemic/top/:targetType
Query: { limit?: number, timeframe?: string }
Response: { scores: EpistemicScore[] }

// Add custom factor
POST /epistemic/factors
Body: {
    scoreId: string,
    layer: string,
    factorType: string,
    value: number,
    weight: number
}
Response: { factorId: string, updatedScore: number }

// Refresh score
POST /epistemic/:targetType/:targetId/refresh
Response: { oldScore: number, newScore: number, changes: ScoreChange[] }
```

#### Content NFT Endpoints

```typescript
// Certify content
POST /nfts/certify
Body: {
    contentType: string,
    contentId: string,
    minimumScore?: number
}
Response: { nftId: string, certificationLevel: string, eligible: boolean }

// Get NFT details
GET /nfts/:nftId
Response: { nft: ContentNFT, metadata: NFTMetadata }

// Get creator's NFTs
GET /nfts/creator/:creatorId
Query: { minted?: boolean, limit?: number }
Response: { nfts: ContentNFT[], total: number }

// Prepare mint data
GET /nfts/:nftId/mint-data
Response: { metadata: NFTMetadata, ipfsUri?: string }

// Record mint
POST /nfts/:nftId/mint
Body: { tokenId: string, txHash: string }
Response: { success: boolean, nft: ContentNFT }

// Get certification requirements
GET /nfts/requirements/:level
Response: { minimumScore: number, requirements: Requirement[] }
```

#### Thalyra AI Endpoints

```typescript
// Get current threats
GET /thalyra/threats
Query: { severity?: string, type?: string, limit?: number }
Response: { threats: ThreatDetection[], summary: ThreatSummary }

// Analyze specific target
POST /thalyra/analyze
Body: { targetType: string, targetId: string }
Response: { assessment: ThreatAssessment, recommendations: Action[] }

// Get detection details
GET /thalyra/detections/:detectionId
Response: { detection: ThalyraDetection, evidence: Evidence[] }

// Submit review
POST /thalyra/detections/:detectionId/review
Body: { outcome: string, notes?: string }
Response: { reviewId: string, updated: ThalyraDetection }

// Get heartbeat status
GET /thalyra/heartbeat
Response: { active: boolean, currentCycle: number, lastScan: Date }

// Get threat statistics
GET /thalyra/stats
Query: { timeframe?: string }
Response: {
    totalThreats: number,
    byType: Record<string, number>,
    bySeverity: Record<string, number>,
    falsePositiveRate: number
}
```

---

## 🔗 Integration Points

### Module 04: Economy Integration

```typescript
// When creating veracity bonds
economyService.lockTokens(userId, identityMode, 'GRAT', amount);

// When slashing bonds
economyService.transferTokens(fromUser, toUser, 'GRAT', slashedAmount);

// When trading prediction markets
economyService.transferTokens(userId, marketPool, 'GRAT', cost);

// Light Score updates from epistemic scores
economyService.updateLightScore(userId, newScore, 'epistemic_contribution');
```

### Module 06: Governance Integration

```typescript
// Check PoH before allowing votes
if (!verificationService.proofOfHumanity.checkAccess(userId, 'voting')) {
    throw new Error('Proof of Humanity required for voting');
}

// Create prediction markets for governance proposals
verificationService.predictionMarkets.createMarket({
    question: `Will proposal ${proposalId} pass?`,
    closesAt: proposal.votingEndsAt
});

// Use veracity bonds for proposal claims
verificationService.veracityBonds.createBond({
    targetType: 'proposal',
    targetId: proposalId,
    amount: 1000n,
    claimText: 'This proposal will improve the platform'
});
```

### Module 10: Analytics Integration

```typescript
// Feed epistemic scores to analytics
analyticsService.recordEpistemicScore(targetType, targetId, score);

// Track prediction market accuracy
analyticsService.recordMarketResolution(marketId, predicted, actual);

// Monitor Thalyra detection rates
analyticsService.recordThreatDetection(threat);
```

### Module 11: 7 Pillars Integration

```typescript
// Tag content with pillar and epistemic score
const pillarId = sevenPillarsService.getContentPillar(contentId);
const epistemicScore = await verificationService.epistemicScoring.calculateScore('content', contentId);
sevenPillarsService.updatePillarQuality(pillarId, epistemicScore);

// Create prediction markets for seed questions
for (const question of pillar.seedQuestions) {
    await verificationService.predictionMarkets.createMarket({
        question: question.text,
        category: `pillar_${pillar.id}`,
        liquidityParameter: 1000 // Higher liquidity for important questions
    });
}
```

### Module 14: Pentos Integration

```typescript
// Thalyra and Pentos share 7-second heartbeat
verificationService.thalyra.onHeartbeat((cycle) => {
    pentosService.syncHeartbeat(cycle);
});

// Pentos explains verification to users
pentosService.registerHelper('verification', {
    explainPoH: () => "Proof of Humanity ensures you're a real person...",
    explainBonds: () => "Veracity bonds let you stake Gratium on truth...",
    explainLSMR: () => "Our prediction markets use LMSR for efficient pricing..."
});
```

---

## 📊 Database Indexes & Performance

### Critical Indexes

```sql
-- High-frequency queries
CREATE INDEX idx_poh_user_lookup ON proof_of_humanity(user_id, identity_mode, status, expires_at);
CREATE INDEX idx_bonds_active ON veracity_bonds(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_markets_open ON prediction_markets(status, closes_at) WHERE status = 'open';
CREATE INDEX idx_epistemic_fresh ON epistemic_scores(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX idx_thalyra_pending ON thalyra_detections(manual_review_required, reviewed_at)
    WHERE manual_review_required = true AND reviewed_at IS NULL;

-- Join optimization
CREATE INDEX idx_market_positions_join ON market_positions(market_id, user_id, identity_mode);
CREATE INDEX idx_bond_challenges_join ON bond_challenges(bond_id, status);
CREATE INDEX idx_epistemic_factors_join ON epistemic_factors(score_id, layer);

-- Time-series data
CREATE INDEX idx_market_trades_time ON market_trades(market_id, created_at DESC);
CREATE INDEX idx_thalyra_heartbeat_time ON thalyra_detections(heartbeat_cycle, detected_at DESC);
```

### Materialized Views

```sql
-- Market probability tracking
CREATE MATERIALIZED VIEW market_probabilities AS
SELECT
    pm.id,
    pm.question,
    pm.current_probability,
    pm.total_volume,
    pm.unique_traders,
    pm.closes_at,
    COUNT(mt.id) as trade_count,
    MAX(mt.created_at) as last_trade_at
FROM prediction_markets pm
LEFT JOIN market_trades mt ON mt.market_id = pm.id
WHERE pm.status = 'open'
GROUP BY pm.id;

-- User verification summary
CREATE MATERIALIZED VIEW user_verification_status AS
SELECT
    u.id as user_id,
    poh_true.level as true_self_level,
    poh_shadow.level as shadow_level,
    COALESCE(poh_true.status, 'unverified') as true_self_status,
    COALESCE(poh_shadow.status, 'unverified') as shadow_status,
    COUNT(DISTINCT vb.id) as active_bonds,
    COUNT(DISTINCT mp.market_id) as market_positions
FROM users u
LEFT JOIN proof_of_humanity poh_true ON poh_true.user_id = u.id AND poh_true.identity_mode = 'true_self'
LEFT JOIN proof_of_humanity poh_shadow ON poh_shadow.user_id = u.id AND poh_shadow.identity_mode = 'shadow'
LEFT JOIN veracity_bonds vb ON vb.user_id = u.id AND vb.status = 'active'
LEFT JOIN market_positions mp ON mp.user_id = u.id
GROUP BY u.id, poh_true.level, poh_shadow.level, poh_true.status, poh_shadow.status;

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY market_probabilities;
REFRESH MATERIALIZED VIEW CONCURRENTLY user_verification_status;
```

---

## 🧪 Testing Strategy

### Unit Tests (80% coverage target)

```typescript
// ProofOfHumanityService tests
describe('ProofOfHumanityService', () => {
    test('should initiate verification session');
    test('should calculate behavioral score correctly');
    test('should upgrade level when all requirements met');
    test('should deny access for insufficient level');
    test('should handle multiple verification methods');
    test('should expire sessions after timeout');
});

// LMSR Calculator tests
describe('LMSR Calculator', () => {
    test('should calculate correct price for given quantities');
    test('should maintain probability sum of 1');
    test('should increase price with demand');
    test('should handle edge cases (0 liquidity, max shares)');
    test('should calculate correct purchase cost');
});

// Epistemic Funnel tests
describe('Epistemic Funnel', () => {
    test('should calculate all 5 layers');
    test('should weight layers correctly');
    test('should handle missing data gracefully');
    test('should decay scores over time');
    test('should integrate custom factors');
});
```

### Integration Tests

```typescript
// End-to-end verification flow
describe('Verification Flow', () => {
    test('Complete PoH verification → Create bond → Challenge → Resolve');
    test('Create market → Trade → Resolve → Distribute winnings');
    test('Content creation → Epistemic scoring → NFT certification');
    test('Threat detection → Auto-action → Manual review');
});
```

### Performance Tests

```typescript
// Load testing
describe('Performance', () => {
    test('Handle 1000 concurrent PoH verifications');
    test('Process 10,000 market trades per minute');
    test('Calculate epistemic scores for 1000 items in < 5 seconds');
    test('Thalyra scan completes within 7-second heartbeat');
});
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Core Services (Days 1-3)
1. Create all 11 tables with migrations
2. Implement ProofOfHumanityService
3. Implement VeracityBondService
4. Write unit tests

### Phase 2: Advanced Services (Days 4-6)
1. Implement LMSR PredictionMarketService
2. Implement EpistemicScoringService (5 layers)
3. Implement ContentNFTService
4. Write unit tests

### Phase 3: AI & Integration (Days 7-8)
1. Implement ThalyraService with heartbeat
2. Integrate with Modules 04, 06
3. Write integration tests

### Phase 4: API & Documentation (Days 9-10)
1. Implement all 40+ API endpoints
2. Write API documentation
3. Performance testing
4. Final integration testing

---

## 🔒 Security Considerations

### Attack Vectors & Mitigations

1. **Sybil Attacks**
   - Mitigation: Multi-factor PoH with economic requirements
   - Minimum stake requirements for participation

2. **Market Manipulation**
   - Mitigation: LMSR provides automatic market making
   - Liquidity parameter prevents large price swings
   - Bond requirements for market creation

3. **False Positive Threats**
   - Mitigation: Manual review process
   - Appeals mechanism
   - Confidence thresholds

4. **Gaming Epistemic Scores**
   - Mitigation: Multi-layer evaluation
   - Time decay
   - Cross-referencing with other signals

5. **Bond Griefing**
   - Mitigation: Challenge requires matching stake
   - Time limits on challenges
   - Slashing for false challenges

---

## 📝 Configuration

```typescript
// Module 09 Configuration
export const VERIFICATION_CONFIG = {
    // Proof of Humanity
    poh: {
        verificationMethods: ['captcha', 'email', 'phone', 'worldcoin', 'vouching', 'economic'],
        levelRequirements: {
            1: ['captcha', 'email'],
            2: ['phone'],
            3: ['worldcoin', 'vouching'],
            4: ['economic'],
            5: ['all']
        },
        reverificationDays: 90,
        sessionTimeout: 3600 // 1 hour
    },

    // Veracity Bonds
    bonds: {
        minimumAmount: 100n, // 100 GRAT
        maximumAmount: 1000000n, // 1M GRAT
        defaultDuration: 30 * 24 * 60 * 60, // 30 days
        slashingPercentage: 50, // 50% slash for false claims
        challengeWindow: 7 * 24 * 60 * 60 // 7 days to challenge
    },

    // Prediction Markets
    markets: {
        defaultLiquidity: 1000, // b parameter
        minimumLiquidity: 100,
        maximumLiquidity: 10000,
        minimumTradingPeriod: 24 * 60 * 60, // 24 hours
        maximumTradingPeriod: 365 * 24 * 60 * 60, // 1 year
        creationCost: 100 // 100 PollCoin to create market
    },

    // Epistemic Scoring
    epistemic: {
        layerWeights: {
            surface: 0.1,
            contextual: 0.15,
            analytical: 0.25,
            synthesis: 0.25,
            meta: 0.25
        },
        scoreDecayDays: 30,
        minimumConfidence: 0.3,
        cacheTimeout: 3600 // 1 hour cache
    },

    // Content NFT
    nft: {
        certificationLevels: {
            bronze: { minScore: 60, cost: 10 },
            silver: { minScore: 75, cost: 25 },
            gold: { minScore: 85, cost: 50 },
            platinum: { minScore: 95, cost: 100 }
        },
        metadataStandard: 'ERC721',
        storageProvider: 'arweave' // Module 20
    },

    // Thalyra AI
    thalyra: {
        heartbeatInterval: 7000, // 7 seconds
        threatThresholds: {
            low: 0.3,
            medium: 0.5,
            high: 0.7,
            critical: 0.9
        },
        autoActionThreshold: 0.8,
        batchSize: 100, // Process 100 items per heartbeat
        mlModelVersion: '1.0.0'
    }
};
```

---

## 🎯 Success Metrics

### Key Performance Indicators

1. **Proof of Humanity**
   - Target: 80% of active users verified to Level 2+
   - Verification completion rate > 70%
   - False positive rate < 5%

2. **Veracity Bonds**
   - Average bond size: 500 GRAT
   - Challenge rate: 5-10% of bonds
   - Truthful resolution rate > 85%

3. **Prediction Markets**
   - Market creation: 10+ per day
   - Trading volume: 100,000 GRAT per day
   - Prediction accuracy: 70%+ for resolved markets

4. **Epistemic Scoring**
   - Coverage: 90% of content has scores
   - Score distribution: Normal (bell curve)
   - User agreement with scores > 75%

5. **Thalyra AI**
   - Threat detection rate > 95%
   - False positive rate < 10%
   - Response time < 7 seconds

---

## 📚 Dependencies

### NPM Packages

```json
{
    "dependencies": {
        "@noble/hashes": "^1.3.0", // For cryptographic operations
        "jsonwebtoken": "^9.0.0", // For verification tokens
        "rate-limiter-flexible": "^3.0.0", // For API rate limiting
        "ioredis": "^5.3.0", // For caching (epistemic scores)
        "ml-kmeans": "^6.0.0", // For coordination detection
        "natural": "^6.0.0", // For NLP in epistemic scoring
        "compromise": "^14.0.0", // For text analysis
        "mathjs": "^11.0.0" // For LMSR calculations
    }
}
```

### Module Dependencies

- **Module 01**: Identity (for user identification)
- **Module 04**: Economy (for token operations)
- **Module 06**: Governance (for voting integration)
- **Module 10**: Analytics (data consumer)
- **Module 11**: 7 Pillars (content organization)
- **Module 14**: Pentos (heartbeat sync)
- **Module 20**: Arweave (future - NFT storage)

---

## 🏁 Definition of Done

### Module 09 is complete when:

1. ✅ All 11 database tables created and indexed
2. ✅ All 6 services implemented with full functionality
3. ✅ 40+ API endpoints operational
4. ✅ LMSR prediction markets working correctly
5. ✅ 5-layer epistemic funnel calculating scores
6. ✅ Thalyra AI detecting threats on 7-second heartbeat
7. ✅ Integration with Modules 04, 06 verified
8. ✅ 80% unit test coverage achieved
9. ✅ Integration tests passing
10. ✅ Performance benchmarks met
11. ✅ Security review completed
12. ✅ Documentation complete
13. ✅ Code review approved
14. ✅ Deployed to development environment

---

## 💡 Implementation Notes

### For Haiku Implementation

When implementing from this spec:

1. **Start with database** - Get schema perfect first
2. **Build services incrementally** - PoH → Bonds → Markets → Epistemic → NFT → Thalyra
3. **Test each service thoroughly** before moving on
4. **LMSR is complex** - Use the provided formulas exactly
5. **Epistemic scoring** - Start simple, add factors gradually
6. **Thalyra** - Begin with basic patterns, ML can be enhanced later
7. **Integration points** - Mock other modules initially, integrate later
8. **Performance** - Optimize queries after functionality works

### Critical Algorithms

1. **LMSR Price Function**: `p = e^(q/b) / Σe^(q/b)`
2. **Epistemic Weighting**: Later layers matter more
3. **PoH Multi-factor**: All factors must pass threshold
4. **Bond Slashing**: Distributed to challengers proportionally
5. **Thalyra Patterns**: Graph analysis for coordination

---

## 🎬 Next Steps

After this specification is approved:

1. **Haiku Session 1**: Database + PoH + Veracity Bonds
2. **Haiku Session 2**: Prediction Markets + Epistemic Scoring
3. **Haiku Session 3**: Content NFT + Thalyra + Integration

Each session should reference this specification document for implementation details.

---

**END OF SPECIFICATION**

Total Components: 6
Total Tables: 11
Total API Endpoints: 40+
Estimated LOC: 9,000-11,000
Timeline: 10 days (2 weeks with buffer)