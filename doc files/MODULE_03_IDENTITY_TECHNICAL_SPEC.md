# 🆔 Module 3: Identity System - Technical Specification
## Dual-Sovereignty Identity Architecture for Dream Protocol

**Module Number**: 3 of 22  
**Build Priority**: PRIORITY 1 - Foundation (Week 3)  
**Dependencies**: Module 2 (User)  
**Dependents**: ALL other modules  
**Status**: 📋 Design Complete - Ready to Build

---

## 🎯 Module Overview

### **Purpose**
Module 3 implements the revolutionary **dual-identity sovereignty system** that allows users to operate as two distinct personas:
- **True Self** (ðŸœ‚) - Public, accountable identity
- **Shadow** (â˜¯) - Private, anonymous identity

This is THE core innovation of Dream Protocol - enabling users to speak truth without fear while maintaining accountability.

### **Core Philosophy**
> "Where privacy and accountability aren't opposites—they're modes. Where your voice creates value in two economies simultaneously. And where your words are carved in digital stone, but you choose which name is on the monument."

---

## 🏗️ What This Module Does

### **Primary Functions**
1. **Dual Wallet Creation** - Generates two separate Cardano wallets per user
2. **Identity Mode Switching** - Seamless toggle between True Self and Shadow
3. **DID Generation** - Creates W3C-compliant Decentralized Identifiers
4. **DualityToken Management** - PRIVATE linkage between identities (never exposed)
5. **Identity Session Tracking** - Records which mode user is currently in
6. **UTXO Hygiene** - Ensures Shadow transactions cannot be linked to True Self

### **Key Features**
- ✅ One user → Two wallets → Two identities → Two reputation systems
- ✅ Shadow votes/posts/stakes are completely separate from True Self
- ✅ DualityToken proves they're the same person WITHOUT revealing the link
- ✅ Mode switching happens instantly (client-side)
- ✅ All actions recorded with correct identity attribution

---

## 📊 Database Schema

### **Table 1: `dual_wallets`**
Stores the two wallets for each user:

```sql
CREATE TABLE dual_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- True Self Wallet
    true_self_address VARCHAR(255) NOT NULL UNIQUE,
    true_self_public_key TEXT NOT NULL,
    true_self_encrypted_private_key TEXT NOT NULL, -- Encrypted with user password
    
    -- Shadow Wallet  
    shadow_address VARCHAR(255) NOT NULL UNIQUE,
    shadow_public_key TEXT NOT NULL,
    shadow_encrypted_private_key TEXT NOT NULL, -- Encrypted with user password
    
    -- DualityToken (PRIVATE - never exposed to client)
    duality_token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash
    duality_token_encrypted TEXT NOT NULL, -- Encrypted linkage proof
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security
    last_rotation_at TIMESTAMPTZ, -- When keys were last rotated
    rotation_count INTEGER DEFAULT 0
);

CREATE INDEX idx_dual_wallets_user ON dual_wallets(user_id);
CREATE INDEX idx_dual_wallets_true_self ON dual_wallets(true_self_address);
CREATE INDEX idx_dual_wallets_shadow ON dual_wallets(shadow_address);
```

### **Table 2: `decentralized_identifiers`**
W3C-compliant DIDs for both identities:

```sql
CREATE TABLE decentralized_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES dual_wallets(id) ON DELETE CASCADE,
    
    -- DID Information
    did_string VARCHAR(255) NOT NULL UNIQUE, -- Format: did:agoranet:{address}_{mode}
    did_document JSONB NOT NULL, -- W3C DID Document
    identity_mode VARCHAR(10) CHECK (identity_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50), -- 'email', 'phone', 'biometric', 'combined'
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, identity_mode)
);

CREATE INDEX idx_dids_user ON decentralized_identifiers(user_id);
CREATE INDEX idx_dids_did_string ON decentralized_identifiers(did_string);
CREATE INDEX idx_dids_mode ON decentralized_identifiers(identity_mode);
```

### **Table 3: `identity_sessions`**
Tracks which identity mode user is currently using:

```sql
CREATE TABLE identity_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Current Mode
    current_mode VARCHAR(10) CHECK (current_mode IN ('true_self', 'shadow')) NOT NULL,
    current_did VARCHAR(255) REFERENCES decentralized_identifiers(did_string),
    
    -- Session Info
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Security
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_identity_sessions_user ON identity_sessions(user_id);
CREATE INDEX idx_identity_sessions_token ON identity_sessions(session_token);
CREATE INDEX idx_identity_sessions_active ON identity_sessions(is_active, user_id);
```

### **Table 4: `identity_mode_history`**
Audit trail of mode switches (for security/analytics):

```sql
CREATE TABLE identity_mode_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Mode Change
    from_mode VARCHAR(10) CHECK (from_mode IN ('true_self', 'shadow')),
    to_mode VARCHAR(10) CHECK (to_mode IN ('true_self', 'shadow')) NOT NULL,
    
    -- Context
    switched_at TIMESTAMPTZ DEFAULT NOW(),
    reason VARCHAR(50), -- 'user_action', 'session_start', 'api_call', etc.
    
    -- Security Flags
    suspicious BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT
);

CREATE INDEX idx_identity_history_user ON identity_mode_history(user_id);
CREATE INDEX idx_identity_history_time ON identity_mode_history(switched_at);
```

---

## 🔧 Core Functions

### **Function 1: Create Dual Wallets**

```typescript
// packages/03-identity/src/services/wallet.service.ts

import { generateMnemonic, mnemonicToEntropy } from 'bip39';
import { Lucid, Blockfrost } from 'lucid-cardano';
import crypto from 'crypto';

interface DualWallets {
  trueSelentity: {
    address: string;
    publicKey: string;
    encryptedPrivateKey: string;
  };
  shadow: {
    address: string;
    publicKey: string;
    encryptedPrivateKey: string;
  };
  dualityTokenHash: string;
  dualityTokenEncrypted: string;
}

export async function createDualWallets(
  userId: string,
  userPassword: string
): Promise<DualWallets> {
  
  // Initialize Lucid (Cardano)
  const lucid = await Lucid.new(
    new Blockfrost(
      process.env.CARDANO_NETWORK_URL!,
      process.env.BLOCKFROST_API_KEY!
    ),
    process.env.CARDANO_NETWORK! // 'Preprod' or 'Mainnet'
  );
  
  // Generate True Self Wallet
  const trueSelfMnemonic = generateMnemonic(256); // 24 words
  lucid.selectWalletFromSeed(trueSelfMnemonic);
  const trueSelfAddress = await lucid.wallet.address();
  const trueSelfPublicKey = await lucid.wallet.rewardAddress();
  
  // Generate Shadow Wallet (completely separate)
  const shadowMnemonic = generateMnemonic(256);
  lucid.selectWalletFromSeed(shadowMnemonic);
  const shadowAddress = await lucid.wallet.address();
  const shadowPublicKey = await lucid.wallet.rewardAddress();
  
  // Generate DualityToken (PRIVATE linkage proof)
  const dualityToken = crypto.randomBytes(32).toString('hex');
  const dualityTokenHash = crypto
    .createHash('sha256')
    .update(dualityToken)
    .digest('hex');
  
  // Encrypt private keys with user password
  const trueSelfEncrypted = encryptPrivateKey(trueSelfMnemonic, userPassword);
  const shadowEncrypted = encryptPrivateKey(shadowMnemonic, userPassword);
  const dualityTokenEncrypted = encryptPrivateKey(dualityToken, userPassword);
  
  // Store in database
  await db.dual_wallets.create({
    user_id: userId,
    true_self_address: trueSelfAddress,
    true_self_public_key: trueSelfPublicKey,
    true_self_encrypted_private_key: trueSelfEncrypted,
    shadow_address: shadowAddress,
    shadow_public_key: shadowPublicKey,
    shadow_encrypted_private_key: shadowEncrypted,
    duality_token_hash: dualityTokenHash,
    duality_token_encrypted: dualityTokenEncrypted
  });
  
  return {
    trueSelf: {
      address: trueSelfAddress,
      publicKey: trueSelfPublicKey,
      encryptedPrivateKey: trueSelfEncrypted
    },
    shadow: {
      address: shadowAddress,
      publicKey: shadowPublicKey,
      encryptedPrivateKey: shadowEncrypted
    },
    dualityTokenHash,
    dualityTokenEncrypted
  };
}

function encryptPrivateKey(key: string, password: string): string {
  const algorithm = 'aes-256-gcm';
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
  
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Return: salt:iv:authTag:encryptedData
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### **Function 2: Generate DIDs**

```typescript
// packages/03-identity/src/services/did.service.ts

interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
}

export async function generateDIDs(
  userId: string,
  wallets: DualWallets
): Promise<{ trueSelfDID: string; shadowDID: string }> {
  
  // True Self DID
  const trueSelfDID = `did:agoranet:${wallets.trueSelf.address}_true_self`;
  const trueSelfDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: trueSelfDID,
    verificationMethod: [{
      id: `${trueSelfDID}#keys-1`,
      type: 'Ed25519VerificationKey2020',
      controller: trueSelfDID,
      publicKeyMultibase: wallets.trueSelf.publicKey
    }],
    authentication: [`${trueSelfDID}#keys-1`],
    assertionMethod: [`${trueSelfDID}#keys-1`]
  };
  
  // Shadow DID
  const shadowDID = `did:agoranet:${wallets.shadow.address}_shadow`;
  const shadowDocument: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: shadowDID,
    verificationMethod: [{
      id: `${shadowDID}#keys-1`,
      type: 'Ed25519VerificationKey2020',
      controller: shadowDID,
      publicKeyMultibase: wallets.shadow.publicKey
    }],
    authentication: [`${shadowDID}#keys-1`],
    assertionMethod: [`${shadowDID}#keys-1`]
  };
  
  // Store in database
  const walletRecord = await db.dual_wallets.findOne({ user_id: userId });
  
  await db.decentralized_identifiers.create({
    user_id: userId,
    wallet_id: walletRecord.id,
    did_string: trueSelfDID,
    did_document: trueSelfDocument,
    identity_mode: 'true_self'
  });
  
  await db.decentralized_identifiers.create({
    user_id: userId,
    wallet_id: walletRecord.id,
    did_string: shadowDID,
    did_document: shadowDocument,
    identity_mode: 'shadow'
  });
  
  return { trueSelfDID, shadowDID };
}
```

### **Function 3: Switch Identity Mode**

```typescript
// packages/03-identity/src/services/session.service.ts

export async function switchIdentityMode(
  userId: string,
  newMode: 'true_self' | 'shadow',
  sessionToken: string
): Promise<{ success: boolean; currentDID: string }> {
  
  // Get user's DIDs
  const dids = await db.decentralized_identifiers.find({
    user_id: userId
  });
  
  const currentSession = await db.identity_sessions.findOne({
    user_id: userId,
    session_token: sessionToken,
    is_active: true
  });
  
  if (!currentSession) {
    throw new Error('No active session found');
  }
  
  const oldMode = currentSession.current_mode;
  
  // Find the DID for the new mode
  const newDID = dids.find(did => did.identity_mode === newMode);
  
  if (!newDID) {
    throw new Error(`DID not found for mode: ${newMode}`);
  }
  
  // Update session
  await db.identity_sessions.update(
    { id: currentSession.id },
    {
      current_mode: newMode,
      current_did: newDID.did_string,
      last_active_at: new Date()
    }
  );
  
  // Record mode switch in history
  await db.identity_mode_history.create({
    user_id: userId,
    from_mode: oldMode,
    to_mode: newMode,
    switched_at: new Date(),
    reason: 'user_action'
  });
  
  return {
    success: true,
    currentDID: newDID.did_string
  };
}
```

---

## 🔐 Security Considerations

### **1. DualityToken Protection**
- ⚠️ **NEVER** send DualityToken to client
- ⚠️ **NEVER** expose linkage between True Self and Shadow
- ✅ Only server knows they're the same person
- ✅ Encrypted at rest in database
- ✅ Only used for platform-internal verification

### **2. UTXO Hygiene (Cardano)**
- Shadow transactions must use separate UTXO pools
- No UTXO sharing between True Self and Shadow
- Randomized transaction fees to prevent fingerprinting
- Delayed batching to prevent timing analysis

### **3. Private Key Management**
- All private keys encrypted with user password
- Never stored in plaintext
- Rotation support (every 90 days recommended)
- Hardware wallet support (future)

### **4. Session Security**
- Session tokens expire after 24 hours
- Mode switches logged for audit
- Suspicious activity flagged (e.g., rapid mode switching)
- IP tracking for anomaly detection

---

## 🎨 Frontend Integration

### **Identity Toggle Component**

```typescript
// Example usage in React
import { useIdentity } from '@dream-protocol/identity';

function IdentityToggle() {
  const { currentMode, switchMode, loading } = useIdentity();
  
  return (
    <div className="identity-toggle">
      <button
        onClick={() => switchMode('true_self')}
        className={currentMode === 'true_self' ? 'active' : ''}
        disabled={loading}
      >
        ðŸœ‚ True Self
      </button>
      
      <button
        onClick={() => switchMode('shadow')}
        className={currentMode === 'shadow' ? 'active' : ''}
        disabled={loading}
      >
        â˜¯ Shadow
      </button>
    </div>
  );
}
```

### **Mode-Aware Content Creation**

```typescript
// When creating a post
async function createPost(content: string) {
  const { currentMode, currentDID } = useIdentity();
  
  await api.post('/content/posts', {
    content,
    identity_mode: currentMode,
    did: currentDID
  });
}
```

---

## 📋 API Endpoints

### **POST `/api/v1/identity/wallets/create`**
Create dual wallets for a user

**Request**:
```json
{
  "user_id": "uuid",
  "password": "user_password"
}
```

**Response**:
```json
{
  "success": true,
  "true_self_address": "addr1...",
  "shadow_address": "addr1...",
  "true_self_did": "did:agoranet:..._true_self",
  "shadow_did": "did:agoranet:..._shadow"
}
```

### **POST `/api/v1/identity/mode/switch`**
Switch between True Self and Shadow

**Request**:
```json
{
  "mode": "shadow",
  "session_token": "..."
}
```

**Response**:
```json
{
  "success": true,
  "current_mode": "shadow",
  "current_did": "did:agoranet:..._shadow"
}
```

### **GET `/api/v1/identity/session/current`**
Get current identity mode

**Response**:
```json
{
  "user_id": "uuid",
  "current_mode": "true_self",
  "current_did": "did:agoranet:..._true_self",
  "session_active": true
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
- Wallet generation produces valid Cardano addresses
- DID generation follows W3C standard
- Encryption/decryption works correctly
- DualityToken hashing is deterministic

### **Integration Tests**
- Mode switching updates session correctly
- DIDs are correctly associated with wallets
- History tracking records all switches
- Security flags trigger on suspicious activity

### **Security Tests**
- DualityToken never exposed to client
- Private keys never sent unencrypted
- Shadow transactions can't be linked to True Self
- Session tokens expire properly

---

## 📊 Success Metrics

### **Functionality**
- ✅ 100% of users can create dual wallets
- ✅ Mode switching works in <200ms
- ✅ Zero private key exposures
- ✅ DIDs validate against W3C spec

### **Security**
- ✅ Zero linkage leaks (Shadow → True Self)
- ✅ All private keys encrypted at rest
- ✅ Session hijacking attempts detected
- ✅ Suspicious activity flagged accurately

### **Performance**
- ✅ Wallet creation: <3 seconds
- ✅ Mode switch: <200ms
- ✅ DID lookup: <50ms
- ✅ Session validation: <20ms

---

## 🚀 Build Timeline

**Week 3** (after Module 2 - User is complete)

### **Day 1-2: Database & Core Logic**
- Create 4 tables (dual_wallets, DIDs, sessions, history)
- Implement wallet generation
- Implement DID creation

### **Day 3-4: Security & Encryption**
- Implement encryption functions
- Add DualityToken management
- Add UTXO hygiene logic

### **Day 5: API & Testing**
- Build 3 API endpoints
- Write unit tests
- Write integration tests

**Deliverable**: Users can have dual identities and switch between them!

---

## 🔗 Integration with Other Modules

### **Module 2 (User)** - Depends On
- Creates wallets immediately after user registration
- User table has foreign key to dual_wallets

### **Module 4 (Economy)** - Provides To
- Separate Gratium/PollCoin balances for each identity
- Token transfers use correct wallet address

### **Module 6 (Governance)** - Provides To
- Votes recorded with correct DID
- Shadow votes completely separate from True Self votes

### **Module 7 (Content)** - Provides To
- Posts/comments attributed to current identity
- Content creator is the active DID

### **Module 9 (Verification)** - Integrates With
- Proof of Humanity applies to True Self only
- Shadow inherits verification status (but hidden)

---

## ⚠️ Critical Reminders

1. **NEVER** expose DualityToken to clients
2. **ALWAYS** use current_mode from session for attribution
3. **NEVER** allow queries that could link Shadow to True Self
4. **ALWAYS** encrypt private keys at rest
5. **NEVER** share UTXO pools between identities
6. **ALWAYS** log mode switches for security audit

---

## 📚 Additional Documentation

- **UTXO Hygiene Guide**: `docs/UTXO_PRIVACY.md`
- **DID Specification**: `docs/DID_SPEC.md`
- **Encryption Standards**: `docs/ENCRYPTION.md`
- **Security Audit Checklist**: `docs/SECURITY_AUDIT.md`

---

**Module 3 Status**: ✅ Design Complete - Ready for Week 3 Implementation

**Next Module**: Module 7 (Content) - Week 4-5
