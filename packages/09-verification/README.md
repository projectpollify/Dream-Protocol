# Module 09: Verification

Multi-layer truth discovery system for Dream Protocol - The Complete Solution.

## Components

### Session 1: Foundation ✅
- **Proof of Humanity (PoH)** - Multi-factor human verification (5-level system)
- **Veracity Bonds** - Gratium stakes on truth claims with challenge mechanism

### Session 2: Truth Discovery ✅
- **Prediction Markets** - LMSR algorithm for outcome staking
- **Epistemic Scoring** - 5-layer trust funnel for content evaluation

## Quick Start

### Installation

```bash
npm install
```

### Database Setup

Run migrations:

```bash
npm run db:migrate
```

Seed test data:

```bash
npm run db:seed
```

### Development

Start the development server:

```bash
npm run dev
```

Server runs on port 3009

### Testing

Run unit tests:

```bash
npm test
```

With coverage:

```bash
npm run test:coverage
```

## API Endpoints

### Proof of Humanity (Session 1)

- `POST /poh/initiate` - Start verification session
- `POST /poh/verify` - Submit verification method
- `GET /poh/status/:userId/:identityMode` - Check verification status
- `GET /poh/access/:userId/:feature` - Check feature access

### Veracity Bonds (Session 1)

- `POST /bonds` - Create a new bond
- `GET /bonds/:bondId` - Get bond details
- `GET /bonds/user/:userId/:identityMode` - List user's bonds
- `POST /bonds/:bondId/challenge` - Challenge a bond
- `POST /bonds/:bondId/resolve` - Resolve a bond (truthful/false)

### Prediction Markets (Session 2 - LMSR Algorithm)

- `POST /markets` - Create new market
- `GET /markets` - List markets with filters
- `GET /markets/:marketId` - Get market details
- `GET /markets/:marketId/quote/:outcome` - Get price quote for buying shares
- `POST /markets/:marketId/buy` - Buy shares in market
- `POST /markets/:marketId/sell` - Sell shares in market
- `GET /markets/:marketId/history` - Get trade history
- `POST /markets/:marketId/resolve` - Resolve market outcome

### Epistemic Scoring (Session 2 - 5-Layer Funnel)

- `POST /epistemic/score` - Calculate epistemic score for content
- `GET /epistemic/score/:targetType/:targetId` - Get current score
- `GET /epistemic/history/:targetType/:targetId` - Get score history
- `GET /epistemic/top/:targetType` - Get highest-scored content
- `POST /epistemic/analyze/:scoreId` - Get layer-by-layer analysis

## Configuration

Default configuration in `MODULE_09_SPEC.md`:

- Minimum bond: 100 Gratium
- Maximum bond: 1,000,000 Gratium
- Default duration: 30 days
- Slashing percentage: 50%
- Challenge window: 7 days

## Database Schema

### Tables (Session 1)

1. `proof_of_humanity` - User verification records (5 score dimensions)
2. `humanity_verification_events` - Verification attempt logs
3. `veracity_bonds` - Truth stakes on claims (100-1M Gratium range)
4. `bond_challenges` - Challenges to bonds with matching stakes

### Tables (Session 2)

5. `prediction_markets` - LMSR-based prediction markets
6. `market_positions` - User share holdings by outcome
7. `market_trades` - Immutable transaction history
8. `epistemic_scores` - 5-layer trust scores (0-100 each)
9. `epistemic_factors` - Detailed score breakdown per layer

## Types

All types defined in `src/types/index.ts`:

- `ProofOfHumanity` - PoH record
- `VeracityBond` - Bond record
- `BondChallenge` - Challenge record
- `PoHSession` - Verification session
- `PoHStatus` - Verification status
- And more...

## Integration

### Module 04: Economy

Bonds use Gratium token:

```typescript
// Lock tokens for bond
economyService.lockTokens(userId, identityMode, 'GRAT', amount);

// Slash for false claims
economyService.transferTokens(bondholder, challenger, 'GRAT', slashed);
```

### Module 06: Governance

PoH gates voting:

```typescript
// Check before allowing vote
const hasAccess = await pohService.checkAccess(userId, 'voting');
```

## Services

### ProofOfHumanityService

```typescript
// Initiate verification
const session = await proofOfHumanityService.initiateVerification(userId, 'true_self');

// Submit method
const result = await proofOfHumanityService.submitVerificationMethod(
  userId,
  'true_self',
  'email',
  { verified: true }
);

// Check status
const status = await proofOfHumanityService.getVerificationStatus(userId, 'true_self');

// Check access
const canVote = await proofOfHumanityService.checkAccess(userId, 'voting');
```

### VeracityBondService

```typescript
// Create bond
const bond = await veracityBondService.createBond(
  userId,
  'true_self',
  'post',
  postId,
  500n,
  'This is true',
  8
);

// Get bond
const bond = await veracityBondService.getBond(bondId);

// Challenge bond
const challenge = await veracityBondService.challengeBond(
  bondId,
  challengerId,
  500n,
  'This is false',
  { evidence: '...' }
);

// Resolve bond
const resolution = await veracityBondService.resolveBond(
  bondId,
  true, // truthful
  { proof: '...' }
);
```

## Session 2 (Coming Next)

- Prediction Markets (LMSR algorithm)
- Epistemic Scoring (5-layer funnel)
- Content NFT Certification
- Thalyra AI threat detection

## Next Steps

After Session 1 is complete:

1. Integrate with Module 04 (Economy) for token locking
2. Integrate with Module 06 (Governance) for PoH gating
3. Integrate with Module 10 (Analytics) for trust insights
4. Build Session 2 with Prediction Markets and Epistemic Scoring

## References

See `MODULE_09_SPEC.md` for complete specification including:

- Database schema with all tables
- Service interfaces and implementations
- LMSR algorithm details
- 5-layer epistemic scoring
- Thalyra AI threat detection
- All 40+ API endpoints
- Testing strategy
- Security considerations

## Architecture

```
Module 09: Verification
├── Proof of Humanity (PoH)
│   ├── Multi-factor verification
│   ├── Level-based access gating
│   └── Integration with all modules
├── Veracity Bonds
│   ├── Gratium staking on claims
│   ├── Challenge mechanism
│   └── Resolution & slashing
├── Prediction Markets (Session 2)
├── Epistemic Scoring (Session 2)
├── Content NFT (Session 2)
└── Thalyra AI (Session 2)
```

## License

MIT
