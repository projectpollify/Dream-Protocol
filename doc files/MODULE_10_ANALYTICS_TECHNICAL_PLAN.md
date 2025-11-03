# 📊 Module 10: Analytics - Technical Specification
## Shadow Consensus Calculator & Platform Health Dashboard for Dream Protocol

**Module Number**: 10 of 22  
**Build Priority**: PRIORITY 4 - Truth Discovery  
**Dependencies**: Module 01 (Identity), Module 04 (Economy), Module 06 (Governance), Module 07 (Content), Module 08 (Social)  
**Dependents**: Module 11 (7 Pillars), Module 13 (Dashboard), Module 18 (Gamification)  
**Status**: 📋 Design Phase - Ready for Technical Planning

---

## 🎯 Module Overview

### **Purpose**
Module 10 is the analytics engine that reveals the hidden patterns in Dream Protocol's dual-identity system. This is where the revolutionary **Shadow Consensus** metric comes to life—exposing the gap between public personas and private convictions. It's your platform's "social telescope" that can predict future opinion shifts by analyzing current divergence patterns.

### **Core Philosophy**
> "Shadow Consensus is the key to understanding society's true beliefs. When people vote differently in private than in public, we're witnessing social pressure in action. By measuring this gap, we can predict which ideas will become mainstream tomorrow by seeing what people believe privately today."

### **Key Innovation**
The **Shadow Consensus Delta**—a proprietary metric that quantifies the difference between:
- What communities say publicly (True Self votes)
- What they believe privately (Shadow votes)

This creates unprecedented insights into censorship, social pressure, and future trends.

---

## 🗏 What This Module Does

### **Primary Functions**

1. **Shadow Consensus Calculator** - Core algorithm computing divergence between public/private voting
2. **Trend Analysis Engine** - Identifies patterns and predicts future opinion shifts
3. **Conviction vs Reputation Correlator** - Analyzes relationship between Light Score and voting patterns
4. **Platform Health Dashboard** - Real-time metrics on engagement, growth, and system health
5. **Leading Indicators** - Early warning system for community sentiment changes
6. **Heat Score Calculation** - Measures discussion intensity and engagement levels
7. **Social Pressure Quantification** - Calculates magnitude of conformity pressure
8. **Predictive Modeling** - Forecasts when private beliefs will become public consensus
9. **Demographic Breakdowns** - Segment Shadow Consensus by user cohorts
10. **Historical Pattern Analysis** - Tracks how gaps evolve over time

---

## 🏗️ Technical Architecture

### **Database Schema**

#### **Table 1: `shadow_consensus_snapshots`**
Stores calculated Shadow Consensus for each poll at regular intervals:

```sql
CREATE TABLE shadow_consensus_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES governance_polls(id) ON DELETE CASCADE,
    
    -- Snapshot Timing
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    hours_since_poll_start INTEGER NOT NULL,
    snapshot_type VARCHAR(20) CHECK (snapshot_type IN (
        'hourly', 'daily', 'final', 'milestone'
    )),
    
    -- Vote Counts
    true_self_yes_count INTEGER DEFAULT 0,
    true_self_no_count INTEGER DEFAULT 0,
    shadow_yes_count INTEGER DEFAULT 0,
    shadow_no_count INTEGER DEFAULT 0,
    
    -- Percentages
    true_self_yes_percent DECIMAL(5,2),
    true_self_no_percent DECIMAL(5,2),
    shadow_yes_percent DECIMAL(5,2),
    shadow_no_percent DECIMAL(5,2),
    
    -- THE KEY METRIC: Shadow Consensus Delta
    consensus_delta DECIMAL(5,2), -- Absolute difference in YES%
    delta_direction VARCHAR(50) CHECK (delta_direction IN (
        'ALIGNED',
        'PUBLIC_SUPPORT_PRIVATE_OPPOSITION',
        'PUBLIC_OPPOSITION_PRIVATE_SUPPORT'
    )),
    
    -- Social Pressure Score (0-100)
    social_pressure_score DECIMAL(5,2),
    
    -- Statistical Confidence
    confidence_interval DECIMAL(4,2), -- ± percentage
    sample_size INTEGER,
    statistical_significance BOOLEAN,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shadow_consensus_poll ON shadow_consensus_snapshots(poll_id);
CREATE INDEX idx_shadow_consensus_timestamp ON shadow_consensus_snapshots(snapshot_timestamp);
CREATE INDEX idx_shadow_consensus_delta ON shadow_consensus_snapshots(consensus_delta DESC);
```

#### **Table 2: `trend_predictions`**
Stores predictive analytics about future opinion shifts:

```sql
CREATE TABLE trend_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES governance_polls(id),
    
    -- Prediction Details
    prediction_type VARCHAR(30) CHECK (prediction_type IN (
        'opinion_shift',
        'consensus_convergence',
        'tipping_point',
        'cascade_effect'
    )),
    
    -- Current State
    current_delta DECIMAL(5,2),
    current_direction VARCHAR(50),
    
    -- Prediction
    predicted_delta_7d DECIMAL(5,2),
    predicted_delta_30d DECIMAL(5,2),
    predicted_convergence_date DATE,
    confidence_score DECIMAL(3,2), -- 0-1 scale
    
    -- Historical Basis
    similar_historical_patterns INTEGER, -- Count of similar past patterns
    average_convergence_days INTEGER,
    
    -- Reasoning
    prediction_reasoning JSONB, -- ML model features
    key_factors TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trend_predictions_poll ON trend_predictions(poll_id);
CREATE INDEX idx_trend_predictions_confidence ON trend_predictions(confidence_score DESC);
```

#### **Table 3: `conviction_analysis`**
Analyzes relationship between reputation (Light Score) and voting patterns:

```sql
CREATE TABLE conviction_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES governance_polls(id),
    
    -- Reputation Segments
    high_light_score_threshold DECIMAL(5,2) DEFAULT 70,
    mid_light_score_threshold DECIMAL(5,2) DEFAULT 40,
    
    -- Voting Patterns by Reputation
    high_reputation_true_yes DECIMAL(5,2),
    high_reputation_shadow_yes DECIMAL(5,2),
    high_reputation_delta DECIMAL(5,2),
    
    mid_reputation_true_yes DECIMAL(5,2),
    mid_reputation_shadow_yes DECIMAL(5,2),
    mid_reputation_delta DECIMAL(5,2),
    
    low_reputation_true_yes DECIMAL(5,2),
    low_reputation_shadow_yes DECIMAL(5,2),
    low_reputation_delta DECIMAL(5,2),
    
    -- Key Insights
    reputation_correlation DECIMAL(4,3), -- -1 to 1
    interpretation VARCHAR(100),
    
    -- Stakes Analysis
    average_stake_yes DECIMAL(10,2),
    average_stake_no DECIMAL(10,2),
    stake_conviction_ratio DECIMAL(5,2), -- Higher stake = stronger conviction
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conviction_poll ON conviction_analysis(poll_id);
CREATE INDEX idx_conviction_correlation ON conviction_analysis(reputation_correlation);
```

#### **Table 4: `platform_health_metrics`**
Real-time platform health tracking:

```sql
CREATE TABLE platform_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time Window
    metric_timestamp TIMESTAMPTZ NOT NULL,
    window_type VARCHAR(20) CHECK (window_type IN (
        'realtime', 'hourly', 'daily', 'weekly'
    )),
    
    -- User Metrics
    active_users INTEGER,
    new_users INTEGER,
    verified_humans INTEGER,
    dual_identity_users INTEGER, -- Using both True Self + Shadow
    
    -- Engagement Metrics
    total_votes_cast INTEGER,
    shadow_participation_rate DECIMAL(5,2), -- % voting with Shadow
    average_session_duration INTEGER, -- seconds
    polls_created INTEGER,
    
    -- Economic Health
    pollcoin_velocity DECIMAL(10,2), -- Transaction volume / supply
    gratium_staked DECIMAL(12,2),
    average_light_score DECIMAL(5,2),
    economic_participation_rate DECIMAL(5,2), -- % with active wallets
    
    -- Content Metrics
    posts_created INTEGER,
    comments_created INTEGER,
    reactions_given INTEGER,
    content_quality_score DECIMAL(5,2), -- Based on engagement
    
    -- System Performance
    api_response_time_ms INTEGER,
    error_rate DECIMAL(5,4),
    
    -- Bot Detection
    suspected_bot_accounts INTEGER,
    sybil_attack_probability DECIMAL(3,2), -- 0-1
    
    -- Health Score (0-100)
    overall_health_score DECIMAL(5,2),
    health_status VARCHAR(20) CHECK (health_status IN (
        'healthy', 'monitoring', 'concern', 'critical'
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_metrics_timestamp ON platform_health_metrics(metric_timestamp DESC);
CREATE INDEX idx_health_metrics_status ON platform_health_metrics(health_status);
```

#### **Table 5: `heat_scores`**
Tracks discussion intensity and engagement heat:

```sql
CREATE TABLE heat_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    reference_type VARCHAR(30) CHECK (reference_type IN (
        'poll', 'post', 'chamber', 'pillar', 'topic'
    )),
    reference_id UUID NOT NULL,
    
    -- Heat Calculation
    view_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Velocity Metrics
    views_per_hour DECIMAL(8,2),
    comments_per_hour DECIMAL(8,2),
    acceleration DECIMAL(6,2), -- Rate of change in engagement
    
    -- Heat Score (0-100)
    current_heat_score DECIMAL(5,2),
    peak_heat_score DECIMAL(5,2),
    heat_trend VARCHAR(20) CHECK (heat_trend IN (
        'heating', 'cooling', 'stable', 'explosive'
    )),
    
    -- Time Tracking
    first_activity TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    peak_activity TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_heat_scores_reference ON heat_scores(reference_type, reference_id);
CREATE INDEX idx_heat_scores_current ON heat_scores(current_heat_score DESC);
CREATE INDEX idx_heat_scores_trend ON heat_scores(heat_trend);
```

---

## 🔧 Core Algorithms

### **1. Shadow Consensus Calculation**

```typescript
interface ShadowConsensusResult {
  consensusDelta: number;
  direction: 'ALIGNED' | 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION' | 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT';
  socialPressureScore: number;
  interpretation: string;
  confidenceInterval: number;
  futureDirection: PredictedShift;
}

async function calculateShadowConsensus(
  pollId: string,
  timestamp: Date
): Promise<ShadowConsensusResult> {
  // 1. Get vote counts
  const trueSelfVotes = await getVotesByIdentity(pollId, 'true_self');
  const shadowVotes = await getVotesByIdentity(pollId, 'shadow');
  
  // 2. Calculate percentages
  const trueYesPercent = (trueSelfVotes.yes / trueSelfVotes.total) * 100;
  const shadowYesPercent = (shadowVotes.yes / shadowVotes.total) * 100;
  
  // 3. THE KEY METRIC: Calculate delta
  const consensusDelta = Math.abs(trueYesPercent - shadowYesPercent);
  
  // 4. Determine direction
  let direction: string;
  if (consensusDelta < 10) {
    direction = 'ALIGNED';
  } else if (trueYesPercent > shadowYesPercent) {
    direction = 'PUBLIC_SUPPORT_PRIVATE_OPPOSITION';
  } else {
    direction = 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT';
  }
  
  // 5. Calculate social pressure (proprietary algorithm)
  const socialPressureScore = calculateSocialPressure(
    consensusDelta,
    trueSelfVotes.total,
    shadowVotes.total,
    await getHistoricalPatterns(pollId)
  );
  
  // 6. Statistical confidence
  const confidenceInterval = calculateConfidence(
    trueSelfVotes.total + shadowVotes.total
  );
  
  // 7. Predict future shift
  const futureDirection = await predictFutureShift(
    consensusDelta,
    direction,
    await getHistoricalSimilarPolls(pollId)
  );
  
  return {
    consensusDelta,
    direction,
    socialPressureScore,
    interpretation: interpretDelta(consensusDelta, direction),
    confidenceInterval,
    futureDirection
  };
}
```

### **2. Social Pressure Score Algorithm**

```typescript
function calculateSocialPressure(
  delta: number,
  trueVotes: number,
  shadowVotes: number,
  historicalPatterns: HistoricalData[]
): number {
  // Component 1: Delta magnitude (0-100 scale)
  const deltaComponent = delta; // Already 0-100
  
  // Component 2: Participation gap
  // More Shadow voters = people avoiding public stance
  const participationGap = shadowVotes > trueVotes 
    ? ((shadowVotes - trueVotes) / shadowVotes) * 100
    : 0;
  
  // Component 3: Historical baseline
  const historicalAverage = calculateHistoricalAverage(historicalPatterns);
  const deviationFromNorm = Math.abs(delta - historicalAverage);
  
  // Component 4: Velocity of change
  const velocity = calculateDeltaVelocity(historicalPatterns);
  
  // Weighted combination (PROPRIETARY WEIGHTS)
  const weights = {
    delta: 0.40,
    participation: 0.25,
    deviation: 0.20,
    velocity: 0.15
  };
  
  const score = (
    deltaComponent * weights.delta +
    participationGap * weights.participation +
    deviationFromNorm * weights.deviation +
    velocity * weights.velocity
  );
  
  return Math.min(Math.max(score, 0), 100);
}
```

### **3. Predictive Analytics Engine**

```typescript
async function predictFutureShift(
  currentDelta: number,
  direction: string,
  historicalSimilar: Poll[]
): Promise<PredictedShift> {
  // Analyze historical patterns
  const patterns = historicalSimilar.map(poll => ({
    initialDelta: poll.initialDelta,
    finalDelta: poll.finalDelta,
    daysToConvergence: poll.convergenceDays,
    direction: poll.direction
  }));
  
  // Machine learning features
  const features = {
    currentDelta,
    direction,
    averageConvergenceDays: average(patterns.map(p => p.daysToConvergence)),
    deltaDecayRate: calculateDecayRate(patterns),
    similarPatternCount: patterns.length
  };
  
  // Core hypothesis: Private conviction becomes public opinion
  if (direction === 'PUBLIC_OPPOSITION_PRIVATE_SUPPORT') {
    // Shadow supports, True Self doesn't yet
    // Prediction: Public will shift toward support
    const daysToShift = estimateShiftTimeline(features);
    const expectedDelta7d = currentDelta * 0.75; // 25% convergence per week
    const expectedDelta30d = currentDelta * 0.40; // 60% convergence per month
    
    return {
      direction: 'shift_toward_support',
      timeline: daysToShift,
      confidence: calculateConfidence(patterns.length),
      expectedDelta7d,
      expectedDelta30d,
      reasoning: 'Historical patterns show private support typically becomes public within 30-45 days'
    };
  }
  
  // Additional prediction logic...
  return generatePrediction(features, patterns);
}
```

### **4. Heat Score Calculation**

```typescript
function calculateHeatScore(metrics: EngagementMetrics): number {
  const {
    viewsPerHour,
    commentsPerHour,
    reactionsPerHour,
    uniqueViewersPerHour,
    shareCount
  } = metrics;
  
  // Normalize each metric to 0-100 scale
  const viewScore = Math.min(viewsPerHour / 100, 1) * 100;
  const commentScore = Math.min(commentsPerHour / 20, 1) * 100;
  const reactionScore = Math.min(reactionsPerHour / 50, 1) * 100;
  const viralityScore = Math.min(shareCount / 10, 1) * 100;
  
  // Calculate acceleration (is engagement speeding up?)
  const acceleration = calculateAcceleration(metrics.history);
  const accelerationBonus = acceleration > 0 ? acceleration * 10 : 0;
  
  // Weighted combination
  const weights = {
    views: 0.20,
    comments: 0.30,
    reactions: 0.25,
    virality: 0.25
  };
  
  const baseScore = (
    viewScore * weights.views +
    commentScore * weights.comments +
    reactionScore * weights.reactions +
    viralityScore * weights.virality
  );
  
  return Math.min(baseScore + accelerationBonus, 100);
}
```

---

## 🚀 API Endpoints

### **1. GET /api/v1/analytics/shadow-consensus/:pollId**
Get current Shadow Consensus for a poll:

```typescript
{
  "poll_id": "uuid",
  "current_snapshot": {
    "consensus_delta": 23.5,
    "direction": "PUBLIC_OPPOSITION_PRIVATE_SUPPORT",
    "social_pressure_score": 67.8,
    "true_self_yes": 42.3,
    "shadow_yes": 65.8,
    "confidence_interval": 2.3,
    "interpretation": "Significant private support exists despite public opposition"
  },
  "trend": {
    "delta_24h_ago": 28.2,
    "delta_7d_ago": 35.1,
    "convergence_rate": "accelerating",
    "estimated_alignment_date": "2025-12-15"
  }
}
```

### **2. GET /api/v1/analytics/platform-health**
Real-time platform health dashboard:

```typescript
{
  "health_score": 78.5,
  "status": "healthy",
  "metrics": {
    "active_users_24h": 12453,
    "new_users_today": 234,
    "shadow_participation": 67.8,
    "pollcoin_velocity": 3.4,
    "average_light_score": 52.3
  },
  "warnings": [],
  "trends": {
    "user_growth": "+12.3%",
    "engagement": "+5.7%",
    "economic_activity": "+18.9%"
  }
}
```

### **3. GET /api/v1/analytics/predictions/:pollId**
Get predictive analytics for opinion shifts:

```typescript
{
  "poll_id": "uuid",
  "current_state": {
    "consensus_delta": 31.2,
    "direction": "PUBLIC_OPPOSITION_PRIVATE_SUPPORT"
  },
  "prediction": {
    "likely_outcome": "shift_toward_support",
    "expected_delta_7d": 23.4,
    "expected_delta_30d": 12.8,
    "convergence_date": "2025-12-20",
    "confidence": 0.82,
    "similar_historical_patterns": 14
  },
  "reasoning": [
    "Shadow support is 31.2% higher than public",
    "14 similar historical polls showed convergence",
    "Average convergence time: 42 days",
    "Current velocity suggests accelerating shift"
  ]
}
```

### **4. POST /api/v1/analytics/calculate-heat**
Calculate heat score for any content:

```typescript
// Request
{
  "reference_type": "poll",
  "reference_id": "uuid",
  "metrics": {
    "views": 10234,
    "comments": 234,
    "reactions": 567,
    "shares": 89
  }
}

// Response
{
  "heat_score": 72.3,
  "trend": "heating",
  "interpretation": "High engagement, trending upward"
}
```

---

## ✅ Success Metrics

### **Analytics Accuracy**
- Shadow Consensus calculations accurate to ±1%
- Predictions correct >70% of the time
- Social pressure scores correlate with actual behavior

### **Performance Targets**
- Shadow Consensus calculation: <500ms
- Real-time dashboard update: <1s
- Historical analysis queries: <2s
- Heat score updates: <200ms

### **Adoption Goals**
- 80% of polls have meaningful Shadow Consensus (>100 votes)
- Average delta of 15-25% (shows real divergence)
- Platform health score maintains >70
- Predictive models improve monthly

### **Business Value**
- Identify trending topics 7-30 days early
- Detect social pressure and censorship
- Predict governance outcome changes
- Guide community engagement strategies

---

## 📅 Build Timeline

### **Week 13** (2 weeks, after Module 09: Verification)

#### **Days 1-3: Database & Infrastructure**
- Set up 5 analytics tables with proper indexes
- Create data pipeline for vote aggregation
- Set up time-series data storage
- Initialize calculation job queues

#### **Days 4-6: Core Algorithms**
- Implement Shadow Consensus calculator
- Build social pressure scoring
- Create statistical confidence intervals
- Develop demographic segmentation

#### **Days 7-9: Predictive Engine**
- Build historical pattern matching
- Implement ML prediction models
- Create future shift estimators
- Develop convergence timeline calculator

#### **Days 10-11: Platform Health**
- Build real-time metrics aggregator
- Create health scoring algorithm
- Implement warning system
- Build bot detection metrics

#### **Days 12-13: APIs & Visualization**
- Create 6 REST endpoints
- Build data transformation layers
- Implement caching strategy
- Create export functionality

#### **Day 14: Testing & Optimization**
- Unit tests for all algorithms
- Performance optimization
- Load testing with 100K+ votes
- Statistical validation

**Deliverables**: 
- Complete Shadow Consensus calculator
- Predictive analytics engine
- Platform health dashboard
- Heat scoring system

---

## 🔗 Integration Points

### **Receives Data From:**

**Module 06 (Governance)**
- All voting data (True Self + Shadow)
- Poll metadata and results
- Delegation patterns

**Module 04 (Economy)**
- Light Score data for conviction analysis
- Token velocity metrics
- Stake amounts

**Module 08 (Social)**
- Engagement metrics
- Reaction patterns
- Follow relationships

### **Provides Data To:**

**Module 11 (7 Pillars)**
- Heat scores for pillar discussions
- Consensus patterns per value
- Trending topics

**Module 13 (Dashboard)**
- User-specific analytics
- Personal Shadow Consensus patterns
- Activity insights

**Module 18 (Gamification)**
- Achievement triggers
- Leaderboard data
- Participation scores

---

## ⚠️ Critical Considerations

### **Privacy Protection**
- NEVER link individual Shadow votes to True Self identities
- Aggregate data only, minimum 10 votes before showing
- Use differential privacy techniques
- Store votes separately, calculate in memory only

### **Statistical Validity**
- Require minimum sample sizes (n>30) for predictions
- Calculate and display confidence intervals
- Account for sampling bias
- Validate against historical accuracy

### **Gaming Prevention**
- Detect coordinated voting patterns
- Flag statistical anomalies
- Monitor for Sybil attacks
- Weight by Proof of Humanity verification

### **Performance Optimization**
- Pre-calculate common metrics
- Use materialized views for dashboards
- Implement smart caching strategies
- Queue heavy calculations

---

## 🎯 Module Success Criteria

The Analytics module succeeds when:

1. **Shadow Consensus reveals genuine insights** about social pressure
2. **Predictions accurately forecast** opinion shifts 70%+ of the time  
3. **Platform health metrics** enable proactive problem detection
4. **Heat scores drive engagement** to important discussions
5. **Users trust and act on** the analytics insights

---

**Module 10 Status**: ✅ Technical Plan Complete - Ready for Implementation

**Build Week**: 13 (after Module 09: Verification)  
**Estimated Effort**: 2 weeks / 1-2 developers  
**Priority**: HIGH - Core differentiator  

---

## 📚 Additional Resources

- Shadow Consensus Patent Filing: `legal/ip-protection/002-shadow-consensus.md`
- Statistical Methods Guide: `docs/ANALYTICS_STATISTICS.md`
- Privacy Protection Protocol: `docs/PRIVACY_ANALYTICS.md`
- ML Model Documentation: `docs/PREDICTION_MODELS.md`