# Dream Protocol

> **Building civilization-scale governance infrastructure with dual-identity sovereignty and a spot-only token economy**

Dream Protocol is a next-generation governance and social platform that enables authentic democratic decision-making through dual-identity voting, multi-layer truth verification, and a 7-year journey toward full decentralization.

## Overview

Dream Protocol combines revolutionary governance features with a safe, manipulation-free economic model. Our spot-only token strategy creates a "safe harbor for capital" where all stakeholders are aligned toward long-term growth.

### Core Innovation

- **Dual-Identity System**: Participate as your True Self (public) or Shadow (private) identity
- **Shadow Consensus**: Reveals the gap between what people say publicly vs. what they believe privately
- **4-Token Economy**: PollCoin (governance), Gratium (tipping/staking), CosmoFlux (creative energy), Thought Coins (stablecoin)
- **Spot-Only Strategy**: No shorts, no leverage, no manipulation - just aligned stakeholders
- **7-Year Keystone Journey**: Transparent transition from founder control to community governance

## Features

### Governance & Democracy
- Dual-mode voting (public and private)
- Poll creation with PollCoin staking
- Gratium staking on outcomes
- 7-section voting multipliers
- Constitutional governance system
- Delegation and proxy voting

### Truth Discovery
- Proof of Humanity verification
- Veracity Bonds (stake on truth)
- Prediction Markets (LMSR-based)
- Epistemic Funnel (5-layer trust scoring)
- Thalyra AI threat detection
- Content NFT certification

### Neural Organization
- 7 Chambers system (Freedom, Justice, Compassion, etc.)
- Thought Chambers (governance proposals - 1000 PollCoin)
- Thought Seeds (ideas - 10 PollCoin)
- Thought Pods (problem-solving - 100 PollCoin)
- Cross-chamber reference system
- Evidence graph linking

### The Keystone Journey
- 7 Pillars tracking (one per year)
- 49 Pillar Stones NFT system (7 per year)
- The Keystone (1/1 NFT for Year 7)
- Founding Member NFTs
- Governance transition milestones
- Constitutional Convention system

### User Experience
- **Pentos AI Assistant**: Context-aware help and guidance
- Light Score reputation system (managed by Pentos)
- Gamification engine with achievements
- Comprehensive onboarding flow
- Personal dashboard and activity feeds

### Blockchain Integration
- Cardano wallet integration (dual wallets)
- Arweave permanent storage (governance records)
- Brave Wallet browser integration
- Smart contract interaction

## Tech Stack

- **Backend**: Node.js + TypeScript
- **Database**: PostgreSQL
- **Frontend**: Next.js
- **Blockchain**: Cardano (wallets), Arweave (permanence)
- **AI**: Pentos (assistant), Thalyra (threat detection)

## Architecture

Dream Protocol is built as a modular monorepo with 22 modules:

### Core Protocol (7 modules)
- Identity, Governance, Economy, Analytics, Verification, Permanence, Neural Pollinator

### Keystone Module (1 module)
- 7-year governance journey tracking

### Platform Features (7 modules)
- Content, User, Social, Onboarding, Dashboard, Admin, Search

### Integrations (3 modules)
- Cardano Integration, Brave Wallet, Token Exchange

### Experience (2 modules)
- Pentos AI Assistant, Gamification Engine

### Support (2 modules)
- Bridge Legacy (MVP migration), Token Exchange Integration

See [DREAM_PROTOCOL.MD](./DREAM_PROTOCOL.MD) for complete module architecture.

## Token Economy

### PollCoin
- **Purpose**: Governance & democratic decision-making
- **Utility**: Vote power, proposal creation, chamber access
- **Strategy**: Spot-only (no shorts/leverage)

### Gratium
- **Purpose**: Tipping & staking on outcomes
- **Utility**: Reward creators, stake on predictions, community appreciation
- **Strategy**: Spot-only (no shorts/leverage)

### CosmoFlux (Post-Launch)
- **Purpose**: Creative energy & token alchemy
- **Utility**: NFT creation, chamber creation, digital fortune cookies
- **Strategy**: Spot-only, deflationary (burns when used)

### Thought Coins (Post-Launch)
- **Purpose**: Stablecoin for donations & services
- **Utility**: Fund think tanks, service marketplace payments
- **Strategy**: Spot-only, ~$1 peg

### Light Score (Not a Token)
- **Purpose**: Reputation metric for community contribution
- **Managed By**: Pentos (secret algorithm)
- **Cannot Be**: Bought, sold, or transferred

## Roadmap

### Phase 1: Foundation (Weeks 2-5)
- Bridge Legacy, User, Identity, Content modules
- **Milestone**: First vertical slice - users can create posts in dual-identity mode

### Phase 2: Core Economy (Weeks 6-10)
- Economy (4-token system), Token Exchange, Governance, Social
- **Milestone**: Complete token economy + Shadow Consensus voting

### Phase 3: Truth Discovery (Weeks 11-14)
- Verification, Analytics, Gamification
- **Milestone**: Trust scores visible + engaging UX

### Phase 4: Neural System (Weeks 15-18)
- Neural Pollinator, Keystone
- **Milestone**: Complete governance ecosystem with 7-year journey

### Phase 5: User Experience (Weeks 19-22)
- Pentos, Onboarding, Dashboard, Search
- **Milestone**: Delightful UX from signup to advanced features

### Phase 6: Blockchain (Weeks 23-27)
- Cardano, Arweave, Brave Wallet integrations
- **Milestone**: Full blockchain integration

### Phase 7: Launch (Weeks 28-30)
- Admin tools, final polish, security audit
- **Milestone**: Production launch to Wave 1 users

### Phase 8: Creative Module (Months 8-12)
- CosmoFlux, Thought Coins, NFT platform, service marketplace
- **Milestone**: Wave 2 expansion ready

**Total Timeline**: 30 weeks to launch, +4 months for creative expansion

## Adoption Strategy

### Wave 1: The Believers (Months 1-12)
- **Target**: Crypto-natives, truth-seekers, decentralization advocates
- **Message**: "No shorts. No games. Just civilization-building."
- **Benefits**: Early adopter status, Founding Member NFTs, governance influence

### Wave 2: The Masses (Year 2+)
- **Target**: General public, non-crypto users, institutions
- **Message**: "Join the safe harbor. Where your wealth grows because the community succeeds."
- **Benefits**: Proven platform, creative features, stable ecosystem

## Why Spot-Only?

**Core Philosophy**: Create a manipulation-free zone where ALL holders win together

**What It Means**:
- ✅ Buy, trade, and hold tokens
- ❌ NO short selling
- ❌ NO leverage/margin trading
- ❌ NO futures contracts
- ❌ NO lending/borrowing

**Benefits**:
1. Eliminates price manipulation
2. Aligns all holders toward growth
3. Prevents governance attacks
4. Reduces volatility
5. Attracts long-term capital

> "In a world of financial chaos, we built a vault. No shorts. No leverage. No manipulation. Just aligned stakeholders building civilization-scale infrastructure. **This is where wealth comes to be safe.**"

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dreamprotocol.git
cd dreamprotocol

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
pnpm db:setup

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Development

```bash
# Run all tests
pnpm test

# Run specific module tests
pnpm test --filter @dream/identity

# Build for production
pnpm build

# Lint code
pnpm lint
```

## Project Structure

```
dream-protocol/
├── packages/
│   ├── 01-identity/           # Dual-identity system
│   ├── 02-governance/         # Democratic decision-making
│   ├── 03-economy/            # 4-token economy
│   ├── 04-analytics/          # Shadow Consensus calculator
│   ├── 05-verification/       # Truth discovery systems
│   ├── 06-permanence/         # Arweave integration
│   ├── 07-neural-pollinator/  # 7 Chambers system
│   ├── 08-keystone/           # 7-year governance journey
│   ├── 09-content/            # Posts & discussions
│   ├── 10-user/               # User profiles
│   ├── 11-social/             # Social interactions
│   ├── 12-onboarding/         # User onboarding
│   ├── 13-dashboard/          # User dashboard
│   ├── 14-admin/              # Admin tools
│   ├── 15-search/             # Search functionality
│   ├── 16-chain-cardano/      # Cardano integration
│   ├── 17-wallet-brave/       # Brave Wallet
│   ├── 18-pentos/             # AI Assistant
│   ├── 19-bridge-legacy/      # MVP migration
│   ├── 20-permanence/         # Arweave integration
│   ├── 21-gamification/       # Achievement system
│   └── 22-creative/           # Creative Module (post-launch)
├── apps/
│   └── flagship/              # Main web application
├── database/
│   ├── migrations/            # SQL migrations
│   └── seeds/                 # Test data
├── docs/
│   └── ...                    # Documentation
└── scripts/
    └── ...                    # Utility scripts
```

## Documentation

- [Complete Architecture](./DREAM_PROTOCOL.MD) - Full module breakdown and implementation plan
- [API Documentation](./docs/API.md) - API endpoints and usage (coming soon)
- [Contributing Guide](./docs/CONTRIBUTING.md) - How to contribute (coming soon)
- [Security Policy](./docs/SECURITY.md) - Security guidelines (coming soon)

## Key Concepts

### Shadow Consensus
The gap between public (True Self) and private (Shadow) voting reveals where society needs to grow. When Shadow votes differ significantly from True Self votes, it indicates social pressure, fear, or stigma around certain positions.

### Epistemic Funnel
A 5-layer trust scoring system:
1. Anonymous claims (lowest trust)
2. Identity-verified claims
3. Reputation-weighted claims
4. Veracity-bonded claims
5. Prediction market validated claims (highest trust)

### DualityToken
A private cryptographic link between your True Self and Shadow identities. This is NEVER stored on-chain and remains completely confidential.

### The 7 Chambers
- **Freedom**: Liberty, rights, autonomy
- **Justice**: Fairness, law, equity
- **Compassion**: Care, empathy, support
- **Wisdom**: Knowledge, education, truth
- **Sustainability**: Environment, resources, future
- **Innovation**: Technology, progress, creativity
- **Unity**: Community, cooperation, peace

## Security

- Dual-identity linkage is cryptographically secure and never exposed
- All governance decisions are permanently archived on Arweave
- Multi-factor Proof of Humanity verification
- Thalyra AI continuously monitors for threats (7-second heartbeat)
- Smart contract audits before mainnet deployment

## License

[To be determined]

## Contact

- Website: [coming soon]
- Twitter: [coming soon]
- Discord: [coming soon]
- Email: [coming soon]

---

**Built with conviction. Governed with transparency. Secured with mathematics.**

*Dream Protocol - Where wealth comes to be safe.*
