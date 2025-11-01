# Dream Protocol - Testing Framework for Modules 01-05

**Purpose**: Validate that all 5 foundation modules meet specifications before moving to Module 06 (Governance).

**Organized By**: Module | Type | Test Areas

---

## Overview: Test Categories

You have **3 levels of testing** to perform (in order):

1. **Unit Tests** - Individual functions/services work correctly
2. **Integration Tests** - Modules work together correctly  
3. **Cross-Module Tests** - Full system interactions (Module 01 → Module 05)

**Target**: Achieve **80%+ code coverage** across all 5 modules.

---

# MODULE 01: Identity - Testing Framework

## Unit Tests

### 1. Wallet Generation Tests
```
✅ Test: createDualIdentity() generates two distinct Cardano wallets
   - Verify: wallet_true_self has unique address
   - Verify: wallet_shadow has unique address
   - Verify: Addresses are different (never same)
   - Verify: Both wallets are valid Cardano format

✅ Test: DualityToken creation and encryption
   - Verify: DualityToken is generated
   - Verify: DualityToken is encrypted (not plaintext)
   - Verify: Encrypted token can be decrypted with correct master key
   - Verify: Token proves linkage between wallets

✅ Test: UTXO pool initialization
   - Verify: utxo_pool_true_self is created and empty
   - Verify: utxo_pool_shadow is created and empty
   - Verify: Pools are separate (different IDs)
```

### 2. DID Document Tests
```
✅ Test: DID generation is W3C compliant
   - Verify: DID format is "did:example:XXX"
   - Verify: DID document contains required fields (id, publicKey, etc.)
   - Verify: DID is resolvable via HTTP endpoint
   - Verify: Each identity has unique DID

✅ Test: DID resolution
   - Verify: DID resolves to correct DID document
   - Verify: Public key in document matches wallet public key
   - Verify: Document cannot reveal linkage between identities
```

### 3. Encryption Tests
```
✅ Test: AES-256-GCM encryption
   - Verify: Private keys are encrypted at rest
   - Verify: Decryption requires correct master key
   - Verify: Wrong master key fails decryption
   - Verify: Encryption nonce is random (no duplicates)

✅ Test: Master key derivation
   - Verify: PBKDF2 parameters are correct (iterations, salt length)
   - Verify: Same password + salt = same derived key
   - Verify: Different password = different key
```

### 4. Session Management Tests
```
✅ Test: Session creation
   - Verify: Session created with user_id
   - Verify: Current mode defaults to 'true_self'
   - Verify: Session has 7-day expiry
   - Verify: Session is encrypted

✅ Test: Mode switching
   - Verify: Can switch from true_self to shadow
   - Verify: Can switch from shadow back to true_self
   - Verify: Mode switch is logged for audit trail
   - Verify: Previous session automatically expires on switch

✅ Test: Session expiry
   - Verify: Session expires after 7 days
   - Verify: Expired sessions are cleaned up
   - Verify: Max 5 sessions per user enforced
```

---

## Integration Tests

### 1. Full Registration Flow
```
✅ Test: User registration creates complete dual identity
   1. Call POST /api/v1/auth/register
      - email, username, password
   2. Verify response has:
      - user_id (UUID)
      - token (JWT)
      - dual_wallets with true_self & shadow
      - dids (both DIDs)
   3. Verify database:
      - users table has entry
      - dual_wallets table has 2 rows
      - did_documents table has 2 rows
      - sessions table has 1 row
      - user_identities table has 2 rows
```

### 2. Identity Mode Switching
```
✅ Test: Switch from True Self to Shadow and back
   1. Get current identity (should be true_self)
   2. POST /api/v1/identity/switch-mode with mode='shadow'
   3. Verify response has mode='shadow'
   4. Get current identity again (should be shadow)
   5. POST /api/v1/identity/switch-mode with mode='true_self'
   6. Verify response has mode='true_self'
   7. Check audit log has 2 switch events
```

### 3. UTXO Pool Separation
```
✅ Test: True Self and Shadow cannot share UTXOs
   1. Create mock UTXO for true_self wallet
   2. Query UTXO pool for true_self (should return it)
   3. Query UTXO pool for shadow (should NOT return it)
   4. Create mock UTXO for shadow wallet
   5. Query UTXO pool for shadow (should return it)
   6. Query UTXO pool for true_self (should still NOT have shadow UTXO)
```

### 4. Encryption Verification
```
✅ Test: DualityToken cannot be accessed without encryption
   1. Create identity (DualityToken created)
   2. Try to read DualityToken from database directly
      - Should be encrypted (gibberish, not plaintext)
   3. Call API endpoint to get DualityToken (with auth)
      - Should never return raw DualityToken
      - Can only verify linkage via encryption check endpoint
```

---

## Security Tests

```
✅ Test: Cannot create identity without unique email
   - Try to register twice with same email → 409 Conflict

✅ Test: Cannot switch mode without valid session
   - Try to switch mode with expired/invalid token → 401 Unauthorized

✅ Test: Cannot access Shadow wallet with True Self credentials
   - Get True Self wallet address
   - Try to spend Shadow wallet UTXOs → 403 Forbidden

✅ Test: Password hashing is secure
   - Store password (should be bcrypt hashed)
   - Check password in database
   - Verify it's not plaintext
   - Verify different passwords hash differently
```

---

# MODULE 02: Bridge Legacy - Testing Framework

## Unit Tests

### 1. Feature Flag Tests
```
✅ Test: Feature flag creation
   - Create flag with name='new_system', rollout_strategy='percentage'
   - Verify flag_id is generated
   - Verify enabled=false by default
   - Verify rollout_percentage=0 by default

✅ Test: Percentage-based routing (deterministic)
   - Create flag with 50% rollout
   - Test 100 users: userId_0, userId_1, ..., userId_99
   - For each user, hash to 0-100 range
   - Verify approximately 50% are routed to new system
   - Verify SAME user always gets SAME result (deterministic)

✅ Test: Whitelist override
   - Create flag with 0% rollout (disabled)
   - Whitelist user_admin
   - Verify user_admin is enabled (whitelist overrides percentage)
   - Verify user_normal is still disabled

✅ Test: Global enable/disable
   - Create flag with 50% rollout
   - Call disableFeatureFlag('flag_name')
   - Verify ALL users are disabled (even whitelisted)
   - Call enableFeatureFlag('flag_name')
   - Verify rollout percentage is respected again
```

### 2. Migration Service Tests
```
✅ Test: Data migration for users
   - Create mock legacy user in legacy_users table
   - Call migratUserData(legacy_user_id)
   - Verify new user created in users table
   - Verify migration_status shows 'completed'
   - Verify no data loss

✅ Test: Data migration for posts
   - Create mock legacy post
   - Call migratePosts(batch_id)
   - Verify new post created
   - Verify timestamps preserved
   - Verify user_id remapped correctly

✅ Test: Migration validation
   - Before migration, count legacy_posts = 100
   - Migrate all posts
   - Count new posts = 100
   - Verify no posts lost or duplicated

✅ Test: Rollback capability
   - Migrate batch of data
   - Call rollbackMigration(batch_id)
   - Verify new data is deleted
   - Verify migration_status shows 'rolled_back'
```

### 3. Adapter Service Tests
```
✅ Test: Translate legacy API to new API
   - Legacy request: GET /v1/user/123
   - Adapter translates to: GET /api/v2/users/legacy/123
   - Verify response format matches legacy (no breaking changes)
   - Verify data is correct

✅ Test: Adapter caching
   - Call adapter endpoint twice
   - First call should hit database
   - Second call should use cache (faster)
   - Verify cache TTL is 30 seconds (expires correctly)
```

---

## Integration Tests

### 1. Zero-Downtime Migration Scenario
```
✅ Scenario: Roll out new system gradually
   1. Create feature flag with 0% rollout (legacy only)
   2. Gradually increase: 5% → 10% → 25% → 50% → 100%
   3. At each step:
      - Verify 5% of users hit new system
      - Verify 95% still hit legacy
      - Verify data consistency between systems
      - Verify no errors in logs

   Final state: 100% of users on new system, zero downtime
```

### 2. Whitelist Testing (Beta Users)
```
✅ Scenario: Private beta for selected users
   1. Create flag at 0% rollout (disabled for all)
   2. Whitelist 5 beta testers
   3. Verify only those 5 users can access new system
   4. Verify other users still get legacy
   5. Remove whitelist for one user
   6. Verify they're back on legacy
```

### 3. Migration Audit Trail
```
✅ Scenario: Track all migrations for compliance
   1. Migrate 100 users in batch
   2. Query migration_logs
   3. Verify 100 entries created
   4. Verify each has: entity_type, action, success, timestamp
   5. Verify batch_id groups them together
   6. Verify initiated_by is recorded
```

---

# MODULE 03: User - Testing Framework

## Unit Tests

### 1. Profile Creation Tests
```
✅ Test: Create profile for True Self
   - user_id, identity_mode='true_self'
   - Verify profile_visibility='public' (can be rich)
   - Verify bio, display_name can be set
   - Verify avatar_url can be uploaded

✅ Test: Create profile for Shadow
   - user_id, identity_mode='shadow'
   - Verify profile_visibility='private' (defaults private)
   - Verify minimal info (no detailed bio)
   - Verify Shadow cannot change to public_visibility

✅ Test: Separate profiles are independent
   - Create both profiles for same user
   - Update True Self bio
   - Verify Shadow bio is unchanged
   - Update Shadow display_name
   - Verify True Self display_name is unchanged
```

### 2. Settings Tests
```
✅ Test: Settings apply globally (not per identity)
   - Create user with 2 identities
   - Set notification_settings in True Self mode
   - Switch to Shadow mode
   - Verify same notification_settings apply

✅ Test: Privacy settings per identity
   - Set True Self profile_visibility='public'
   - Set Shadow profile_visibility='private'
   - Query True Self profile as different user → visible
   - Query Shadow profile as different user → not visible
```

### 3. Avatar Upload Tests
```
✅ Test: Avatar upload creates thumbnails
   - Upload 1000x1000 image
   - Verify 3 versions created:
     - thumbnail: 100x100
     - medium: 300x300
     - large: 600x600
   - Verify all stored with correct URLs

✅ Test: Avatar size validation
   - Upload image >5MB → rejection
   - Upload image <100KB → acceptance
   - Verify error message for oversized

✅ Test: Avatar format validation
   - PNG upload → accepted
   - JPG upload → accepted
   - GIF upload → accepted
   - WebP upload → accepted
   - EXE upload → rejected
```

### 4. Account Status Tests
```
✅ Test: Account status transitions
   - New account: status='active'
   - Suspend account: status='suspended'
   - Verify suspended user cannot login
   - Reactivate: status='active'
   - Verify user can login again

✅ Test: Verification levels
   - New account: verified_status=false
   - After Proof of Humanity: verified_status=true
   - Verify Trust Score displayed only for verified
```

---

## Integration Tests

### 1. Full Profile Setup Flow
```
✅ Scenario: New user completes profile
   1. Register (Module 01)
   2. POST /api/v1/users/profile
      - Create True Self profile
      - Set display_name, bio, avatar
   3. Upload avatar (Sharp processes it)
   4. Verify profile_visibility='public'
   5. GET /api/v1/users/{user_id}/profile
      - Verify all fields returned
      - Verify avatar URLs valid
      - Verify created_at timestamp
```

### 2. Dual Identity Profile Visibility
```
✅ Scenario: Check privacy between identities
   1. Create True Self profile (public)
   2. Create Shadow profile (private)
   3. As other_user, query my_user's profiles:
      - GET /api/v1/users/{user_id}/profile?mode=true_self
        → Should return profile (public)
      - GET /api/v1/users/{user_id}/profile?mode=shadow
        → Should return empty/error (private)
```

### 3. Settings Persistence
```
✅ Scenario: Settings survive mode switches
   1. Switch to True Self, enable notifications
   2. Switch to Shadow, verify notifications still enabled
   3. Switch back to True Self, verify still enabled
   4. Logout and login
   5. Verify notifications still enabled
```

---

# MODULE 04: Economy - Testing Framework

## Unit Tests

### 1. Balance Tests
```
✅ Test: Initial balance creation
   - Create user (Module 01, 02, 03)
   - Verify token_ledger entry created:
     - pollcoin_balance=0
     - gratium_balance=0
     - identity_mode='true_self'
   - Create entry for shadow (same user):
     - Separate pollcoin_balance
     - Separate gratium_balance

✅ Test: Balance cannot be negative
   - Attempt to transfer 100 PollCoin when balance=50
   - Should be rejected (403 Forbidden)
   - Balance remains 50

✅ Test: Balance precision (bigint)
   - Create transaction for 0.0001 PollCoin (18 decimals)
   - Verify stored as 100000000000000 (as bigint)
   - Retrieve and verify calculation correct
   - No floating-point errors
```

### 2. Transaction Tests
```
✅ Test: Transfer between identities
   - True Self has 100 PollCoin
   - Transfer 50 to Shadow
   - Verify True Self: 100 - 50 (burn 1%) = 49 PollCoin
   - Verify Shadow: 50 PollCoin
   - Verify burn_ledger: 1 PollCoin burned

✅ Test: Atomic transactions
   - Start transfer of 50 PollCoin
   - Simulate database error mid-transfer
   - Verify transaction rolls back
   - Verify both balances unchanged
   - Verify transaction status='failed'

✅ Test: Transaction fees
   - Transfer 100 PollCoin
   - Verify 1% (1 PollCoin) burned
   - Verify 99 received by recipient
   - Verify fee recorded in fee_ledger

✅ Test: Transfer history
   - Make 5 transfers
   - Query transaction_history
   - Verify all 5 appear with:
     - from_user_id, to_user_id
     - amount, fee, net_amount
     - transaction_type, timestamp
     - status='completed'
```

### 3. Lock/Stake Tests
```
✅ Test: Token locking
   - Lock 50 PollCoin for governance
   - Verify locked_pollcoin_balance=50
   - Verify available_balance=50 (total - locked)
   - Verify cannot transfer locked tokens

✅ Test: Unlock release
   - Lock 50 PollCoin
   - Wait for unlock_timestamp (simulate)
   - Call unlock()
   - Verify locked_balance=0
   - Verify available_balance=100 again
   - Verify can transfer now

✅ Test: Lock cooldown
   - Lock 50 PollCoin
   - Try to unlock immediately → rejected (locked for 48h)
   - Fast-forward 48 hours
   - Try to unlock → success
```

### 4. Burn Mechanics Tests
```
✅ Test: PollCoin burn rate (1% per transfer)
   - Transfer 100 PollCoin
   - Verify 1 PollCoin burned
   - Verify token_supply decreased by 1

✅ Test: Gratium burn rate (0.5% per transfer)
   - Transfer 100 Gratium
   - Verify 0.5 Gratium burned
   - Verify token_supply decreased by 0.5

✅ Test: Burn cannot go negative
   - Transfer 0.1 PollCoin
   - Burn rate = 1% × 0.1 = 0.001
   - Verify rounding works correctly
   - Verify at least 0.001 burned (or 1 in smallest unit)
```

### 5. Light Score Tests
```
✅ Test: Light Score initialization
   - Create user
   - Verify Light Score=50 (neutral default)

✅ Test: Light Score bounds
   - Try to set Light Score=101 → rejected
   - Try to set Light Score=-1 → rejected
   - Set Light Score=0 → accepted
   - Set Light Score=100 → accepted

✅ Test: Light Score update logging
   - Update Light Score from 50 to 60
   - Verify light_score_events entry created:
     - old_value=50, new_value=60
     - reason (e.g., 'post_created', 'verification')
     - changed_at timestamp
```

---

## Integration Tests

### 1. End-to-End Transfer Scenario
```
✅ Scenario: User receives initial tokens and transfers them
   1. Create user (gets 0 tokens initially)
   2. Admin: Grant 100 PollCoin (initial_grant)
   3. User: Transfer 30 PollCoin to another user
      - Check sender: 100 - 30 - 1 (burn) = 69
      - Check receiver: 30 - 0.3 (burn) = 29.7 → rounds to 30
      - Check supply decreased
   4. Query transaction history: both users see transfer
```

### 2. Dual Identity Economy
```
✅ Scenario: True Self and Shadow have independent tokens
   1. True Self receives 100 PollCoin
   2. Shadow receives 50 PollCoin (separate)
   3. True Self transfers 30 to other user
      - True Self: 70 remaining
      - Shadow: still 50 (unaffected)
   4. Shadow transfers 20 to other user
      - Shadow: 30 remaining
      - True Self: still 70 (unaffected)
```

### 3. Locking for Governance (Module 06 prep)
```
✅ Scenario: Lock tokens in preparation for voting
   1. User has 100 PollCoin
   2. Lock 50 PollCoin for 'governance_vote'
      - locked_balance=50
      - available_balance=50
   3. Try to transfer 75 → rejected (only 50 available)
   4. Transfer 50 → success
      - available_balance=0
      - locked_balance=50 (unchanged)
   5. Unlock when voting ends
      - locked_balance=0
      - available_balance=50
```

---

# MODULE 05: Token Exchange - Testing Framework

## Unit Tests

### 1. Purchase Order Tests
```
✅ Test: Create purchase order
   - POST /api/v1/token-exchange/purchase
   - amount_usd=100, token_type='pollcoin'
   - Verify order created:
     - amount_tokens calculated (market price + 15%)
     - status='pending'
     - expires_at set (15 min expiry)

✅ Test: Purchase quote calculation
   - Get quote for 100 USD of PollCoin
   - Verify price is market_price × 1.15 (15% premium)
   - Verify amount_tokens = amount_usd / price_usd

✅ Test: Tier-based limits
   - User unverified: daily_limit=500 USD
   - User basic verified: daily_limit=5000 USD
   - User premium: daily_limit=50000 USD
   - Verify limits enforced

✅ Test: KYC verification
   - Without KYC: kyc_verified=false, can still buy small amounts
   - After KYC: kyc_verified=true, higher limits unlocked
```

### 2. Payment Provider Tests
```
✅ Test: Stripe payment processing
   - Create order for 100 USD
   - Initiate Stripe payment
   - Verify webhook received
   - Verify order status changes to 'completed'
   - Verify tokens delivered

✅ Test: Payment failure handling
   - Create order
   - Simulate payment failure (declined card)
   - Verify order status='failed'
   - Verify user not charged
   - Verify order can be retried

✅ Test: Webhook reliability
   - Complete payment
   - Simulate webhook retry (duplicate)
   - Verify tokens not double-credited
   - Verify idempotency works
```

### 3. DEX Monitoring Tests
```
✅ Test: Monitor Uniswap for spot-only compliance
   - Check pool: POLL/USDC on Uniswap
   - Verify is_leverage_pool=false
   - Verify is_shorting_enabled=false
   - Verify has_lending_integration=false
   - Status: 'compliant'

✅ Test: Detect leverage pool violation
   - Check Uniswap pool
   - Detect is_leverage_pool=true
   - Alert: compliance_status='violation_detected'
   - Flag for manual review

✅ Test: Price feed accuracy
   - Get price from multiple DEXes
   - Verify prices within 1% of each other
   - Flag if significant deviation
   - Use median price for quote
```

### 4. Rate Limiting Tests
```
✅ Test: Daily purchase limits
   - User purchases 400 USD (unverified limit=500)
   - Try to purchase 200 USD more → rejected
   - Wait for daily reset
   - Purchase succeeds

✅ Test: Monthly limits
   - User purchases 4500 USD in one day
   - Can't exceed monthly limit (basic=5000)
   - Try to purchase another 1000 → rejected
   - Wait for monthly reset → allowed

✅ Test: Whale prevention
   - User tries to purchase 100M PollCoin in one order
   - Rejected: exceeds tier limit
   - Can split into multiple orders (respects daily/monthly)
```

### 5. Compliance Tests
```
✅ Test: Geographic restrictions
   - User from sanctioned country tries to purchase
   - Request rejected with geo_error
   - User from allowed country can purchase

✅ Test: AML/KYC flags
   - Attempt to purchase with flagged name
   - AML check: aml_check_result='manual_review'
   - Order holds for manual review
   - After approval: proceed
   - After rejection: cancel and refund

✅ Test: Transaction history audit
   - Make 5 purchases
   - Query history
   - Verify complete audit trail:
     - user_id, amount_usd, amount_tokens
     - payment_provider, status
     - kyc_verified, aml_result
     - created_at, completed_at
```

---

## Integration Tests

### 1. Full Purchase Flow
```
✅ Scenario: User buys tokens via platform
   1. User gets quote:
      - GET /api/v1/token-exchange/quote?amount_usd=100&token=pollcoin
      - Response: price, premium, total_tokens
   2. User initiates purchase:
      - POST with amount_usd=100
      - Response: order_id, payment_url
   3. User pays via Stripe
   4. Stripe webhook received
   5. Tokens delivered to user wallet
   6. Order status='completed'
   7. Verify token_ledger updated with new balance
```

### 2. Cross-Module: Economy → Exchange
```
✅ Scenario: Purchased tokens integrate with economy
   1. User has 0 PollCoin
   2. Purchase 100 PollCoin (15% premium)
   3. token_ledger updated:
      - pollcoin_balance=100
   4. User can transfer these tokens (Module 04)
   5. Transfer 50 PollCoin
   6. Verify burn mechanics apply (1% = 0.5)
   7. Recipient receives 49.5 PollCoin
```

### 3. Price Monitoring
```
✅ Scenario: Platform updates prices from DEX feeds
   1. Uniswap price: 0.10 USD per PollCoin
   2. Platform price: 0.10 × 1.15 = 0.115 USD (with premium)
   3. Uniswap price drops to 0.08 USD
   4. Platform updates automatically
   5. New platform price: 0.08 × 1.15 = 0.092 USD
   6. User quote reflects new price
```

---

# CROSS-MODULE INTEGRATION TESTS

## Full System Integration (Module 01 → 05)

### Test 1: Complete New User Journey
```
✅ Scenario: Brand new user signs up, buys tokens, and makes transfer
   
   STEP 1 - Identity (Module 01)
   1. POST /auth/register
      - email, username, password
      - Response: token, user_id, dual_wallets, DIDs
   
   STEP 2 - User Profile (Module 03)
   1. POST /users/profile
      - display_name, bio, avatar
      - Response: profile_id, profile_visibility
   
   STEP 3 - Bridge (Module 02)
   1. GET /admin/rollout-status
      - Verify user routed to correct system (0% to new at start)
   
   STEP 4 - Token Purchase (Module 05)
   1. GET /token-exchange/quote?amount=100&token=pollcoin
      - Response: price with 15% premium
   2. POST /token-exchange/purchase
      - Stripe payment
      - Webhook: tokens delivered
   
   STEP 5 - Economy (Module 04)
   1. GET /balance
      - Verify 100 PollCoin received
   2. POST /transfer
      - Transfer 50 PollCoin to friend
      - Verify 1% burn applied
      - Friend receives 49.5
   
   RESULT: ✅ Full journey works seamlessly
```

### Test 2: Dual Identity Economy Separation
```
✅ Scenario: True Self and Shadow have independent economies
   
   STEP 1 - True Self purchases
   1. Switch to True Self
   2. Purchase 100 PollCoin
   3. Balance (True Self): 100 PollCoin
   
   STEP 2 - Shadow purchases
   1. Switch to Shadow
   2. Purchase 50 PollCoin
   3. Balance (Shadow): 50 PollCoin
   4. Balance (True Self still): 100 PollCoin (unchanged)
   
   STEP 3 - Verify separation
   1. Transfer 30 PollCoin from True Self
      - True Self: 70
      - Shadow: 50 (unaffected)
   2. Transfer 20 PollCoin from Shadow
      - Shadow: 30
      - True Self: 70 (unaffected)
   
   RESULT: ✅ Economies are completely separate
```

### Test 3: Fraud Detection
```
✅ Scenario: Detect and prevent malicious behavior
   
   STEP 1 - Whale detection (Module 05)
   1. User tries to purchase 50M PollCoin in one order
   2. Rejected: exceeds tier limit
   
   STEP 2 - AML flag (Module 05)
   1. User with flagged name tries to purchase
   2. Order flagged for manual review
   3. Cannot proceed until manual approval
   
   STEP 3 - Prevent balance manipulation (Module 04)
   1. User tries to create negative balance
   2. Rejected: insufficient balance
   
   RESULT: ✅ Fraud detection working across modules
```

---

# Test Execution Checklist

## Phase 1: Unit Tests (Run in Module Order)

- [ ] Module 01 Unit Tests (20 tests)
- [ ] Module 02 Unit Tests (12 tests)
- [ ] Module 03 Unit Tests (15 tests)
- [ ] Module 04 Unit Tests (25 tests)
- [ ] Module 05 Unit Tests (20 tests)

**Target**: 80%+ code coverage per module

**Command**:
```bash
cd packages/01-identity
pnpm test --coverage
# Repeat for 02, 03, 04, 05
```

---

## Phase 2: Integration Tests (Run per Module)

- [ ] Module 01 Integration Tests (8 tests)
- [ ] Module 02 Integration Tests (6 tests)
- [ ] Module 03 Integration Tests (5 tests)
- [ ] Module 04 Integration Tests (7 tests)
- [ ] Module 05 Integration Tests (6 tests)

**Command**:
```bash
pnpm test:integration
```

---

## Phase 3: Cross-Module Tests

- [ ] Full User Journey (3 tests)
- [ ] Dual Identity Scenarios (5 tests)
- [ ] Fraud Detection (3 tests)
- [ ] Performance Under Load (2 tests)

**Command**:
```bash
pnpm test:e2e
```

---

# Success Criteria

## Code Quality
- ✅ 80%+ code coverage (all modules)
- ✅ 0 linting errors
- ✅ 0 TypeScript errors (strict mode)
- ✅ All tests passing

## Functional Correctness
- ✅ All user journeys work end-to-end
- ✅ Dual identity separation verified
- ✅ All burn mechanics correct
- ✅ No balance inconsistencies

## Security
- ✅ Encryption working correctly
- ✅ DualityToken never exposed
- ✅ UTXO pools properly separated
- ✅ Fraud detection operational

## Performance
- ✅ Registration completes in <2 seconds
- ✅ Token transfer completes in <500ms
- ✅ Purchase quote responds in <100ms
- ✅ 100 concurrent transfers succeed

---

# After Testing: Next Steps

Once all tests pass:

1. **Update PROGRESS.md**
   ```
   Modules 01-05: ✅ TESTED & VERIFIED
   Ready for Module 06: Governance
   ```

2. **Git Commit**
   ```bash
   git add .
   git commit -m "Test Phase Complete: Modules 01-05 - 80%+ coverage achieved

   - Module 01: 22 unit + 8 integration tests ✅
   - Module 02: 12 unit + 6 integration tests ✅
   - Module 03: 15 unit + 5 integration tests ✅
   - Module 04: 25 unit + 7 integration tests ✅
   - Module 05: 20 unit + 6 integration tests ✅
   - Cross-module: 13 integration tests ✅

   All tests passing. 80%+ code coverage.
   Ready for Module 06 (Governance).
   "
   ```

3. **Proceed to Module 06**
   - Review MODULE_06_GOVERNANCE_TECHNICAL_PLAN.md
   - Validate specifications
   - Begin implementation

---

**Good luck. Build with excellence.**
