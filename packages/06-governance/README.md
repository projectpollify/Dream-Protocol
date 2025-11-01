# Module 06: Governance

**Dual-Mode Democratic Decision-Making Engine for Dream Protocol**

## Overview

Module 06 implements the democratic governance system that enables the 7-year gradual transition from founder control to full community governance. This is Dream Protocol's core differentiator—where every user has TWO votes (True Self + Shadow) and the platform learns what communities really believe vs. what they say publicly.

## Key Features

- **Dual-Mode Voting**: True Self + Shadow vote independently on governance decisions
- **Shadow Consensus**: System reveals gaps between public and private beliefs
- **7-Section Multipliers**: Reduces whale voting power concentration
- **Gratium Staking**: Users stake on poll outcomes for rewards
- **Delegation System**: Delegate voting power to trusted users
- **Quorum Requirements**: Three enforcement models (absolute/percentage/either)
- **Emergency Rollback**: Three-tier authority system with declining founder power
- **Constitutional Protection**: Core parameters protected from voting
- **Vote Privacy**: Timing jitter prevents correlation attacks
- **Arweave Permanence**: All votes recorded permanently

## Installation

```bash
cd packages/06-governance
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Service port (default: 3006)
- `IDENTITY_SERVICE_URL` - Module 01 endpoint
- `ECONOMY_SERVICE_URL` - Module 04 endpoint
- `FOUNDER_USER_ID` - Founder's user ID for rollback authority

## Database Setup

Run the database migration:

```bash
psql $DATABASE_URL < src/database/schema.sql
psql $DATABASE_URL < src/database/seed.sql
```

## Development

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build for production
npm run test       # Run test suite
npm run test:coverage  # Run tests with coverage
npm run lint       # Lint TypeScript code
npm run format     # Format code with Prettier
```

## Architecture

```
src/
├── index.ts                 # Main entry point
├── routes/
│   ├── governance.routes.ts # REST API endpoints
│   └── index.ts             # Route aggregator
├── services/
│   ├── poll.service.ts      # Poll creation & management
│   ├── vote.service.ts      # Voting logic & section assignment
│   ├── consensus.service.ts # Shadow Consensus calculation
│   ├── stake.service.ts     # Gratium staking
│   ├── delegation.service.ts # Vote delegation
│   └── rollback.service.ts  # Emergency rollback protocol
├── types/
│   └── index.ts             # TypeScript types
├── utils/
│   ├── database.ts          # Database connection
│   ├── section-assignment.ts # Section allocation algorithm
│   └── timing-jitter.ts     # Vote privacy protection
└── tests/
    ├── governance.unit.test.ts
    └── governance.integration.test.ts
```

## API Endpoints

### Poll Management
- `POST /api/v1/governance/create-poll` - Create governance poll
- `GET /api/v1/governance/polls` - List all polls
- `GET /api/v1/governance/polls/:poll_id` - Get poll details

### Voting
- `POST /api/v1/governance/vote` - Cast vote on poll
- `PATCH /api/v1/governance/vote` - Change vote
- `GET /api/v1/governance/shadow-consensus/:poll_id` - Get Shadow Consensus analysis

### Delegation
- `POST /api/v1/governance/delegate` - Delegate voting power
- `DELETE /api/v1/governance/delegate/:delegation_id` - Revoke delegation
- `GET /api/v1/governance/delegations` - List user's delegations

### Staking
- `POST /api/v1/governance/stake` - Stake Gratium on outcome
- `GET /api/v1/governance/stake-pool/:poll_id` - Get stake pool status

### Rollback
- `POST /api/v1/governance/emergency-rollback` - Initiate rollback

## Core Concepts

### Dual Voting
Each user can vote TWICE on every poll:
- **True Self**: Public identity, visible reasoning
- **Shadow**: Authentic self, private perspective
- Both votes have equal weight (1x base, then multiplied by section)

### 7-Section Multipliers
Votes are assigned to sections with random multipliers (0.7x - 1.5x):
- Prevents whale domination
- Deterministic assignment (can't game)
- Averages to 1.0x over many polls

### Shadow Consensus
The gap between True Self and Shadow vote percentages:
- Example: 58% True Self YES, 76% Shadow YES = 18% gap
- Reveals collective self-censorship or social pressure
- Platform's key insight metric

### Quorum Models
Three enforcement options:
1. **Absolute**: Fixed minimum (e.g., 1,000 votes)
2. **Percentage**: Relative to verified users (e.g., 5%)
3. **Either**: Whichever threshold is met first

### Emergency Rollback
Three-tier authority system:
- **Tier 1**: Founder (Year 1-3, 10 tokens, declining)
- **Tier 2**: User Petition (100+ verified users)
- **Tier 3**: Automatic Triggers (system-detected)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run specific test file
npm test governance.unit.test.ts
```

## Dependencies

**Module 06 depends on:**
- Module 01 (Identity) - Dual wallet system, DIDs
- Module 03 (User) - User profiles, Light Score
- Module 04 (Economy) - PollCoin costs, Gratium staking, Light Score

**Modules that depend on Module 06:**
- Module 07 (Content) - Governance polls in feed
- Module 11 (Neural Pollinator) - Governance as Thought Seeds
- Module 12 (Keystone) - 7-year journey tracking
- Module 20 (Arweave) - Permanent vote archival

## Security Considerations

- Proof of Humanity required to vote (prevents Sybil attacks)
- Delegation chain prevention (no A→B→C)
- Vote timing jitter (prevents correlation attacks)
- Constitutional articles protected (core rules inviolable)
- Rate limiting on vote changes (max 5 per poll)
- Section assignment deterministic but unpredictable

## Performance

- Poll creation: <500ms
- Vote recording: <200ms
- Shadow Consensus calculation: <2s (even for 100k votes)
- Poll listing: <100ms
- No N+1 query issues

## Monitoring

Key metrics to track:
- Average participation rate per poll
- Shadow Consensus gap trends
- Delegation usage percentage
- Quorum success rate
- Vote change frequency
- Section distribution fairness

## Support

For issues or questions:
- GitHub: https://github.com/dreamprotocol/governance
- Docs: `doc files/MODULE_06_GOVERNANCE_TECHNICAL_PLAN.md`
- Improvements: `doc files/MODULE_06_GOVERNANCE_IMPROVEMENTS_SUMMARY.md`

## License

MIT License - See LICENSE file for details

---

**Module Status**: ✅ Production-Ready (v1.0.0)
**Last Updated**: January 30, 2025
**Maintainer**: Dream Protocol Team
