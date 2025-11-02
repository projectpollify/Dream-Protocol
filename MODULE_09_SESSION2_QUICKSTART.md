# Module 09 Session 2 - Quick Start Guide

**Last Updated**: November 2, 2025
**Session 1 Status**: Complete (needs TypeScript fixes)
**Session 2 Status**: Ready to begin

---

## TL;DR - What You Need to Know

### Where We Are
- Session 1: Database + PoH + Veracity Bonds = COMPLETE
- Session 1 has 8 fixable TypeScript errors (15 min to fix)
- Session 2 starts immediately after fixes

### What Session 2 Does
1. **Prediction Markets** - LMSR-based trading markets for forecasting outcomes
2. **Epistemic Scoring** - 5-layer trust funnel for evaluating content quality
3. **Content NFTs** (optional) - Certify valuable content as NFTs
4. **Thalyra AI** (optional) - AI threat detection with 7-second heartbeat

### Quick Fixes Before Starting

```bash
cd /Users/shawn/Desktop/dreamprotocol/packages/09-verification/

# 1. Install dependencies
npm install

# 2. Fix 3 TypeScript issues (manually edit these files):
# - src/services/proof-of-humanity.service.ts:
#   - Remove 'private' from lines 269, 278, 294
#   - Add null check after line 49: if (!poh) throw new Error(...)
#   - Add null check after line 67: if (!poh) throw new Error(...)
#
# - src/services/veracity-bond.service.ts:
#   - Line 206: Add type to map: (c: BondChallenge)

# 3. Rebuild and test
npm run build    # Should have 0 errors
npm test         # Should pass
```

**Detailed fix guide**: See `/Users/shawn/Desktop/dreamprotocol/FIXES_09_SESSION1.md`

---

## Implementation Order

### Day 1-2: Prediction Markets
```
1. Create migration files (005-007)
2. Implement PredictionMarketService
   - LMSR calculator (critical!)
   - Market creation/trading
   - Resolution/winnings
3. Create 8 API endpoints
4. Write LMSR unit tests
```

### Day 3-4: Epistemic Scoring
```
1. Create migration files (008-009)
2. Implement EpistemicScoringService
   - 5 layer calculators
   - Score weighting
   - Temporal decay
3. Create 5 API endpoints
4. Write layer unit tests
```

### Day 5+ (Optional): NFT + Thalyra
```
1. Create migration files (010-011)
2. Implement ContentNFTService
3. Implement ThalyraService
4. Integration testing
```

---

## Critical Implementation Details

### LMSR Algorithm (Prediction Markets)

**Must implement exactly**:
```typescript
// Cost to buy n shares at outcome
calculatePurchaseCost(
  b: number,           // liquidity parameter
  qYes: number,        // current yes shares
  qNo: number,         // current no shares
  outcome: 'yes'|'no', // which outcome to buy
  shares: bigint       // how many shares
): bigint {
  const currentCost = b * Math.log(Math.exp(qYes/b) + Math.exp(qNo/b));
  const newQYes = outcome === 'yes' ? qYes + shares : qYes;
  const newQNo = outcome === 'no' ? qNo + shares : qNo;
  const newCost = b * Math.log(Math.exp(newQYes/b) + Math.exp(newQNo/b));
  return BigInt(Math.ceil(newCost - currentCost));
}

// Probability of outcome
calculatePrice(
  b: number,
  qYes: number,
  qNo: number,
  outcome: 'yes'|'no'
): number {
  const expYes = Math.exp(qYes/b);
  const expNo = Math.exp(qNo/b);
  return outcome === 'yes'
    ? expYes / (expYes + expNo)
    : expNo / (expYes + expNo);
}
```

**Properties to verify**:
- Probability always sums to 1.0
- Cost always increases monotonically
- Edge cases handled (0 liquidity, huge shares)

### Epistemic Scoring Layers

**Each layer returns 0-100**:

1. **Surface** (10%) - Grammar, formatting, readability
2. **Contextual** (15%) - Author credibility, sources, timeliness
3. **Analytical** (25%) - Logic, evidence, arguments
4. **Synthesis** (25%) - Integration, creativity, insights
5. **Meta** (25%) - Self-awareness, limitations, uncertainty

**Final score**:
```
final = (surface * 0.10) + (contextual * 0.15) + (analytical * 0.25) + 
        (synthesis * 0.25) + (meta * 0.25)
```

---

## Database Migrations Needed

### Session 2 Adds 7 New Tables

| Migration | Table | Purpose |
|-----------|-------|---------|
| 005 | prediction_markets | Market details (question, status, LMSR params) |
| 006 | market_positions | User positions in markets (shares, P&L) |
| 007 | market_trades | Individual trades (buy/sell history) |
| 008 | epistemic_scores | Score records (5 layers + final) |
| 009 | epistemic_factors | Individual factors contributing to scores |
| 010 | content_nfts | NFT certification records |
| 011 | thalyra_detections | Threat detection events |

**Total tables after Session 2**: 11 (4 from Session 1 + 7 from Session 2)

---

## API Routes to Implement

### Prediction Markets (8 endpoints)
```
POST   /markets                   Create market
GET    /markets                   List markets
GET    /markets/:marketId         Get market details
GET    /markets/:marketId/price/:outcome  Get current price
POST   /markets/:marketId/quote   Get trade quote (without executing)
POST   /markets/:marketId/buy     Buy shares
POST   /markets/:marketId/sell    Sell shares
POST   /markets/:marketId/resolve Resolve market (admin)
```

### Epistemic Scoring (5 endpoints)
```
POST   /epistemic/calculate              Calculate score for target
GET    /epistemic/:targetType/:targetId  Get existing score
GET    /epistemic/top/:targetType        Get top-scored targets
POST   /epistemic/factors                Add custom factor to score
POST   /epistemic/:targetType/:targetId/refresh  Recalculate score
```

### Content NFTs (5 endpoints)
```
POST   /nfts/certify              Certify content as NFT
GET    /nfts/:nftId               Get NFT details
GET    /nfts/creator/:creatorId   Get creator's NFTs
GET    /nfts/:nftId/mint-data     Get metadata for minting
POST   /nfts/:nftId/mint          Record mint on blockchain
```

---

## Files to Create

```
src/
├── services/
│   ├── prediction-market.service.ts      (500 lines)
│   ├── epistemic-scoring.service.ts      (400 lines)
│   ├── content-nft.service.ts            (250 lines - optional)
│   └── thalyra.service.ts                (350 lines - optional)
├── database/migrations/
│   ├── 005_create_prediction_markets.sql
│   ├── 006_create_market_positions.sql
│   ├── 007_create_market_trades.sql
│   ├── 008_create_epistemic_scores.sql
│   ├── 009_create_epistemic_factors.sql
│   ├── 010_create_content_nfts.sql
│   └── 011_create_thalyra_detections.sql
└── tests/
    ├── prediction-market.test.ts         (100 tests)
    ├── epistemic-scoring.test.ts         (80 tests)
    └── integration.test.ts               (50 tests)
```

---

## Types to Add to src/types/index.ts

```typescript
// Prediction Markets
type PredictionMarketStatus = 'open' | 'closed' | 'resolved' | 'cancelled';
interface PredictionMarket { /* 13 fields */ }
interface MarketPosition { /* 10 fields */ }
interface MarketTrade { /* 8 fields */ }

// Epistemic Scoring
type EpistemicLayer = 'surface' | 'contextual' | 'analytical' | 'synthesis' | 'meta';
interface EpistemicScore { /* 11 fields */ }
interface EpistemicFactor { /* 7 fields */ }

// Content NFT
type CertificationLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
interface ContentNFT { /* 12 fields */ }

// Thalyra AI
type ThreatType = 'manipulation' | 'coordination' | 'misinformation' | 'spam';
type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
interface ThalyraDetection { /* 14 fields */ }
```

---

## Testing Strategy

### Must Test (LMSR)
```
- Price always between 0 and 1
- Price sum always equals 1.0
- Cost increases monotonically
- Buying/selling are inverse operations
- Resolution distributes winnings correctly
```

### Should Test (Epistemic)
```
- Each layer calculates independently
- Layers weight correctly
- Final score is weighted average
- Temporal decay works
- Custom factors integrate properly
```

### Integration Tests
```
- End-to-end: Create market → Trade → Resolve
- Create content → Score → Certify as NFT
- Threat detection → Auto-action → Review
```

---

## Common Gotchas

### 1. LMSR Numerical Issues
- Use BigInt for trading amounts (avoid float precision)
- Math.log(0) = -Infinity → validate inputs
- e^(large number) → overflow → use logarithm tricks

### 2. Epistemic Layer Calculations
- Some layers need external data (author credibility)
- Start simple (heuristics), add ML later
- Don't try to be perfect - 80/20 is fine

### 3. Null Safety in TypeScript
```typescript
// WRONG
const score = await getScore(...);
const value = score.final_score; // score might be null!

// RIGHT
const score = await getScore(...);
if (!score) throw new Error('Score not found');
const value = score.final_score; // Now safe
```

### 4. Snake_case vs camelCase
- Database uses snake_case
- TypeScript interfaces use snake_case (to match)
- All code consistent = no mapper layer needed

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Market creation | <100ms | Simple insert |
| Buy/sell trade | <50ms | Complex LMSR calc |
| Epistemic score | <1s | May involve analysis |
| Thalyra scan | <7s | Must complete in heartbeat |
| 1000 concurrent traders | Supported | Database scaling |

---

## Integration with Other Modules

### Module 04: Economy
```typescript
// Buying market shares costs Gratium
economyService.transferTokens(user, escrow, 'GRAT', amount);

// Winnings paid from market pool
economyService.transferTokens(escrow, winner, 'GRAT', winnings);
```

### Module 06: Governance
```typescript
// PoH required for market creation (already in Session 1)
if (!pohLevel >= 2) throw new Error('PoH Level 2+ required');

// Create markets for governance proposals
createMarket({ question: `Will proposal ${id} pass?` });
```

### Module 10: Analytics
```typescript
// Record all market resolutions for accuracy tracking
analyticsService.recordMarketResolution(marketId, predicted, actual);
```

---

## Debugging Tips

### Build Errors
```bash
npm run build                    # See full error list
npx tsc --noEmit                # Check types only
```

### Test Failures
```bash
npm test -- --reporter=verbose  # See full output
npm test -- prediction-market   # Test one file
npm test -- --testNamePattern="LMSR"  # Test one suite
```

### Database Issues
```bash
npm run db:migrate              # Run migrations
npm run db:seed                 # Add test data
psql $DATABASE_URL              # Query manually
```

---

## Session 2 Success Criteria

Session 2 is complete when:
- ✅ LMSR calculator passes all math tests
- ✅ Markets can be created, traded, and resolved
- ✅ Epistemic scores calculated for all 5 layers
- ✅ Scores distributed normally (bell curve)
- ✅ All 18 API endpoints working
- ✅ 80+ unit tests passing
- ✅ Integration tests passing
- ✅ Ready to integrate with other modules

---

## Quick Reference: Key Files

| File | Purpose | Lines |
|------|---------|-------|
| MODULE_09_SPEC.md | Complete specification | 1,550 |
| MODULE_09_SESSION2_PLANNING.md | Detailed planning | 600 |
| MODULE_09_SESSION2_QUICKSTART.md | This file | 350 |
| FIXES_09_SESSION1.md | TypeScript fixes | 300 |
| REVIEW_09_SESSION1.md | Session 1 review | 320 |
| packages/09-verification/README.md | API docs | 235 |

---

## Start Here

1. Read this file (you're done!)
2. Fix Session 1 TypeScript errors (15 min)
3. Review LMSR algorithm (30 min)
4. Create migration 005 (30 min)
5. Implement LMSR calculator (2 hours)
6. Write LMSR tests (1 hour)
7. Create market service (2 hours)
8. Create market routes (1 hour)

**Estimated time to start trading**: 6-7 hours

Good luck! You've got this.

