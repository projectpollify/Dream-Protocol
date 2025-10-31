# 🦄 Module 05: Token Exchange Integration - Technical Specification
## On-Platform and Spot-Only Trading System for Dream Protocol

**Module Number**: 05 of 22  
**Build Priority**: PRIORITY 2 - Core Economy (After Module 04: Economy)  
**Dependencies**: Module 04 (Economy), Module 03 (User), Module 01 (Identity)  
**Dependents**: Module 06 (Governance), Module 09 (Verification), Module 22 (Creative Engine)  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 05 enables users to acquire PollCoin and Gratium tokens through multiple channels while enforcing the **spot-only strategy** that prevents manipulation and maintains platform stability. This module is the economic bridge between traditional finance and the Dream Protocol economy.

### **Core Philosophy**
> "Make tokens accessible to everyone while protecting the economic system from manipulation. Users can buy what they want, trade what they own, but nobody can short, leverage, or destroy value through speculation. This is capitalism with guardrails."

### **Key Innovation**
Spot-only enforcement at the platform level means Dream Protocol can compete with traditional exchanges by offering something nobody else does: a **manipulation-free zone** where all holders win together.

---

## 🗓️ What This Module Does

### **Primary Functions**
1. **On-Platform Token Purchases** - Fiat to token conversions with premium pricing
2. **DEX Listings Management** - Monitor external exchanges (Uniswap, etc.)
3. **Spot-Only Enforcement** - Prevent lending, shorting, leverage integrations
4. **Fiat On-Ramps** - Partner with payment providers
5. **Exchange Monitoring** - Track external market prices
6. **Rate Limiting** - Prevent whale behavior and market manipulation
7. **Purchase History** - Complete transaction audit trail
8. **Token Holder Statistics** - Market analytics

### **Key Features**
- ✅ Premium pricing for on-platform purchases (sustainability)
- ✅ Fiat on-ramps via Stripe/payment partners
- ✅ Real-time price feeds from multiple DEXes
- ✅ Spot-only compliance monitoring
- ✅ Purchase limits (prevent whales)
- ✅ Geographic restrictions (regulatory compliance)
- ✅ KYC/AML integration points
- ✅ Transaction webhooks for monitoring

---

## 💡 How Users Get Tokens

### **Path 1: Direct Purchase (On-Platform)**
```
User → Fiat (USD/EUR) → Platform Payment Gateway → PollCoin/Gratium
         └─ Premium pricing (e.g., 15% above market)
         └─ Platform keeps difference
         └─ Revenue model + incentive to use platform
```

**Advantages**:
- No leaving platform
- Simple UX
- Immediate tokens
- Platform revenue
- Regulatory control

**Pricing Strategy**:
- Market price + 15% premium
- Covers payment processing, regulatory, customer support
- Competitive with exchanges when you factor in convenience

---

### **Path 2: DEX Purchase (External)**
```
User → External Exchange (Uniswap, etc.) → PollCoin/Gratium
         └─ Market price
         └─ User bears network fees
         └─ Platform just monitors
```

**Advantages**:
- Decentralized (censorship-resistant)
- True market price
- No platform control
- Actual on-chain trading

**Monitoring**:
- Platform watches Uniswap, other DEXes
- Alerts users to any suspicious listings
- Blocks spot-only violations

---

### **Path 3: Platform Rewards**
```
User Active → Platform Rewards (Staking, Tasks, etc.) → PollCoin/Gratium
         └─ Non-monetary acquisition
         └─ Aligns incentives
         └─ Gamification mechanism
```

**Examples**:
- Verify identity → 100 Gratium
- First poll creation → 500 PollCoin
- Helpful community member → Light Score boost
- Monthly participation bonus → Both tokens

---

## 🔐 Spot-Only Enforcement (The Secret Sauce)

### **What We Block**
| Feature | Status | Why |
|---------|--------|-----|
| **Buy tokens** | ✅ Allowed | Users should own assets |
| **Trade on DEX** | ✅ Allowed | Decentralized, censorship-resistant |
| **Hold indefinitely** | ✅ Allowed | Long-term investment |
| **Participate in governance** | ✅ Allowed | Core use case |
| **Short selling** | ❌ BLOCKED | Can't profit from price drops |
| **Margin/leverage** | ❌ BLOCKED | Prevents cascading failures |
| **Lending protocols** | ❌ BLOCKED | Prevents collateral attacks |
| **Futures/derivatives** | ❌ BLOCKED | Speculation, not investment |
| **Flash loans** | ❌ BLOCKED | MEV protection |

### **How We Enforce**

#### **1. On-Platform Enforcement**
```typescript
// When user tries to lend PollCoin to external protocol:
function validateTokenUsage(token, destination) {
  const blockedProtocols = [
    'aave', 'compound', 'dydx', 'maker',  // Lending
    'bitmex', 'dydx', 'perp-protocol',   // Leverage
    'uniswap-v3-margin', 'others',       // Margin trading
  ];
  
  if (blockedProtocols.includes(destination)) {
    throw new Error('Spot-only violation: This protocol enables leverage/shorts');
  }
}
```

#### **2. Smart Contract Level**
- PollCoin and Gratium contracts explicitly disable lending integrations
- Tokens cannot be used as collateral in lending protocols
- Transfer hooks prevent sending to blacklisted contracts

#### **3. Governance Rewards**
- If caught violating spot-only (e.g., wrapping on Aave), permanently ban from governance
- Community reports violations → Light Score rewards

### **Why This Works**
1. **Aligns incentives** - All holders want growth
2. **Prevents flash crashes** - No leverage cascades
3. **Protects small holders** - Whales can't short dump price
4. **Attracts institutional capital** - Stability = money
5. **Regulatory friendly** - No derivatives = fewer rules

---

## 💳 Payment Partners & Integrations

### **Primary: Stripe (Recommended)**
**Supported Regions**: US, EU, Canada, Australia, 30+ countries  
**Fees**: 2.2% + $0.30 per transaction  
**Settlement**: Daily to bank account  

**Integration**:
```typescript
// Simplified flow
const payment = await stripe.paymentIntents.create({
  amount: 50000, // $500 USD
  currency: 'usd',
  payment_method_types: ['card'],
  metadata: {
    token_purchase: 'pollcoin',
    amount_tokens: 100000000000000000000n, // 100 POLL
  }
});

// Webhook handles on-success:
// Transfer tokens to user's wallet
```

---

### **Secondary: MoonPay**
**Supported Regions**: 150+ countries  
**Fees**: 5-6% (higher but more coverage)  
**Settlement**: Monthly  

**Use For**: Non-US/EU markets  

---

### **Tertiary: Wyre**
**Supported Regions**: 190+ countries  
**Fees**: 1.5-2% (competitive)  
**Settlement**: T+2  

**Use For**: Fallback and emerging markets  

---

## 📊 Database Schema

### **Table 1: `token_purchase_orders`**
Track all fiat-to-token purchases:

```sql
CREATE TABLE token_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Purchase Details
    fiat_amount DECIMAL(15,2) NOT NULL, -- USD/EUR/etc amount
    fiat_currency VARCHAR(3) NOT NULL DEFAULT 'USD', -- ISO currency code
    
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    token_amount BIGINT NOT NULL, -- In wei (smallest unit)
    
    -- Pricing
    price_per_token DECIMAL(20,10) NOT NULL, -- What the user paid per token
    premium_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- Our markup
    
    -- Payment Provider
    payment_provider VARCHAR(50) NOT NULL, -- 'stripe', 'moonpay', 'wyre'
    provider_transaction_id VARCHAR(100) NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    )),
    
    -- KYC/AML
    kyc_verified BOOLEAN DEFAULT FALSE,
    aml_check_result VARCHAR(20), -- 'pass', 'fail', 'pending', 'manual_review'
    geographic_region VARCHAR(50), -- For compliance tracking
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    refund_reason TEXT, -- If refunded
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_user ON token_purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_status ON token_purchase_orders(status);
CREATE INDEX idx_purchase_orders_provider ON token_purchase_orders(payment_provider);
CREATE INDEX idx_purchase_orders_created ON token_purchase_orders(created_at DESC);
CREATE INDEX idx_purchase_orders_kyc ON token_purchase_orders(kyc_verified);
```

---

### **Table 2: `dex_listings`**
Track token listings on external DEXes:

```sql
CREATE TABLE dex_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- DEX Info
    dex_name VARCHAR(50) NOT NULL, -- 'uniswap', 'sushiswap', 'curve', etc.
    dex_chain VARCHAR(50) NOT NULL, -- 'ethereum', 'cardano', etc.
    
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    pool_address VARCHAR(66) NOT NULL, -- Smart contract address
    
    -- Listing Details
    trading_pair VARCHAR(30) NOT NULL, -- 'POLL/USDC', 'GRAT/ETH', etc.
    liquidity_usd DECIMAL(20,2) NOT NULL, -- Total liquidity in pool
    
    -- Spot-Only Compliance
    is_leverage_pool BOOLEAN DEFAULT FALSE, -- Margin trading enabled?
    is_shorting_enabled BOOLEAN DEFAULT FALSE, -- Shorts allowed?
    has_lending_integration BOOLEAN DEFAULT FALSE, -- Aave/Compound?
    
    compliance_status VARCHAR(20) NOT NULL DEFAULT 'monitoring' CHECK (
        compliance_status IN ('compliant', 'violation_detected', 'monitoring', 'blocked')
    ),
    
    -- Pricing
    price_usd DECIMAL(20,10),
    volume_24h DECIMAL(20,2),
    price_change_24h DECIMAL(5,2),
    
    -- Metadata
    listed_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dex_listings_token ON dex_listings(token_type);
CREATE INDEX idx_dex_listings_dex ON dex_listings(dex_name);
CREATE INDEX idx_dex_listings_compliance ON dex_listings(compliance_status);
CREATE INDEX idx_dex_listings_price ON dex_listings(price_usd);
```

---

### **Table 3: `purchase_limits`**
Enforce purchase limits to prevent whale behavior:

```sql
CREATE TABLE purchase_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Tier System
    verification_tier VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (
        verification_tier IN ('unverified', 'basic', 'verified', 'premium', 'institutional')
    ),
    
    -- Daily/Monthly Limits (in tokens)
    daily_limit BIGINT NOT NULL,
    monthly_limit BIGINT NOT NULL,
    yearly_limit BIGINT NOT NULL,
    
    -- Current Period Totals
    purchased_today BIGINT DEFAULT 0,
    purchased_this_month BIGINT DEFAULT 0,
    purchased_this_year BIGINT DEFAULT 0,
    
    -- Tracking
    last_purchase_at TIMESTAMPTZ,
    last_reset_daily TIMESTAMPTZ DEFAULT NOW(),
    last_reset_monthly TIMESTAMPTZ DEFAULT NOW(),
    last_reset_yearly TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_limits_user ON purchase_limits(user_id);
CREATE INDEX idx_purchase_limits_tier ON purchase_limits(verification_tier);
```

---

### **Table 4: `price_history`**
Track historical pricing for analytics:

```sql
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    token_type VARCHAR(10) CHECK (token_type IN ('pollcoin', 'gratium')) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'on_platform', 'uniswap', 'sushiswap', etc.
    
    -- Pricing Data
    price_usd DECIMAL(20,10) NOT NULL,
    volume_24h DECIMAL(20,2),
    market_cap DECIMAL(25,2),
    
    -- On-Platform Stats
    platform_sales_24h BIGINT DEFAULT 0, -- Tokens sold on-platform
    platform_revenue_24h DECIMAL(15,2) DEFAULT 0, -- USD collected
    
    -- Metadata
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_token ON price_history(token_type);
CREATE INDEX idx_price_history_source ON price_history(source);
CREATE INDEX idx_price_history_date ON price_history(recorded_at DESC);
```

---

### **Table 5: `compliance_alerts`**
Monitor for spot-only violations:

```sql
CREATE TABLE compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'lending_integration_detected',
        'shorting_enabled_on_pool',
        'margin_trading_enabled',
        'flash_loan_enabled',
        'unusual_volume_spike',
        'price_manipulation_suspected',
        'whale_accumulation',
        'regulatory_concern'
    )),
    
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    
    -- Context
    token_type VARCHAR(10),
    dex_name VARCHAR(50),
    pool_address VARCHAR(66),
    
    description TEXT NOT NULL,
    recommended_action TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'investigating', 'resolved', 'dismissed')
    ),
    
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX idx_compliance_alerts_type ON compliance_alerts(alert_type);
```

---

## 💰 Purchase Limits by Verification Tier

This prevents whales from accumulating too quickly and maintains community-driven ownership:

| Tier | Daily Limit | Monthly Limit | Yearly Limit | Requirements |
|------|-------------|---------------|--------------|--------------|
| **Unverified** | 500 tokens | 5,000 tokens | 50,000 tokens | Email verified |
| **Basic** | 2,500 tokens | 25,000 tokens | 250,000 tokens | Phone verified + ID verified |
| **Verified** | 10,000 tokens | 100,000 tokens | 1M tokens | Full KYC + AML pass |
| **Premium** | 50,000 tokens | 500,000 tokens | 5M tokens | Verified + $500K+ net worth |
| **Institutional** | No limits | No limits | No limits | Corporate verification |

**Why This Structure**:
- Encourages identity verification (KYC benefits)
- Prevents whale behavior early
- Creates onboarding funnel
- Maintains community-first positioning

---

## 🎯 Price Calculation

### **On-Platform Pricing Formula**

```typescript
function calculateOnPlatformPrice(
  marketPrice: Decimal,
  premiumPercentage: number = 15.0,
  minimumFeeUsd: number = 1.0
): Decimal {
  
  // Base premium
  let price = marketPrice * (1 + premiumPercentage / 100);
  
  // Ensure minimum fee
  let fee = price * 0.15;
  if (fee < minimumFeeUsd) {
    fee = minimumFeeUsd;
    price = marketPrice + fee;
  }
  
  // Round to 2 decimal places for display
  return price.toFixed(2);
}

// Example:
// Market price: $0.15 per PollCoin
// On-platform: $0.15 * 1.15 = $0.1725 per PollCoin
// User buys 1000 PollCoin:
//   Cost: $172.50
//   Platform keeps: $25.50
//   Covers: payment processing (~$3.80), staff, infrastructure
```

---

## 🔄 API Endpoints

### **POST `/api/v1/exchange/quote`**
Get a purchase quote before committing

**Request**:
```json
{
  "token_type": "pollcoin",
  "amount_tokens": "1000000000000000000000",
  "fiat_currency": "USD",
  "payment_method": "card"
}
```

**Response**:
```json
{
  "token_type": "pollcoin",
  "amount_tokens": "1000000000000000000000",
  "amount_display": "1000",
  "market_price_usd": 0.15,
  "on_platform_price_usd": 0.1725,
  "fiat_amount": 172.50,
  "fiat_currency": "USD",
  "fees": {
    "payment_processing": 3.80,
    "platform_revenue": 25.50,
    "total": 29.30
  },
  "quote_valid_until": "2025-02-15T12:05:00Z",
  "spot_only_compliance": "compliant"
}
```

---

### **POST `/api/v1/exchange/initiate-purchase`**
Start the purchase flow

**Request**:
```json
{
  "token_type": "pollcoin",
  "amount_tokens": "1000000000000000000000",
  "fiat_currency": "USD",
  "payment_provider": "stripe",
  "identity_mode": "true_self"
}
```

**Response**:
```json
{
  "purchase_id": "uuid",
  "client_secret": "stripe_client_secret_xxx",
  "redirect_url": "/checkout/stripe?purchase_id=uuid",
  "status": "awaiting_payment",
  "created_at": "2025-02-15T12:00:00Z"
}
```

---

### **POST `/api/v1/exchange/complete-purchase`**
Confirm payment received and transfer tokens

**Request**:
```json
{
  "purchase_id": "uuid",
  "payment_intent_id": "pi_xxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "purchase_id": "uuid",
  "token_type": "pollcoin",
  "amount_received": "1000000000000000000000",
  "amount_display": "1000",
  "transaction_id": "uuid",
  "status": "completed",
  "tokens_credited_at": "2025-02-15T12:01:00Z",
  "balance": "1500000000000000000000"
}
```

---

### **GET `/api/v1/exchange/prices`**
Real-time market prices

**Query Params**:
- `tokens`: Comma-separated list ('pollcoin,gratium')
- `sources`: Which exchanges to include ('on_platform,uniswap,sushiswap')

**Response**:
```json
{
  "pollcoin": {
    "on_platform": {
      "price_usd": 0.1725,
      "fee_included": true,
      "available_limit": 5000000000000000000000
    },
    "market": {
      "price_usd": 0.15,
      "sources": ["uniswap", "sushiswap"],
      "24h_volume": 250000.00,
      "24h_change": 2.5,
      "market_cap": 15000000.00
    }
  },
  "gratium": {
    "on_platform": {
      "price_usd": 0.08,
      "fee_included": true,
      "available_limit": 2500000000000000000000
    },
    "market": {
      "price_usd": 0.07,
      "sources": ["uniswap"],
      "24h_volume": 125000.00,
      "24h_change": -1.2,
      "market_cap": 7000000.00
    }
  }
}
```

---

### **GET `/api/v1/exchange/purchase-history`**
User's purchase history

**Query Params**:
- `limit`: Results per page (default 20)
- `offset`: Pagination offset
- `status`: Filter by status

**Response**:
```json
{
  "purchases": [
    {
      "id": "uuid",
      "token_type": "pollcoin",
      "amount_tokens": "1000000000000000000000",
      "fiat_amount": 172.50,
      "fiat_currency": "USD",
      "price_per_token": 0.1725,
      "status": "completed",
      "completed_at": "2025-02-15T12:01:00Z",
      "payment_provider": "stripe"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### **GET `/api/v1/exchange/dex-listings`**
Monitor external DEX listings (public)

**Response**:
```json
{
  "listings": [
    {
      "dex_name": "uniswap",
      "dex_chain": "ethereum",
      "token_type": "pollcoin",
      "trading_pair": "POLL/USDC",
      "pool_address": "0x123...",
      "liquidity_usd": 500000.00,
      "price_usd": 0.15,
      "volume_24h": 250000.00,
      "compliance_status": "compliant",
      "is_leverage_pool": false,
      "is_shorting_enabled": false,
      "listed_at": "2025-02-01T00:00:00Z"
    }
  ]
}
```

---

### **GET `/api/v1/exchange/compliance-status`**
System-wide spot-only compliance (public)

**Response**:
```json
{
  "overall_status": "compliant",
  "last_check": "2025-02-15T12:00:00Z",
  "tokens": {
    "pollcoin": {
      "status": "compliant",
      "total_listings": 5,
      "compliant_listings": 5,
      "violations": 0,
      "summary": "All DEX listings are spot-only compliant"
    },
    "gratium": {
      "status": "compliant",
      "total_listings": 3,
      "compliant_listings": 3,
      "violations": 0,
      "summary": "All DEX listings are spot-only compliant"
    }
  },
  "alerts": {
    "active": 0,
    "recent": []
  }
}
```

---

### **POST `/api/v1/exchange/report-violation`**
Users report suspected spot-only violations

**Request**:
```json
{
  "dex_name": "unknown_exchange",
  "pool_address": "0x123...",
  "violation_type": "shorting_enabled",
  "description": "I found a pool that allows shorting PollCoin",
  "evidence_url": "https://..."
}
```

**Response**:
```json
{
  "success": true,
  "report_id": "uuid",
  "status": "received",
  "reward_light_score": true,
  "message": "Thank you! Our compliance team will investigate."
}
```

---

## 🏦 Fiat On-Ramp Partners

### **Stripe Implementation**
```typescript
// 1. User enters fiat amount and card details
// 2. Create Stripe payment intent
// 3. User confirms payment
// 4. Webhook confirms → transfer tokens
// 5. Email receipt

// Webhook handler
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await completeTokenPurchase(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await failTokenPurchase(event.data.object);
      break;
  }
}
```

### **Geographic Restrictions**
```typescript
const SUPPORTED_REGIONS = [
  'US', 'CA', 'GB', 'EU', 'AU', 'NZ', // Add/remove per regulatory landscape
];

const SANCTIONED_REGIONS = [
  'IR', 'KP', 'CU', 'SY', // OFAC sanctioned countries
];

function validatePurchaseRegion(userLocation: string): boolean {
  if (SANCTIONED_REGIONS.includes(userLocation)) return false;
  if (SUPPORTED_REGIONS.includes(userLocation)) return true;
  return false; // Default deny unknown regions
}
```

---

## 🔒 Security Considerations

### **1. Fraud Prevention**
- Rate limit purchase attempts
- Verify IP address consistency
- Monitor for credit card testing
- Check for VPN/proxy usage
- Velocity checks (multiple cards, same user)

### **2. KYC/AML Integration**
```typescript
// Partner with service like Persona, Jumio, or Sum&Substance
async function verifyKYC(userId: string, documents: KYCDocuments) {
  const result = await kycProvider.verify({
    firstName: user.first_name,
    lastName: user.last_name,
    dateOfBirth: user.dob,
    documents: documents,
  });
  
  if (result.status === 'approved') {
    await upgradePurchaseLimit(userId, 'basic');
  }
}
```

### **3. Spot-Only Smart Contracts**
Encode spot-only rules directly in token contracts:

```solidity
// Simplified example
contract PollCoin is ERC20 {
    mapping(address => bool) public blockedProtocols;
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(!blockedProtocols[to], "Spot-only violation");
        super._beforeTokenTransfer(from, to, amount);
    }
    
    function blockProtocol(address protocol) external onlyGovernance {
        blockedProtocols[protocol] = true;
    }
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- Quote calculation matches expected amounts
- Premium pricing applied correctly
- Tier limits enforced
- Price history recorded accurately
- Compliance flags toggle properly

### **Integration Tests**
- Complete purchase flow (quote → payment → tokens)
- DEX price feed updates
- Purchase limit resets daily/monthly
- Webhook processing
- Refund handling

### **Security Tests**
- Cannot bypass KYC requirements
- Cannot purchase over limits
- Cannot send to blocked protocols
- Rate limiting works
- Fraud patterns detected

### **Compliance Tests**
- Geographic restrictions enforced
- Sanctioned country access denied
- Audit trail complete
- Spot-only rules enforced
- Price manipulation attempts blocked

### **Load Tests**
- Handle 1000+ concurrent quote requests
- DEX price updates with <100ms latency
- Purchase processing: <2 seconds
- No dropped webhooks

---

## 📊 Success Metrics

### **Adoption**
- ✅ 50%+ of users purchase tokens within first 30 days
- ✅ Average purchase size: $50-500 USD
- ✅ Repeat purchase rate: >40%
- ✅ Geographic diversity: >20 countries

### **Economic Health**
- ✅ On-platform purchases represent 20-30% of total transaction volume
- ✅ Average on-platform premium accepted: 12-15%
- ✅ Platform revenue from on-ramp: $50K+ per month (at scale)
- ✅ No whale concentration (top 10 holders <30% of supply)

### **Compliance**
- ✅ 100% spot-only compliance maintained
- ✅ Zero lending integrations detected
- ✅ Zero successful shorting attempts
- ✅ Zero derivatives markets
- ✅ KYC/AML pass rate: >95%

### **Performance**
- ✅ Quote responses: <100ms
- ✅ Payment processing: 99.9% success rate
- ✅ Token delivery: <5 minutes from payment
- ✅ Zero failed transactions

---

## 🚀 Build Timeline

**Week 8** (after Module 04: Economy is complete)

### **Day 1-2: Database Setup**
- Create 5 tables (purchases, DEX listings, limits, price history, compliance)
- Initialize purchase tiers
- Set up price tracking schema

### **Day 3-4: Payment Integration**
- Integrate Stripe payment processing
- Set up webhooks
- Implement KYC check

### **Day 5-6: On-Platform Pricing**
- Build quote calculation engine
- Implement purchase flow (initiate → complete)
- Add purchase limits enforcement

### **Day 7-8: DEX Monitoring**
- Connect to Uniswap subgraph
- Monitor for spot-only violations
- Create compliance alerts system

### **Day 9-10: API & Testing**
- Build 6 REST endpoints
- Unit tests for calculations
- Integration tests for payment flow
- Security tests for fraud/compliance

**Deliverable**: Complete token acquisition system operational with on-platform purchases and spot-only enforcement!

---

## 🔗 Integration with Other Modules

### **Module 01 (Identity)** - Uses
- Separate purchase limits per identity (True Self vs Shadow)
- DIDs tracked on token purchase records

### **Module 04 (Economy)** - Depends On
- Receives token balance updates
- Uses transaction history
- Integrates with Light Score (rewards for verification)

### **Module 06 (Governance)** - Provides To
- Users need PollCoin to create polls
- Purchase flow displayed in governance module

### **Module 09 (Verification)** - Provides To
- KYC verification increases purchase limits
- Verified users get higher tiers

### **Module 13 (Pentos)** - Integrates With
- Explains why on-platform premium exists
- Guides users to best purchasing option
- Notifies about compliance status

---

## ⚠️ Critical Reminders

1. **Premium is sustainable, not predatory** - 15% is competitive with centralized exchanges
2. **KYC improves UX** - Higher limits = better experience for verified users
3. **Spot-only is the moat** - This is your competitive advantage; protect it religiously
4. **Geographic restrictions matter** - Legal compliance prevents shutdown
5. **Monitor leverage constantly** - New protocols appear; stay vigilant
6. **Price feeds must be accurate** - Stale prices = incorrect quotes
7. **Webhooks must be reliable** - Failed webhooks = frustrated users with pending payments
8. **Compliance alerts require action** - Team must respond to violations in <24h

---

## 📚 Additional Documentation

- **Payment Integration Guide**: `docs/PAYMENT_PROVIDERS.md`
- **Spot-Only Monitoring Playbook**: `docs/SPOT_ONLY_ENFORCEMENT.md`
- **KYC/AML Procedures**: `docs/KYC_AML_PROCEDURES.md`
- **Price Feed Architecture**: `docs/PRICE_FEEDS.md`
- **Compliance Checklist**: `docs/COMPLIANCE_CHECKLIST.md`

---

**Module 05 Status**: ✅ Design Complete - Ready for Week 8 Implementation

**Previous Module**: Module 04 (Economy) - Ready to Build  
**Next Module**: Module 06 (Governance) - Dual-Mode Voting System
