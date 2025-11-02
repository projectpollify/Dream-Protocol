# Module 09: Verification - Session 1 Fixes

**Quick Reference for Fixing 28 TypeScript Errors**

---

## Fix #1: Update ProofOfHumanity Type to snake_case

**File**: `src/types/index.ts`

Change from camelCase to snake_case to match database:

```typescript
// CHANGE THIS:
export interface ProofOfHumanity {
  id: string;
  userId: string;
  identityMode: IdentityMode;
  // ... etc

// TO THIS:
export interface ProofOfHumanity {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  level: PoHLevel;
  status: VerificationStatus;
  behavioral_score: number;
  biometric_score: number;
  social_score: number;
  temporal_score: number;
  economic_score: number;
  methods_completed: VerificationMethod[];
  last_verified: Date | null;
  next_reverification: Date | null;
  expires_at: Date | null;
  verification_data: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## Fix #2: Update VeracityBond Type to snake_case

**File**: `src/types/index.ts`

```typescript
// CHANGE THIS:
export interface VeracityBond {
  id: string;
  userId: string;
  identityMode: IdentityMode;
  // ... etc

// TO THIS:
export interface VeracityBond {
  id: string;
  user_id: string;
  identity_mode: IdentityMode;
  bond_type: BondType;
  target_id: string;
  target_type: string;
  gratium_amount: bigint;
  status: BondStatus;
  claim_text?: string;
  confidence_level: number;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
  resolved_at: Date | null;
  resolution_evidence?: Record<string, any>;
  slashed_amount: bigint;
}
```

---

## Fix #3: Add Null Checks in ProofOfHumanityService

**File**: `src/services/proof-of-humanity.service.ts`

In `initiateVerification` method around line 50-67:

```typescript
// CHANGE THIS:
let poh = await queryOne<ProofOfHumanity>(
  'SELECT * FROM proof_of_humanity WHERE user_id = $1 AND identity_mode = $2',
  [userId, identityMode]
);

if (!poh) {
  const result = await query<ProofOfHumanity>(
    `INSERT INTO proof_of_humanity (user_id, identity_mode, level, status)
     VALUES ($1, $2, 0, 'pending')
     RETURNING *`,
    [userId, identityMode]
  );
  poh = result.rows[0];
}

// TO THIS:
let poh = await queryOne<ProofOfHumanity>(
  'SELECT * FROM proof_of_humanity WHERE user_id = $1 AND identity_mode = $2',
  [userId, identityMode]
);

if (!poh) {
  const result = await query<ProofOfHumanity>(
    `INSERT INTO proof_of_humanity (user_id, identity_mode, level, status)
     VALUES ($1, $2, 0, 'pending')
     RETURNING *`,
    [userId, identityMode]
  );
  poh = result.rows[0];

  if (!poh) {
    throw new Error('Failed to create PoH record');
  }
}

// Now poh is definitely non-null
const completedMethods = (poh.methods_completed as VerificationMethod[]) || [];
```

---

## Fix #4: Remove private Keywords from Object Literals

**File**: `src/services/proof-of-humanity.service.ts`

Remove `private` from these lines:

```typescript
// CHANGE THIS:
export const proofOfHumanityService = {
  async initiateVerification(...) { ... },

  private calculateOverallScore(...) { ... }, // ❌ REMOVE 'private'

  private getRequiredMethods(...) { ... }, // ❌ REMOVE 'private'

  private calculateLevel(...) { ... }, // ❌ REMOVE 'private'
};

// TO THIS:
export const proofOfHumanityService = {
  async initiateVerification(...) { ... },

  calculateOverallScore(...) { ... }, // ✅ No 'private'

  getRequiredMethods(...) { ... }, // ✅ No 'private'

  calculateLevel(...) { ... }, // ✅ No 'private'
};
```

Optional: Prefix with underscore to indicate "private":
```typescript
export const proofOfHumanityService = {
  async initiateVerification(...) { ... },

  _calculateOverallScore(...) { ... }, // Indicates private by convention
  _getRequiredMethods(...) { ... },
  _calculateLevel(...) { ... },
};
```

---

## Fix #5: Fix Type Mismatch in calculateLevel

**File**: `src/services/proof-of-humanity.service.ts`

Around line 296, update to use snake_case properties:

```typescript
// CHANGE THIS:
private calculateLevel(poh: ProofOfHumanity): PoHLevel {
  const avgScore =
    (poh.behavioral_score +
      poh.biometric_score +
      poh.social_score +
      poh.temporal_score +
      poh.economic_score) /
    5;
    // ... rest works, just properties updated
}

// It's actually correct already if you fix the type names above!
```

---

## Fix #6: Fix VeracityBond Type Usage

**File**: `src/services/veracity-bond.service.ts`

Update property references around lines 152, 154, 198:

```typescript
// CHANGE THIS (line 152):
if (amount < BOND_CONFIG.minimumAmount) {
  throw new Error(`Bond amount must be at least ${BOND_CONFIG.minimumAmount} Gratium`);
}
if (amount > BOND_CONFIG.maximumAmount) {
  throw new Error(`Bond amount cannot exceed ${BOND_CONFIG.maximumAmount} Gratium`);
}

// Already correct! Just type names will match after Fix #2

// CHANGE THIS (line 198):
const bond = await this.getBond(bondId);
if (!bond) {
  throw new Error('Bond not found');
}

if (bond.status !== 'active') {
  throw new Error(`Cannot challenge inactive bond (status: ${bond.status})`);
}

// Add null check:
if (!bond) {
  throw new Error('Bond not found');
}

// Now safe to use bond.status, etc.
```

---

## Fix #7: Fix getActiveChallenges Parameter Type

**File**: `src/services/veracity-bond.service.ts`

Around line 206, update the arrow function:

```typescript
// CHANGE THIS:
const challenges = await query<BondChallenge>(
  'SELECT * FROM bond_challenges WHERE bond_id = $1 AND status = $2',
  [bondId, 'pending']
);

const challengerIds = challenges.rows.map(c => c.challenger_id);

// TO THIS (add type):
const challenges = await query<BondChallenge>(
  'SELECT * FROM bond_challenges WHERE bond_id = $1 AND status = $2',
  [bondId, 'pending']
);

const challengerIds = challenges.rows.map((c: BondChallenge) => c.challenger_id);
```

---

## Summary of Changes

| File | Issue | Line(s) | Fix |
|------|-------|---------|-----|
| `src/types/index.ts` | camelCase vs snake_case | All | Change to snake_case |
| `proof-of-humanity.service.ts` | null checks | 53, 67 | Add null checks |
| `proof-of-humanity.service.ts` | private keywords | 269, 278, 294 | Remove `private` |
| `veracity-bond.service.ts` | type annotation | 206 | Add type: `(c: BondChallenge)` |
| `database/index.ts` | dependencies | - | Run `npm install` |
| `index.ts` | dependencies | - | Run `npm install` |

---

## Testing After Fixes

```bash
# From packages/09-verification/
npm install                    # Install dependencies
npm run build                  # Should have 0 errors
npm test                       # Run tests
npm run test:coverage          # Check coverage
```

---

## Expected Results After Fixes

✅ Build: 0 errors
✅ Tests: All passing
✅ Type safety: 100%
✅ Ready for Session 2

---

**Time to fix**: ~20-30 minutes
**Difficulty**: Easy (mostly naming consistency)
**Risk**: None (pure type corrections)
