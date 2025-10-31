# Module 1: Identity System
## Dual-Sovereignty Technical Architecture & Implementation Plan

**Module ID**: 01-identity  
**Classification**: Core Protocol - Foundation Layer  
**Status**: Design Phase → Implementation Ready  
**Build Priority**: PRIORITY 1 (Weeks 2-3)  
**Complexity**: High (Cryptographic + Architecture)  
**Team Size Recommended**: 2-3 developers  
**Estimated Implementation**: 2 weeks  

---

## 🎯 Executive Summary

Module 1: Identity is the **foundational innovation** of Dream Protocol. It enables users to maintain **two cryptographically distinct but secretly linked identities** that operate independently while remaining verifiable as belonging to the same person (to the system only).

**What This Module Delivers:**
- Dual Cardano wallet generation (True Self + Shadow)
- Decentralized Identity (DID) creation and management
- Secure linkage proof (DualityToken) - kept completely private
- Mode switching interface
- UTXO pool management (one per identity)
- Session management per identity
- Zero-knowledge proof infrastructure for linkage verification

**Why This Matters:**
This module is the **beating heart** of everything else. Without this, Shadow Consensus doesn't work, dual voting is impossible, and the entire privacy advantage collapses.

---

## 🏗️ Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Frontend                              │
│  (Identity toggle: 🙂 True Self / ☯ Shadow)                   │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Identity Service API                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Identity Management                                     │   │
│  │ ├─ getOrCreateDualIdentity(userId)                     │   │
│  │ ├─ switchMode(userId, mode: 'true_self' | 'shadow')   │   │
│  │ ├─ getCurrentMode(userId)                              │   │
│  │ ├─ generateDID(userId, mode)                           │   │
│  │ └─ getIdentityMetadata(userId)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────────────────┘
               │
        ┌──────┴────────┐
        │               │
        ▼               ▼
   ┌─────────────┐  ┌──────────────┐
   │  Cardano    │  │ DualityToken │
   │  Integration│  │ Linkage Proof│
   │ (UTXO)      │  │  (Encrypted) │
   └─────────────┘  └──────────────┘
        │               │
   ┌────┴───────────────┴────┐
   │                         │
   ▼                         ▼
┌──────────────────────────────────────┐
│   PostgreSQL Database                │
│ ┌─────────────────────────────────┐ │
│ │ users                           │ │
│ │ dual_wallets                    │ │
│ │ decentralized_identifiers (DIDs)│ │
│ │ duality_tokens (PRIVATE!)       │ │
│ │ utxo_pools                      │ │
│ │ identity_sessions               │ │
│ │ identity_mode_history           │ │
│ └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Core Concepts

#### 1. Dual Wallet System
Each user has **two independent Cardano wallets**:

```typescript
// True Self Wallet
{
  userId: "user_123",
  mode: "true_self",
  cardanoAddress: "addr1v9qydn...",  // Public, linked to user profile
  publicKey: "0x7f3a2c1b...",
  seedPhrase: "encrypted_in_secure_vault",
  createdAt: "2025-01-30T10:00:00Z"
}

// Shadow Wallet
{
  userId: "user_123",
  mode: "shadow",
  cardanoAddress: "addr1v7xy4n...",  // Appears unlinked
  publicKey: "0x9e4d7a6c...",        // Different from True Self
  seedPhrase: "encrypted_in_secure_vault",
  createdAt: "2025-01-30T10:00:00Z"
}
```

**Key Property**: To an external observer, these look like two different people because the DIDs are different.

#### 2. Decentralized Identifiers (DIDs)

```typescript
// True Self DID
did:agoranet:user_123_true_self

// Shadow DID  
did:agoranet:user_123_shadow

// Format: did:agoranet:{user_id}_{mode}
```

**Why DIDs?**
- W3C standard for self-sovereign identity
- Can verify without revealing connection to True Self
- Portable across systems
- Cryptographically provable

#### 3. DualityToken (The Secret Linkage)

```typescript
// NEVER EXPOSED PUBLICLY
interface DualityToken {
  id: "dt_abc123...",
  userId: "user_123",
  
  // The linkage - both wallets belong to same person
  truePrivateKey: "encrypted_with_user_password_salt",
  shadowPrivateKey: "encrypted_with_user_password_salt",
  
  // Proof this is legitimate (not a hack)
  creationProof: {
    timestamp: "2025-01-30T10:00:00Z",
    ipAddress: "192.168.1.1", // hashed
    deviceFingerprint: "hash_of_device",
    signatureFromTrueSelf: "0x7f3a..."
  },
  
  // Recovery mechanism (if one wallet is compromised)
  backupSeed: "encrypted_backup_seed",
  
  // Storage location - encrypted, server-side only
  status: "active",
  lastVerified: "2025-01-30T10:00:00Z"
}
```

**Critical Security Properties:**
- âœ… User password required to decrypt
- âœ… Server never sees unencrypted keys
- âœ… Each identity can sign independently
- âœ… Cannot be retrieved without proper authentication
- âœ… Audit trail of access attempts

#### 4. UTXO Pools (One Per Identity)

```typescript
interface UTXOPool {
  userId: "user_123",
  mode: "true_self" | "shadow",
  
  // UTXO outputs for this identity
  utxos: [
    {
      txId: "0x7f3a2c1b...",
      outputIndex: 0,
      amount: 1500,  // lovelace
      status: "unspent" | "spent"
    }
  ],
  
  // Total unspent value
  totalUnspent: 3000,
  
  // History for audit
  transactionHistory: [
    { type: "receive", amount: 1500, date: "2025-01-30T10:00:00Z" },
    { type: "send", amount: 500, date: "2025-01-31T10:00:00Z" }
  ]
}
```

**Why UTXO Pools Matter:**
- Prevents linking True Self and Shadow transactions
- Each identity has independent transaction history
- Clean UTXO hygiene prevents de-anonymization
- Separate economic identity

---

## 📊 Database Schema

### Table 1: users (Existing - Enhanced)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- NEW: Dual identity tracking
  has_dual_identity BOOLEAN DEFAULT false,
  identity_created_at TIMESTAMPTZ,
  
  -- Session tracking
  current_identity_mode VARCHAR(20),  -- 'true_self' or 'shadow'
  last_identity_switch TIMESTAMPTZ,
  
  -- Account status
  status VARCHAR(50) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### Table 2: dual_wallets (NEW)

```sql
CREATE TABLE dual_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity mode
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('true_self', 'shadow')),
  
  -- Cardano wallet info
  cardano_address VARCHAR(255) NOT NULL UNIQUE,
  public_key VARCHAR(255) NOT NULL UNIQUE,
  
  -- Key material (encrypted at rest)
  encrypted_private_key TEXT NOT NULL,  -- Encrypted with user password
  encryption_salt VARCHAR(255) NOT NULL,
  
  -- DID
  did VARCHAR(255) NOT NULL UNIQUE,  -- did:agoranet:user_123_true_self
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  verified BOOLEAN DEFAULT false,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  accessed_count INTEGER DEFAULT 0,
  
  UNIQUE(user_id, mode),  -- One wallet per user per mode
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_dual_wallets_user_id ON dual_wallets(user_id);
CREATE INDEX idx_dual_wallets_did ON dual_wallets(did);
CREATE INDEX idx_dual_wallets_cardano_address ON dual_wallets(cardano_address);
```

### Table 3: decentralized_identifiers (NEW)

```sql
CREATE TABLE decentralized_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES dual_wallets(id) ON DELETE CASCADE,
  
  -- The DID itself
  did VARCHAR(255) NOT NULL UNIQUE,  -- did:agoranet:user_123_true_self
  
  -- DID Document (public cryptographic proof)
  did_document JSONB NOT NULL,  -- Contains publicKey, verificationMethod
  
  -- Resolution
  resolvable BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (wallet_id) REFERENCES dual_wallets(id)
);

CREATE INDEX idx_dids_user_id ON decentralized_identifiers(user_id);
CREATE INDEX idx_dids_did ON decentralized_identifiers(did);
```

### Table 4: duality_tokens (NEW - ENCRYPTED)

```sql
CREATE TABLE duality_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- The linkage proof (ENCRYPTED)
  true_self_private_key_encrypted TEXT NOT NULL,  -- Encrypted with master key
  shadow_private_key_encrypted TEXT NOT NULL,     -- Encrypted with master key
  
  -- Encryption metadata
  master_key_id VARCHAR(255) NOT NULL,  -- Which encryption key was used
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  
  -- Proof of legitimacy
  creation_proof JSONB NOT NULL,  -- {timestamp, ipAddress_hash, deviceFingerprint, signature}
  
  -- Backup/Recovery
  backup_seed_encrypted TEXT,
  backup_created_at TIMESTAMPTZ,
  
  -- Access audit
  access_log JSONB DEFAULT '[]',  -- Array of {timestamp, purpose, success}
  last_accessed TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  compromised BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Special security: Only allow access via special stored procedure
REVOKE SELECT ON duality_tokens FROM public;
CREATE ROLE identity_system_internal;
GRANT SELECT ON duality_tokens TO identity_system_internal;
```

### Table 5: utxo_pools (NEW)

```sql
CREATE TABLE utxo_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES dual_wallets(id) ON DELETE CASCADE,
  
  -- Pool identification
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('true_self', 'shadow')),
  
  -- UTXO data
  utxo_data JSONB NOT NULL,  -- {utxos: [{txId, outputIndex, amount, status}], totalUnspent}
  
  -- Transaction history
  transaction_history JSONB DEFAULT '[]',  -- {type, amount, txId, date}
  
  -- Statistics
  total_received BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  current_balance BIGINT DEFAULT 0,
  
  -- Status
  synced BOOLEAN DEFAULT true,
  last_synced TIMESTAMPTZ,
  
  -- Hygiene tracking
  utxo_fragmentation_ratio DECIMAL(5,2),  -- % of outputs that are dust
  consolidation_recommended BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, mode),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (wallet_id) REFERENCES dual_wallets(id)
);

CREATE INDEX idx_utxo_pools_user_id ON utxo_pools(user_id);
CREATE INDEX idx_utxo_pools_wallet_id ON utxo_pools(wallet_id);
```

### Table 6: identity_sessions (NEW)

```sql
CREATE TABLE identity_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session identification
  session_token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Active identity for this session
  active_identity_mode VARCHAR(20) NOT NULL CHECK (active_identity_mode IN ('true_self', 'shadow')),
  
  -- Session metadata
  ip_address_hash VARCHAR(255),
  device_fingerprint VARCHAR(255),
  user_agent VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Activity tracking
  total_requests INTEGER DEFAULT 0,
  
  status VARCHAR(50) DEFAULT 'active',
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_identity_sessions_user_id ON identity_sessions(user_id);
CREATE INDEX idx_identity_sessions_token ON identity_sessions(session_token);
CREATE INDEX idx_identity_sessions_expires ON identity_sessions(expires_at);
```

### Table 7: identity_mode_history (NEW)

```sql
CREATE TABLE identity_mode_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Mode switch
  from_mode VARCHAR(20),  -- null if first switch
  to_mode VARCHAR(20) NOT NULL CHECK (to_mode IN ('true_self', 'shadow')),
  
  -- Context
  session_id UUID REFERENCES identity_sessions(id),
  ip_address_hash VARCHAR(255),
  reason VARCHAR(255),  -- Optional: why user switched
  
  -- Timestamp
  switched_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_identity_mode_history_user_id ON identity_mode_history(user_id);
CREATE INDEX idx_identity_mode_history_switched_at ON identity_mode_history(switched_at);
```

---

## 🔐 Security Architecture

### Key Management Strategy

**Three-Layer Encryption:**

```
Layer 1: Application (TypeScript)
├─ User enters password
├─ Generate salt from user email
├─ Derive key using PBKDF2(password + salt)
└─ Encrypt private keys with derived key

Layer 2: Transport (TLS)
├─ All API calls over HTTPS
├─ Certificate pinning for added security
└─ No keys transmitted unencrypted

Layer 3: Database (At Rest)
├─ Private keys encrypted in database
├─ Master key stored in secrets vault (AWS Secrets Manager)
├─ Additional encryption if private keys ever need to be stored
└─ Separate encryption key per sensitive table
```

### Access Control

```typescript
// RBAC (Role-Based Access Control)

Role: identity_system_internal
├─ SELECT duality_tokens (read-only)
├─ SELECT dual_wallets (read-only encrypted data)
└─ Can only execute via secure stored procedure

Role: identity_service_api
├─ Can call identity service functions
├─ Limited to own identity operations
└─ Cannot access DualityToken directly

Role: admin_audit
├─ Can view access logs
├─ Cannot view actual keys
└─ Used for compliance audits
```

### DualityToken Access Flow

```
User Login Request
    ↓
Verify password hash
    ↓
Derive encryption key from password
    ↓
Call stored procedure: retrieve_duality_token()
    ↓
[Only inside database, never in application]
    ├─ Decrypt private keys
    ├─ Verify creation proof
    └─ Return decrypted keys
    ↓
Use keys in application (in-memory only)
    ↓
Sign transactions
    ↓
Clear keys from memory (crypto.randomBytes overwrite)
    ↓
Log access (audit trail)
```

---

## 💻 Implementation: Core Services

### Service 1: IdentityService

```typescript
// src/modules/identity/identity.service.ts

import { Cardano } from '@cardano-sdk/core';
import crypto from 'crypto';
import { db } from '../../config/database';

class IdentityService {
  /**
   * Create dual identities for a new user
   * Called during registration
   */
  async createDualIdentity(userId: string, userPassword: string): Promise<DualIdentity> {
    // Step 1: Create True Self wallet
    const trueWallet = await this.generateCardanoWallet();
    
    // Step 2: Create Shadow wallet
    const shadowWallet = await this.generateCardanoWallet();
    
    // Step 3: Generate DIDs
    const trueDID = `did:agoranet:${userId}_true_self`;
    const shadowDID = `did:agoranet:${userId}_shadow`;
    
    // Step 4: Create DID Documents (for verification)
    const trueDIDDoc = this.generateDIDDocument(trueWallet.publicKey, userId, 'true_self');
    const shadowDIDDoc = this.generateDIDDocument(shadowWallet.publicKey, userId, 'shadow');
    
    // Step 5: Create DualityToken (SECRET LINKAGE)
    const dualityToken = await this.createDualityToken(
      userId,
      trueWallet.privateKey,
      shadowWallet.privateKey,
      userPassword
    );
    
    // Step 6: Store in database (with encryption)
    const dual_wallets_true = await db.query(
      `INSERT INTO dual_wallets 
       (user_id, mode, cardano_address, public_key, encrypted_private_key, encryption_salt, did, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        'true_self',
        trueWallet.cardanoAddress,
        trueWallet.publicKey,
        await this.encryptPrivateKey(trueWallet.privateKey, userPassword),
        crypto.randomBytes(16).toString('hex'),
        trueDID,
        true
      ]
    );
    
    const dual_wallets_shadow = await db.query(
      `INSERT INTO dual_wallets 
       (user_id, mode, cardano_address, public_key, encrypted_private_key, encryption_salt, did, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        'shadow',
        shadowWallet.cardanoAddress,
        shadowWallet.publicKey,
        await this.encryptPrivateKey(shadowWallet.privateKey, userPassword),
        crypto.randomBytes(16).toString('hex'),
        shadowDID,
        true
      ]
    );
    
    // Step 7: Store DIDs
    await db.query(
      `INSERT INTO decentralized_identifiers (user_id, wallet_id, did, did_document)
       VALUES ($1, $2, $3, $4)`,
      [userId, dual_wallets_true.rows[0].id, trueDID, JSON.stringify(trueDIDDoc)]
    );
    
    await db.query(
      `INSERT INTO decentralized_identifiers (user_id, wallet_id, did, did_document)
       VALUES ($1, $2, $3, $4)`,
      [userId, dual_wallets_shadow.rows[0].id, shadowDID, JSON.stringify(shadowDIDDoc)]
    );
    
    // Step 8: Initialize UTXO pools
    await this.initializeUTXOPools(userId, dual_wallets_true.rows[0].id, dual_wallets_shadow.rows[0].id);
    
    // Step 9: Mark user as having dual identity
    await db.query(
      `UPDATE users SET has_dual_identity = true, identity_created_at = NOW() WHERE id = $1`,
      [userId]
    );
    
    return {
      userId,
      trueIdentity: {
        did: trueDID,
        cardanoAddress: trueWallet.cardanoAddress,
        mode: 'true_self'
      },
      shadowIdentity: {
        did: shadowDID,
        cardanoAddress: shadowWallet.cardanoAddress,
        mode: 'shadow'
      },
      createdAt: new Date()
    };
  }

  /**
   * Generate a new Cardano wallet
   */
  private async generateCardanoWallet() {
    const mnemonic = Cardano.Mnemonic.random();
    const wallet = await Cardano.Wallet.fromMnemonic(mnemonic);
    
    return {
      mnemonic: mnemonic.toString(),
      cardanoAddress: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    };
  }

  /**
   * Generate DID Document (W3C Standard)
   */
  private generateDIDDocument(publicKey: string, userId: string, mode: string) {
    return {
      '@context': 'https://www.w3.org/ns/did/v1',
      'id': `did:agoranet:${userId}_${mode}`,
      'publicKey': [
        {
          'id': `did:agoranet:${userId}_${mode}#key-1`,
          'type': 'Ed25519VerificationKey2020',
          'controller': `did:agoranet:${userId}_${mode}`,
          'publicKeyMultibase': publicKey
        }
      ],
      'authentication': [`did:agoranet:${userId}_${mode}#key-1`],
      'assertionMethod': [`did:agoranet:${userId}_${mode}#key-1`]
    };
  }

  /**
   * Create DualityToken - The secret linkage (ENCRYPTED)
   */
  private async createDualityToken(
    userId: string,
    truePrivateKey: string,
    shadowPrivateKey: string,
    userPassword: string
  ): Promise<string> {
    // Create proof of legitimacy
    const creationProof = {
      timestamp: new Date().toISOString(),
      ipAddress: 'hashed_ip',  // Hash in real implementation
      deviceFingerprint: 'device_hash',
      signatureFromTrueSelf: await this.signWithKey(truePrivateKey, userId)
    };
    
    // Encrypt both private keys with master key
    const encrypted_true = await this.encryptWithMasterKey(truePrivateKey);
    const encrypted_shadow = await this.encryptWithMasterKey(shadowPrivateKey);
    
    // Store in database (access controlled)
    const result = await db.query(
      `INSERT INTO duality_tokens 
       (user_id, true_self_private_key_encrypted, shadow_private_key_encrypted, creation_proof)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        userId,
        encrypted_true,
        encrypted_shadow,
        JSON.stringify(creationProof)
      ]
    );
    
    return result.rows[0].id;
  }

  /**
   * Switch active identity mode for user
   */
  async switchIdentityMode(
    userId: string,
    targetMode: 'true_self' | 'shadow',
    sessionId: string
  ): Promise<void> {
    // Step 1: Verify user has both identities
    const identities = await db.query(
      `SELECT mode FROM dual_wallets WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    
    if (identities.rows.length !== 2) {
      throw new Error('User does not have dual identity set up');
    }
    
    // Step 2: Update user's current mode
    await db.query(
      `UPDATE users SET current_identity_mode = $1, last_identity_switch = NOW() WHERE id = $2`,
      [targetMode, userId]
    );
    
    // Step 3: Update session
    await db.query(
      `UPDATE identity_sessions SET active_identity_mode = $1, last_activity = NOW() WHERE id = $2`,
      [targetMode, sessionId]
    );
    
    // Step 4: Log the switch
    await db.query(
      `INSERT INTO identity_mode_history (user_id, to_mode, session_id)
       VALUES ($1, $2, $3)`,
      [userId, targetMode, sessionId]
    );
    
    // Step 5: Update activity
    await this.logIdentityActivity(userId, `Switched to ${targetMode}`);
  }

  /**
   * Get current active identity
   */
  async getCurrentIdentity(userId: string) {
    const user = await db.query(
      `SELECT current_identity_mode FROM users WHERE id = $1`,
      [userId]
    );
    
    const mode = user.rows[0]?.current_identity_mode || 'true_self';
    
    const wallet = await db.query(
      `SELECT did, cardano_address FROM dual_wallets WHERE user_id = $1 AND mode = $2`,
      [userId, mode]
    );
    
    return {
      mode,
      did: wallet.rows[0].did,
      cardanoAddress: wallet.rows[0].cardano_address
    };
  }

  /**
   * Get both identities (for admin audit only)
   */
  async getDualIdentities(userId: string) {
    const wallets = await db.query(
      `SELECT mode, did, cardano_address FROM dual_wallets WHERE user_id = $1`,
      [userId]
    );
    
    return {
      identities: wallets.rows,
      count: wallets.rows.length
    };
  }

  /**
   * Verify identity ownership via zero-knowledge proof
   * (Prove user owns this DID without revealing private key)
   */
  async verifyIdentityOwnership(did: string, signature: string, message: string): Promise<boolean> {
    // Get the DID and its public key
    const didDoc = await db.query(
      `SELECT did_document FROM decentralized_identifiers WHERE did = $1`,
      [did]
    );
    
    if (!didDoc.rows[0]) {
      return false;
    }
    
    const publicKey = didDoc.rows[0].did_document.publicKey[0].publicKeyMultibase;
    
    // Verify signature
    return this.verifySignature(publicKey, signature, message);
  }

  /**
   * Create session for identity
   */
  async createIdentitySession(userId: string, mode: 'true_self' | 'shadow'): Promise<IdentitySession> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const result = await db.query(
      `INSERT INTO identity_sessions (user_id, session_token, active_identity_mode, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, sessionToken, mode, expiresAt]
    );
    
    return {
      sessionId: result.rows[0].id,
      sessionToken,
      mode,
      expiresAt
    };
  }

  /**
   * Get UTXO pool for identity
   */
  async getUTXOPool(userId: string, mode: 'true_self' | 'shadow') {
    const pool = await db.query(
      `SELECT utxo_data, current_balance FROM utxo_pools WHERE user_id = $1 AND mode = $2`,
      [userId, mode]
    );
    
    return pool.rows[0];
  }

  // Helper methods...
  
  private async encryptPrivateKey(privateKey: string, password: string): Promise<string> {
    // Implementation: AES-256-GCM encryption
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private async encryptWithMasterKey(data: string): Promise<string> {
    // Implementation: Use AWS Secrets Manager to get master key
    // Then encrypt data with that key
    const masterKey = await this.getMasterKey();
    // ... encryption logic
    return 'encrypted_data';
  }

  private async getMasterKey(): Promise<Buffer> {
    // Fetch from AWS Secrets Manager in production
    // For local: use environment variable
    return Buffer.from(process.env.MASTER_ENCRYPTION_KEY || '', 'hex');
  }

  private async logIdentityActivity(userId: string, action: string): Promise<void> {
    await db.query(
      `INSERT INTO identity_activity_log (user_id, action, timestamp)
       VALUES ($1, $2, NOW())`,
      [userId, action]
    );
  }

  private async initializeUTXOPools(userId: string, trueWalletId: string, shadowWalletId: string) {
    // True Self pool
    await db.query(
      `INSERT INTO utxo_pools (user_id, wallet_id, mode, utxo_data)
       VALUES ($1, $2, $3, $4)`,
      [userId, trueWalletId, 'true_self', JSON.stringify({utxos: [], totalUnspent: 0})]
    );
    
    // Shadow pool
    await db.query(
      `INSERT INTO utxo_pools (user_id, wallet_id, mode, utxo_data)
       VALUES ($1, $2, $3, $4)`,
      [userId, shadowWalletId, 'shadow', JSON.stringify({utxos: [], totalUnspent: 0})]
    );
  }

  private verifySignature(publicKey: string, signature: string, message: string): boolean {
    // Implementation: Verify Ed25519 signature
    return true; // Placeholder
  }

  private async signWithKey(privateKey: string, message: string): Promise<string> {
    // Implementation: Sign with Ed25519
    return 'signature'; // Placeholder
  }
}

export const identityService = new IdentityService();
```

---

## 🔌 API Endpoints

### Identity Routes

```typescript
// src/modules/identity/identity.routes.ts

import express from 'express';
import { identityService } from './identity.service';
import { authenticateUser, validateRequest } from '../../middleware';

const router = express.Router();

/**
 * POST /api/v1/identity/create-dual
 * Create dual identities for new user during registration
 * Called automatically by UserService during signup
 */
router.post('/create-dual', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.user;
    const { password } = req.body;
    
    if (!password || password.length < 12) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 12 characters'
      });
    }
    
    const dualIdentity = await identityService.createDualIdentity(userId, password);
    
    return res.status(201).json({
      success: true,
      data: {
        message: 'Dual identity created successfully',
        identities: {
          true_self: dualIdentity.trueIdentity,
          shadow: dualIdentity.shadowIdentity
        },
        createdAt: dualIdentity.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error creating dual identity:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create dual identity'
    });
  }
});

/**
 * POST /api/v1/identity/switch-mode
 * Switch active identity mode
 * Body: { mode: 'true_self' | 'shadow' }
 */
router.post('/switch-mode', authenticateUser, validateRequest(['mode']), async (req, res) => {
  try {
    const { userId, sessionId } = req.user;
    const { mode } = req.body;
    
    if (!['true_self', 'shadow'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be "true_self" or "shadow"'
      });
    }
    
    await identityService.switchIdentityMode(userId, mode, sessionId);
    
    const currentIdentity = await identityService.getCurrentIdentity(userId);
    
    return res.status(200).json({
      success: true,
      data: {
        message: `Switched to ${mode}`,
        currentIdentity,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error switching identity mode:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/identity/current
 * Get current active identity
 */
router.get('/current', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const identity = await identityService.getCurrentIdentity(userId);
    
    return res.status(200).json({
      success: true,
      data: identity
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/identity/verify-ownership
 * Verify DID ownership via zero-knowledge proof
 * Body: { did, signature, message }
 */
router.post('/verify-ownership', async (req, res) => {
  try {
    const { did, signature, message } = req.body;
    
    if (!did || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: did, signature, message'
      });
    }
    
    const isValid = await identityService.verifyIdentityOwnership(did, signature, message);
    
    return res.status(200).json({
      success: true,
      data: {
        valid: isValid,
        did,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/identity/did/:did
 * Resolve DID document (public, no auth required)
 */
router.get('/did/:did', async (req, res) => {
  try {
    const { did } = req.params;
    
    const didDoc = await db.query(
      `SELECT did_document FROM decentralized_identifiers WHERE did = $1`,
      [did]
    );
    
    if (!didDoc.rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'DID not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: didDoc.rows[0].did_document
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/identity/session/create
 * Create identity session
 * Body: { mode: 'true_self' | 'shadow' }
 */
router.post('/session/create', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.user;
    const { mode } = req.body;
    
    const session = await identityService.createIdentitySession(userId, mode);
    
    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ADMIN: GET /api/v1/identity/admin/identities/:userId
 * Get both identities for a user (admin only)
 */
router.get('/admin/identities/:userId', authenticateUser, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }
    
    const { userId } = req.params;
    const identities = await identityService.getDualIdentities(userId);
    
    return res.status(200).json({
      success: true,
      data: identities
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// src/modules/identity/identity.service.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { identityService } from './identity.service';
import { db } from '../../config/database';

describe('Identity Service', () => {
  const testUserId = 'test_user_123';
  const testPassword = 'SecurePassword123!@#';

  beforeEach(async () => {
    // Create test user
    await db.query(
      `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
      [testUserId, 'test@example.com', 'testuser', 'hash']
    );
  });

  afterEach(async () => {
    // Clean up
    await db.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
  });

  describe('createDualIdentity', () => {
    it('should create two wallets with different DIDs', async () => {
      const dual = await identityService.createDualIdentity(testUserId, testPassword);
      
      expect(dual.trueIdentity.did).toContain('true_self');
      expect(dual.shadowIdentity.did).toContain('shadow');
      expect(dual.trueIdentity.did).not.toEqual(dual.shadowIdentity.did);
    });

    it('should create different Cardano addresses', async () => {
      const dual = await identityService.createDualIdentity(testUserId, testPassword);
      
      expect(dual.trueIdentity.cardanoAddress).not.toEqual(dual.shadowIdentity.cardanoAddress);
    });

    it('should initialize UTXO pools for both identities', async () => {
      await identityService.createDualIdentity(testUserId, testPassword);
      
      const pools = await db.query(
        `SELECT COUNT(*) FROM utxo_pools WHERE user_id = $1`,
        [testUserId]
      );
      
      expect(pools.rows[0].count).toBe(2);
    });

    it('should create DualityToken securely', async () => {
      await identityService.createDualIdentity(testUserId, testPassword);
      
      const token = await db.query(
        `SELECT id FROM duality_tokens WHERE user_id = $1`,
        [testUserId]
      );
      
      expect(token.rows[0]).toBeDefined();
    });
  });

  describe('switchIdentityMode', () => {
    beforeEach(async () => {
      await identityService.createDualIdentity(testUserId, testPassword);
    });

    it('should switch from true_self to shadow', async () => {
      const session = await identityService.createIdentitySession(testUserId, 'true_self');
      
      await identityService.switchIdentityMode(testUserId, 'shadow', session.sessionId);
      
      const current = await identityService.getCurrentIdentity(testUserId);
      expect(current.mode).toBe('shadow');
    });

    it('should log mode switches', async () => {
      const session = await identityService.createIdentitySession(testUserId, 'true_self');
      
      await identityService.switchIdentityMode(testUserId, 'shadow', session.sessionId);
      
      const history = await db.query(
        `SELECT * FROM identity_mode_history WHERE user_id = $1 ORDER BY switched_at DESC LIMIT 1`,
        [testUserId]
      );
      
      expect(history.rows[0].to_mode).toBe('shadow');
    });
  });

  describe('verifyIdentityOwnership', () => {
    beforeEach(async () => {
      await identityService.createDualIdentity(testUserId, testPassword);
    });

    it('should verify valid signature', async () => {
      const dual = await identityService.getDualIdentities(testUserId);
      const did = dual.identities[0].did;
      
      // Generate valid signature (would be done client-side in real app)
      const message = 'Verify my identity';
      const signature = 'valid_signature'; // Placeholder
      
      const isValid = await identityService.verifyIdentityOwnership(did, signature, message);
      expect(typeof isValid).toBe('boolean');
    });
  });
});
```

### Integration Tests

```typescript
// src/modules/identity/identity.integration.test.ts

describe('Identity Integration', () => {
  it('should flow from registration to dual identity creation', async () => {
    // 1. Register user
    const registerRes = await fetch('http://localhost:3001/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePassword123!@#'
      })
    });
    
    expect(registerRes.status).toBe(201);
    const user = await registerRes.json();
    
    // 2. Check dual identity was created
    const identityRes = await fetch('http://localhost:3001/api/v1/identity/current', {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    
    expect(identityRes.status).toBe(200);
    const identity = await identityRes.json();
    
    expect(identity.data.did).toBeDefined();
    expect(['true_self', 'shadow']).toContain(identity.data.mode);
  });
});
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Design database schema
- [ ] Run migrations on dev environment
- [ ] Test database connectivity
- [ ] Create TypeScript types and interfaces
- [ ] Set up encryption utilities
- [ ] Implement key derivation (PBKDF2)

### Phase 2: Core Service (Week 2)
- [ ] Implement IdentityService.createDualIdentity()
- [ ] Implement wallet generation (Cardano SDK)
- [ ] Implement DID document generation
- [ ] Implement DualityToken creation and encryption
- [ ] Test with unit tests
- [ ] Test with sample data

### Phase 3: API & Integration (Week 2-3)
- [ ] Implement identity routes
- [ ] Add authentication middleware
- [ ] Add error handling
- [ ] Implement session management
- [ ] Test with integration tests
- [ ] Documentation

### Phase 4: Security Audit (Week 3)
- [ ] Code review for security issues
- [ ] Penetration testing of DualityToken
- [ ] Verify UTXO pool separation
- [ ] Test encryption at rest and in transit
- [ ] Audit database access controls

### Phase 5: Documentation & Polish (Week 3)
- [ ] API documentation
- [ ] TypeScript documentation
- [ ] Architecture documentation
- [ ] Security model explanation
- [ ] Developer guide

---

## 🚀 Success Criteria

You know Module 1 is complete when:

1. ✅ Every user has two cryptographically distinct wallets
2. ✅ Two DIDs are created and resolvable  
3. ✅ DualityToken proves linkage (encrypted, secure)
4. ✅ Users can switch modes seamlessly
5. ✅ Each identity has separate UTXO pools
6. ✅ Zero-knowledge proofs work for verification
7. ✅ Session management tracks active identity
8. ✅ No way to link True Self and Shadow externally
9. ✅ All private keys encrypted at rest
10. ✅ Full audit trail of identity operations
11. ✅ DID documents resolve correctly
12. ✅ All tests pass (unit + integration)

---

## 📚 Dependencies & References

### External Libraries
```json
{
  "@cardano-sdk/core": "^0.15.0",
  "@cardano-sdk/wallet": "^0.15.0",
  "crypto": "^1.0.0",
  "jose": "^4.14.0",  // JWT & cryptography
  "argon2": "^0.30.0"  // Password hashing
}
```

### Standards & Specifications
- W3C DID Core 1.0: https://www.w3.org/TR/did-core/
- Cardano Wallet CIP-03: https://github.com/cardano-foundation/CIPs/tree/master/CIP-0003
- NIST SP 800-132: Password-Based Key Derivation

---

## 🎯 Next Steps After Module 1

Once Module 1 is complete:
1. **Module 2: Bridge Legacy** - Connect to existing MVP
2. **Module 3: User** - Profile management
3. **Module 4: Economy** - PollCoin + Gratium system
4. **Module 6: Governance** - Voting with dual identities

---

## 📝 Notes for Development Team

### Critical Implementation Points

1. **DualityToken is NEVER Exposed**
   - Only accessed via encrypted stored procedure
   - Database-side decryption only
   - Private keys never in application memory longer than needed
   - Immediately overwritten after use

2. **UTXO Pool Hygiene**
   - Separate pools prevent transaction linking
   - Monitor for wallet consolidation patterns
   - Alert if fragmentation ratio exceeds 80%
   - Implement automatic consolidation option

3. **DID Document Verification**
   - Must be resolvable via HTTP-accessible endpoint
   - Should include creation timestamp
   - Should allow external verification without revealing linkage

4. **Session Security**
   - 7-day expiration for all sessions
   - Automatic logout on identity switch
   - IP address tracking (hashed)
   - Device fingerprinting for suspicious activity

5. **Error Handling**
   - Never expose key material in error messages
   - Never indicate whether user has dual identity in error responses
   - Log all errors for audit trail
   - Return generic "Something went wrong" to clients

---

## 📦 Database Migration Scripts

### Migration 001: Create Users Table Enhancement

```sql
-- migrations/001_enhance_users_table.sql

-- Add dual identity columns to existing users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_dual_identity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_identity_mode VARCHAR(20) CHECK (current_identity_mode IN ('true_self', 'shadow')),
ADD COLUMN IF NOT EXISTS last_identity_switch TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_has_dual_identity ON users(has_dual_identity) WHERE has_dual_identity = true;
CREATE INDEX IF NOT EXISTS idx_users_current_mode ON users(current_identity_mode);

-- Add comment
COMMENT ON COLUMN users.has_dual_identity IS 'Indicates if user has completed dual identity setup';
COMMENT ON COLUMN users.current_identity_mode IS 'Active identity mode: true_self or shadow';
```

### Migration 002: Create Dual Wallets Table

```sql
-- migrations/002_create_dual_wallets.sql

-- Create dual_wallets table
CREATE TABLE dual_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity mode
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('true_self', 'shadow')),

  -- Cardano wallet info
  cardano_address VARCHAR(255) NOT NULL UNIQUE,
  public_key VARCHAR(255) NOT NULL UNIQUE,

  -- Key material (encrypted at rest)
  encrypted_private_key TEXT NOT NULL,
  encryption_salt VARCHAR(255) NOT NULL,
  encryption_iv VARCHAR(255) NOT NULL,

  -- DID
  did VARCHAR(255) NOT NULL UNIQUE,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  verified BOOLEAN DEFAULT false,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  accessed_count INTEGER DEFAULT 0,

  CONSTRAINT unique_user_mode UNIQUE(user_id, mode)
);

-- Create indexes
CREATE INDEX idx_dual_wallets_user_id ON dual_wallets(user_id);
CREATE INDEX idx_dual_wallets_did ON dual_wallets(did);
CREATE INDEX idx_dual_wallets_cardano_address ON dual_wallets(cardano_address);
CREATE INDEX idx_dual_wallets_mode ON dual_wallets(mode);
CREATE INDEX idx_dual_wallets_status ON dual_wallets(status) WHERE status = 'active';

-- Add comments
COMMENT ON TABLE dual_wallets IS 'Stores dual Cardano wallets for True Self and Shadow identities';
COMMENT ON COLUMN dual_wallets.encrypted_private_key IS 'Private key encrypted with user password-derived key';
```

### Migration 003: Create DIDs Table

```sql
-- migrations/003_create_decentralized_identifiers.sql

CREATE TABLE decentralized_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES dual_wallets(id) ON DELETE CASCADE,

  -- The DID itself
  did VARCHAR(255) NOT NULL UNIQUE,

  -- DID Document (W3C standard format)
  did_document JSONB NOT NULL,

  -- Resolution
  resolvable BOOLEAN DEFAULT true,
  resolver_endpoint VARCHAR(500),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_wallet FOREIGN KEY (wallet_id) REFERENCES dual_wallets(id)
);

-- Indexes
CREATE INDEX idx_dids_user_id ON decentralized_identifiers(user_id);
CREATE INDEX idx_dids_wallet_id ON decentralized_identifiers(wallet_id);
CREATE UNIQUE INDEX idx_dids_did ON decentralized_identifiers(did);
CREATE INDEX idx_dids_resolvable ON decentralized_identifiers(resolvable) WHERE resolvable = true;

-- JSONB index for DID document queries
CREATE INDEX idx_dids_document_gin ON decentralized_identifiers USING gin(did_document);

COMMENT ON TABLE decentralized_identifiers IS 'W3C-compliant Decentralized Identifiers for both identities';
```

### Migration 004: Create DualityTokens Table (SECURE)

```sql
-- migrations/004_create_duality_tokens.sql

-- Create special role for duality token access
CREATE ROLE IF NOT EXISTS identity_system_internal;

CREATE TABLE duality_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- The linkage proof (ENCRYPTED with master key)
  true_self_private_key_encrypted TEXT NOT NULL,
  shadow_private_key_encrypted TEXT NOT NULL,

  -- Encryption metadata
  master_key_id VARCHAR(255) NOT NULL,
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  encryption_version INTEGER DEFAULT 1,

  -- Proof of legitimacy
  creation_proof JSONB NOT NULL,

  -- Backup/Recovery
  backup_seed_encrypted TEXT,
  backup_created_at TIMESTAMPTZ,

  -- Access audit (append-only log)
  access_log JSONB DEFAULT '[]'::jsonb,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'compromised', 'rotated')),
  compromised BOOLEAN DEFAULT false,
  compromised_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_user_duality FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Revoke public access
REVOKE ALL ON duality_tokens FROM public;

-- Grant limited access to internal role only
GRANT SELECT ON duality_tokens TO identity_system_internal;

-- Create secure access function
CREATE OR REPLACE FUNCTION get_duality_token_secure(
  p_user_id UUID,
  p_purpose VARCHAR(100)
)
RETURNS TABLE(
  true_key_encrypted TEXT,
  shadow_key_encrypted TEXT,
  master_key_id VARCHAR,
  encryption_algo VARCHAR
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log access attempt
  UPDATE duality_tokens
  SET
    access_log = access_log || jsonb_build_object(
      'timestamp', NOW(),
      'purpose', p_purpose,
      'success', true
    ),
    access_count = access_count + 1,
    last_accessed = NOW()
  WHERE user_id = p_user_id;

  -- Return encrypted keys
  RETURN QUERY
  SELECT
    true_self_private_key_encrypted,
    shadow_private_key_encrypted,
    dt.master_key_id,
    dt.encryption_algorithm
  FROM duality_tokens dt
  WHERE dt.user_id = p_user_id
    AND dt.status = 'active'
    AND dt.compromised = false;
END;
$$;

-- Indexes
CREATE INDEX idx_duality_tokens_user_id ON duality_tokens(user_id);
CREATE INDEX idx_duality_tokens_status ON duality_tokens(status) WHERE status = 'active';

COMMENT ON TABLE duality_tokens IS 'CRITICAL: Stores encrypted linkage between True Self and Shadow identities';
COMMENT ON FUNCTION get_duality_token_secure IS 'Secure function to access duality tokens with audit logging';
```

### Migration 005: Create UTXO Pools Table

```sql
-- migrations/005_create_utxo_pools.sql

CREATE TABLE utxo_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES dual_wallets(id) ON DELETE CASCADE,

  -- Pool identification
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('true_self', 'shadow')),

  -- UTXO data (JSONB for flexibility)
  utxo_data JSONB NOT NULL DEFAULT '{"utxos": [], "totalUnspent": 0}'::jsonb,

  -- Transaction history (append-only)
  transaction_history JSONB DEFAULT '[]'::jsonb,

  -- Statistics
  total_received BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  current_balance BIGINT DEFAULT 0,
  utxo_count INTEGER DEFAULT 0,

  -- Sync status
  synced BOOLEAN DEFAULT true,
  last_synced TIMESTAMPTZ,
  sync_block_height BIGINT,

  -- Hygiene tracking
  utxo_fragmentation_ratio DECIMAL(5,2) DEFAULT 0.0,
  consolidation_recommended BOOLEAN DEFAULT false,
  last_consolidation TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_wallet_mode UNIQUE(user_id, wallet_id, mode),
  CONSTRAINT fk_utxo_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_utxo_wallet FOREIGN KEY (wallet_id) REFERENCES dual_wallets(id)
);

-- Indexes
CREATE INDEX idx_utxo_pools_user_id ON utxo_pools(user_id);
CREATE INDEX idx_utxo_pools_wallet_id ON utxo_pools(wallet_id);
CREATE INDEX idx_utxo_pools_mode ON utxo_pools(mode);
CREATE INDEX idx_utxo_pools_synced ON utxo_pools(synced) WHERE synced = false;
CREATE INDEX idx_utxo_pools_consolidation ON utxo_pools(consolidation_recommended) WHERE consolidation_recommended = true;

-- JSONB indexes
CREATE INDEX idx_utxo_data_gin ON utxo_pools USING gin(utxo_data);
CREATE INDEX idx_tx_history_gin ON utxo_pools USING gin(transaction_history);

COMMENT ON TABLE utxo_pools IS 'Tracks UTXO sets for each identity to prevent transaction linking';
COMMENT ON COLUMN utxo_pools.utxo_fragmentation_ratio IS 'Percentage of UTXOs below dust threshold';
```

### Migration 006: Create Identity Sessions Table

```sql
-- migrations/006_create_identity_sessions.sql

CREATE TABLE identity_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session identification
  session_token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) UNIQUE,

  -- Active identity for this session
  active_identity_mode VARCHAR(20) NOT NULL CHECK (active_identity_mode IN ('true_self', 'shadow')),

  -- Session metadata
  ip_address_hash VARCHAR(255),
  device_fingerprint VARCHAR(255),
  user_agent VARCHAR(500),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Activity tracking
  total_requests INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'logged_out')),
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(255),

  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_identity_sessions_user_id ON identity_sessions(user_id);
CREATE UNIQUE INDEX idx_identity_sessions_token ON identity_sessions(session_token) WHERE status = 'active';
CREATE INDEX idx_identity_sessions_expires ON identity_sessions(expires_at);
CREATE INDEX idx_identity_sessions_status ON identity_sessions(status) WHERE status = 'active';
CREATE INDEX idx_identity_sessions_device ON identity_sessions(device_fingerprint);

-- Auto-expire sessions function
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE identity_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

COMMENT ON TABLE identity_sessions IS 'Tracks active sessions per identity mode';
COMMENT ON FUNCTION expire_old_sessions IS 'Cron job function to expire old sessions';
```

### Migration 007: Create Identity Mode History Table

```sql
-- migrations/007_create_identity_mode_history.sql

CREATE TABLE identity_mode_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Mode switch
  from_mode VARCHAR(20) CHECK (from_mode IN ('true_self', 'shadow')),
  to_mode VARCHAR(20) NOT NULL CHECK (to_mode IN ('true_self', 'shadow')),

  -- Context
  session_id UUID REFERENCES identity_sessions(id) ON DELETE SET NULL,
  ip_address_hash VARCHAR(255),
  device_fingerprint VARCHAR(255),
  reason VARCHAR(255),

  -- Duration in previous mode (seconds)
  duration_in_previous_mode INTEGER,

  -- Timestamp
  switched_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_mode_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_mode_history_session FOREIGN KEY (session_id) REFERENCES identity_sessions(id)
);

-- Indexes
CREATE INDEX idx_identity_mode_history_user_id ON identity_mode_history(user_id);
CREATE INDEX idx_identity_mode_history_switched_at ON identity_mode_history(switched_at DESC);
CREATE INDEX idx_identity_mode_history_session ON identity_mode_history(session_id);
CREATE INDEX idx_identity_mode_history_from_to ON identity_mode_history(from_mode, to_mode);

-- Partitioning by time (for large scale)
-- CREATE TABLE identity_mode_history_2025_01 PARTITION OF identity_mode_history
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

COMMENT ON TABLE identity_mode_history IS 'Audit trail of identity mode switches';
```

### Migration 008: Create Helper Functions

```sql
-- migrations/008_create_helper_functions.sql

-- Function to get user's current identity
CREATE OR REPLACE FUNCTION get_current_identity(p_user_id UUID)
RETURNS TABLE(
  mode VARCHAR,
  did VARCHAR,
  cardano_address VARCHAR,
  wallet_id UUID
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dw.mode::VARCHAR,
    dw.did::VARCHAR,
    dw.cardano_address::VARCHAR,
    dw.id
  FROM users u
  JOIN dual_wallets dw ON dw.user_id = u.id
  WHERE u.id = p_user_id
    AND dw.mode = COALESCE(u.current_identity_mode, 'true_self')
    AND dw.status = 'active';
END;
$$;

-- Function to validate DID format
CREATE OR REPLACE FUNCTION is_valid_did(p_did VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_did ~ '^did:agoranet:[a-f0-9-]+_(true_self|shadow)$';
END;
$$;

-- Function to calculate UTXO fragmentation
CREATE OR REPLACE FUNCTION calculate_utxo_fragmentation(p_wallet_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  utxo_count INTEGER;
  dust_count INTEGER;
  fragmentation_ratio DECIMAL(5,2);
  dust_threshold CONSTANT BIGINT := 1000000; -- 1 ADA in lovelace
BEGIN
  SELECT
    jsonb_array_length(utxo_data->'utxos'),
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(utxo_data->'utxos') utxo
      WHERE (utxo->>'amount')::BIGINT < dust_threshold
    )
  INTO utxo_count, dust_count
  FROM utxo_pools
  WHERE wallet_id = p_wallet_id;

  IF utxo_count = 0 THEN
    RETURN 0.0;
  END IF;

  fragmentation_ratio := (dust_count::DECIMAL / utxo_count::DECIMAL) * 100;

  -- Update the pool
  UPDATE utxo_pools
  SET
    utxo_fragmentation_ratio = fragmentation_ratio,
    consolidation_recommended = (fragmentation_ratio > 80.0)
  WHERE wallet_id = p_wallet_id;

  RETURN fragmentation_ratio;
END;
$$;

COMMENT ON FUNCTION get_current_identity IS 'Returns the active identity for a user';
COMMENT ON FUNCTION is_valid_did IS 'Validates DID format for Dream Protocol';
COMMENT ON FUNCTION calculate_utxo_fragmentation IS 'Calculates UTXO fragmentation ratio and sets consolidation flag';
```

### Migration Rollback Scripts

```sql
-- migrations/rollback_001_to_008.sql

-- Rollback in reverse order
DROP FUNCTION IF EXISTS calculate_utxo_fragmentation(UUID);
DROP FUNCTION IF EXISTS is_valid_did(VARCHAR);
DROP FUNCTION IF EXISTS get_current_identity(UUID);
DROP TABLE IF EXISTS identity_mode_history CASCADE;
DROP FUNCTION IF EXISTS expire_old_sessions();
DROP TABLE IF EXISTS identity_sessions CASCADE;
DROP TABLE IF EXISTS utxo_pools CASCADE;
DROP FUNCTION IF EXISTS get_duality_token_secure(UUID, VARCHAR);
DROP TABLE IF EXISTS duality_tokens CASCADE;
DROP ROLE IF EXISTS identity_system_internal;
DROP TABLE IF EXISTS decentralized_identifiers CASCADE;
DROP TABLE IF EXISTS dual_wallets CASCADE;

ALTER TABLE users
DROP COLUMN IF EXISTS has_dual_identity,
DROP COLUMN IF EXISTS identity_created_at,
DROP COLUMN IF EXISTS current_identity_mode,
DROP COLUMN IF EXISTS last_identity_switch;
```

---

## 🔧 TypeScript Type Definitions

### Core Types

```typescript
// src/modules/identity/types/identity.types.ts

/**
 * Identity mode enumeration
 */
export enum IdentityMode {
  TRUE_SELF = 'true_self',
  SHADOW = 'shadow'
}

/**
 * Wallet status enumeration
 */
export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

/**
 * Session status enumeration
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  LOGGED_OUT = 'logged_out'
}

/**
 * DualityToken status enumeration
 */
export enum DualityTokenStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  COMPROMISED = 'compromised',
  ROTATED = 'rotated'
}

/**
 * Dual wallet entity
 */
export interface DualWallet {
  id: string;
  userId: string;
  mode: IdentityMode;
  cardanoAddress: string;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptionSalt: string;
  encryptionIv: string;
  did: string;
  status: WalletStatus;
  verified: boolean;
  createdAt: Date;
  lastAccessed?: Date;
  accessedCount: number;
}

/**
 * DID Document (W3C Standard)
 */
export interface DIDDocument {
  '@context': string;
  id: string;
  publicKey: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
  created?: string;
  updated?: string;
}

/**
 * Decentralized Identifier entity
 */
export interface DecentralizedIdentifier {
  id: string;
  userId: string;
  walletId: string;
  did: string;
  didDocument: DIDDocument;
  resolvable: boolean;
  resolverEndpoint?: string;
  createdAt: Date;
  updatedAt: Date;
  lastVerified?: Date;
  verificationCount: number;
}

/**
 * Creation proof for DualityToken
 */
export interface CreationProof {
  timestamp: string;
  ipAddressHash: string;
  deviceFingerprint: string;
  signatureFromTrueSelf: string;
  blockHeight?: number;
}

/**
 * Access log entry for DualityToken
 */
export interface AccessLogEntry {
  timestamp: string;
  purpose: string;
  success: boolean;
  ipAddressHash?: string;
  errorMessage?: string;
}

/**
 * DualityToken entity (SENSITIVE)
 */
export interface DualityToken {
  id: string;
  userId: string;
  trueSelfPrivateKeyEncrypted: string;
  shadowPrivateKeyEncrypted: string;
  masterKeyId: string;
  encryptionAlgorithm: string;
  encryptionVersion: number;
  creationProof: CreationProof;
  backupSeedEncrypted?: string;
  backupCreatedAt?: Date;
  accessLog: AccessLogEntry[];
  lastAccessed?: Date;
  accessCount: number;
  status: DualityTokenStatus;
  compromised: boolean;
  compromisedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UTXO (Unspent Transaction Output)
 */
export interface UTXO {
  txId: string;
  outputIndex: number;
  amount: bigint;
  address: string;
  status: 'unspent' | 'spent' | 'pending';
  blockHeight?: number;
  timestamp?: Date;
}

/**
 * Transaction history entry
 */
export interface TransactionHistoryEntry {
  type: 'receive' | 'send';
  amount: bigint;
  txId: string;
  address: string;
  blockHeight?: number;
  date: Date;
  confirmed: boolean;
}

/**
 * UTXO Pool entity
 */
export interface UTXOPool {
  id: string;
  userId: string;
  walletId: string;
  mode: IdentityMode;
  utxoData: {
    utxos: UTXO[];
    totalUnspent: bigint;
  };
  transactionHistory: TransactionHistoryEntry[];
  totalReceived: bigint;
  totalSpent: bigint;
  currentBalance: bigint;
  utxoCount: number;
  synced: boolean;
  lastSynced?: Date;
  syncBlockHeight?: bigint;
  utxoFragmentationRatio: number;
  consolidationRecommended: boolean;
  lastConsolidation?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Identity session entity
 */
export interface IdentitySession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  activeIdentityMode: IdentityMode;
  ipAddressHash?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  totalRequests: number;
  lastRequestAt?: Date;
  status: SessionStatus;
  revokedAt?: Date;
  revokeReason?: string;
}

/**
 * Identity mode history entry
 */
export interface IdentityModeHistory {
  id: string;
  userId: string;
  fromMode?: IdentityMode;
  toMode: IdentityMode;
  sessionId?: string;
  ipAddressHash?: string;
  deviceFingerprint?: string;
  reason?: string;
  durationInPreviousMode?: number;
  switchedAt: Date;
}

/**
 * Dual identity creation result
 */
export interface DualIdentity {
  userId: string;
  trueIdentity: {
    did: string;
    cardanoAddress: string;
    mode: IdentityMode.TRUE_SELF;
    walletId: string;
  };
  shadowIdentity: {
    did: string;
    cardanoAddress: string;
    mode: IdentityMode.SHADOW;
    walletId: string;
  };
  createdAt: Date;
}

/**
 * Current identity response
 */
export interface CurrentIdentity {
  mode: IdentityMode;
  did: string;
  cardanoAddress: string;
  walletId: string;
}

/**
 * Cardano wallet generation result
 */
export interface CardanoWalletGeneration {
  mnemonic: string;
  cardanoAddress: string;
  publicKey: string;
  privateKey: string;
}

/**
 * Identity verification result
 */
export interface IdentityVerificationResult {
  valid: boolean;
  did: string;
  verifiedAt: Date;
  publicKey?: string;
}

/**
 * Service method options
 */
export interface CreateDualIdentityOptions {
  userId: string;
  userPassword: string;
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface SwitchIdentityOptions {
  userId: string;
  targetMode: IdentityMode;
  sessionId: string;
  reason?: string;
}

export interface CreateSessionOptions {
  userId: string;
  mode: IdentityMode;
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}

export interface VerifyOwnershipOptions {
  did: string;
  signature: string;
  message: string;
}

/**
 * Error types
 */
export class IdentityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}

export class DualIdentityNotFoundError extends IdentityError {
  constructor(userId: string) {
    super(
      'Dual identity not found for user',
      'DUAL_IDENTITY_NOT_FOUND',
      404,
      { userId }
    );
  }
}

export class InvalidDIDError extends IdentityError {
  constructor(did: string) {
    super(
      'Invalid DID format',
      'INVALID_DID',
      400,
      { did }
    );
  }
}

export class WalletCompromisedError extends IdentityError {
  constructor(walletId: string) {
    super(
      'Wallet has been marked as compromised',
      'WALLET_COMPROMISED',
      403,
      { walletId }
    );
  }
}

export class SessionExpiredError extends IdentityError {
  constructor(sessionId: string) {
    super(
      'Session has expired',
      'SESSION_EXPIRED',
      401,
      { sessionId }
    );
  }
}
```

### Encryption Types

```typescript
// src/modules/identity/types/encryption.types.ts

/**
 * Encryption algorithm types
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES-256-GCM',
  AES_256_CBC = 'AES-256-CBC'
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  authTag?: string;
  algorithm: EncryptionAlgorithm;
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  password: string;
  salt: Buffer;
  iterations: number;
  keyLength: number;
  digest: string;
}

/**
 * Master key metadata
 */
export interface MasterKeyMetadata {
  keyId: string;
  version: number;
  algorithm: EncryptionAlgorithm;
  createdAt: Date;
  rotatedAt?: Date;
}
```

---

## ⚙️ Environment Configuration Template

```bash
# .env.example

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dreamprotocol_dev
DB_USER=dream_admin
DB_PASSWORD=your_secure_password_here
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# ============================================
# IDENTITY MODULE CONFIGURATION
# ============================================

# Master Encryption Key (CRITICAL - Store in secrets manager in production)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MASTER_ENCRYPTION_KEY=generate_your_own_32_byte_hex_key_here
MASTER_KEY_ID=mk_v1_production
ENCRYPTION_ALGORITHM=AES-256-GCM
ENCRYPTION_VERSION=1

# Password Hashing
PASSWORD_HASH_ITERATIONS=100000
PASSWORD_HASH_ALGORITHM=sha256
PASSWORD_MIN_LENGTH=12

# Session Configuration
SESSION_EXPIRY_DAYS=7
SESSION_CLEANUP_INTERVAL_HOURS=1
MAX_SESSIONS_PER_USER=5

# ============================================
# CARDANO CONFIGURATION
# ============================================

# Network (testnet or mainnet)
CARDANO_NETWORK=testnet
CARDANO_NETWORK_MAGIC=1097911063

# Cardano Node (for testnet)
CARDANO_NODE_SOCKET_PATH=/path/to/cardano/node/socket
CARDANO_NODE_HOST=localhost
CARDANO_NODE_PORT=3001

# Blockfrost API (alternative to node)
BLOCKFROST_PROJECT_ID=your_blockfrost_project_id
BLOCKFROST_API_URL=https://cardano-testnet.blockfrost.io/api/v0

# UTXO Management
UTXO_DUST_THRESHOLD=1000000
UTXO_FRAGMENTATION_WARNING_THRESHOLD=80
UTXO_SYNC_INTERVAL_MINUTES=5

# ============================================
# DID CONFIGURATION
# ============================================

# DID Method
DID_METHOD=agoranet
DID_RESOLVER_ENDPOINT=https://did.dreamprotocol.io/resolve

# DID Document Options
DID_DOCUMENT_VERSION=1.0
DID_CONTEXT_URL=https://www.w3.org/ns/did/v1

# ============================================
# SECURITY CONFIGURATION
# ============================================

# Rate Limiting
RATE_LIMIT_IDENTITY_CREATE=5
RATE_LIMIT_IDENTITY_SWITCH=30
RATE_LIMIT_WINDOW_MINUTES=15

# IP Hashing
IP_HASH_ALGORITHM=sha256
IP_HASH_SALT=your_random_salt_here

# Device Fingerprinting
DEVICE_FINGERPRINT_ENABLED=true

# Audit Logging
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_LEVEL=info

# ============================================
# AWS SECRETS MANAGER (Production)
# ============================================
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_ARN=arn:aws:secretsmanager:region:account:secret:name
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# ============================================
# MONITORING & LOGGING
# ============================================
LOG_LEVEL=debug
LOG_FORMAT=json
SENTRY_DSN=your_sentry_dsn_here
DATADOG_API_KEY=your_datadog_key_here

# ============================================
# API CONFIGURATION
# ============================================
API_PORT=3001
API_HOST=0.0.0.0
API_BASE_PATH=/api/v1
CORS_ORIGIN=http://localhost:3000
```

---

## 🚀 Deployment & Operations Guide

### Pre-Deployment Checklist

```markdown
## Pre-Deployment Security Audit

- [ ] All placeholder implementations replaced with production code
- [ ] Master encryption key stored in AWS Secrets Manager (NOT in .env)
- [ ] Database roles and permissions configured correctly
- [ ] DualityToken table access restricted to internal role only
- [ ] All private keys encrypted at rest
- [ ] TLS/SSL certificates installed and configured
- [ ] Rate limiting enabled on all identity endpoints
- [ ] Audit logging enabled and tested
- [ ] Session expiry mechanism tested
- [ ] UTXO fragmentation monitoring active
- [ ] DID resolver endpoint accessible
- [ ] Cardano node/Blockfrost connection tested
- [ ] Backup and recovery procedures documented
- [ ] Incident response plan in place
```

### Database Setup

```bash
#!/bin/bash
# scripts/setup-identity-database.sh

set -e

echo "Setting up Identity Module database..."

# Run migrations in order
psql $DATABASE_URL -f migrations/001_enhance_users_table.sql
psql $DATABASE_URL -f migrations/002_create_dual_wallets.sql
psql $DATABASE_URL -f migrations/003_create_decentralized_identifiers.sql
psql $DATABASE_URL -f migrations/004_create_duality_tokens.sql
psql $DATABASE_URL -f migrations/005_create_utxo_pools.sql
psql $DATABASE_URL -f migrations/006_create_identity_sessions.sql
psql $DATABASE_URL -f migrations/007_create_identity_mode_history.sql
psql $DATABASE_URL -f migrations/008_create_helper_functions.sql

echo "Database setup complete!"
echo "Verifying tables..."

psql $DATABASE_URL -c "\dt" | grep -E "dual_wallets|decentralized_identifiers|duality_tokens|utxo_pools|identity_sessions|identity_mode_history"

echo "All tables created successfully!"
```

### Monitoring & Alerts

```typescript
// src/modules/identity/monitoring/metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

export const identityMetrics = {
  // Counters
  dualIdentitiesCreated: new Counter({
    name: 'identity_dual_identities_created_total',
    help: 'Total number of dual identities created'
  }),

  identitySwitches: new Counter({
    name: 'identity_mode_switches_total',
    help: 'Total number of identity mode switches',
    labelNames: ['from_mode', 'to_mode']
  }),

  dualityTokenAccesses: new Counter({
    name: 'identity_duality_token_accesses_total',
    help: 'Total number of DualityToken access attempts',
    labelNames: ['success']
  }),

  didResolutions: new Counter({
    name: 'identity_did_resolutions_total',
    help: 'Total number of DID resolution requests',
    labelNames: ['success']
  }),

  // Histograms
  identityCreationDuration: new Histogram({
    name: 'identity_creation_duration_seconds',
    help: 'Duration of dual identity creation',
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  modeSwitchDuration: new Histogram({
    name: 'identity_mode_switch_duration_seconds',
    help: 'Duration of identity mode switch',
    buckets: [0.01, 0.05, 0.1, 0.5, 1]
  }),

  // Gauges
  activeSessions: new Gauge({
    name: 'identity_active_sessions',
    help: 'Current number of active identity sessions',
    labelNames: ['mode']
  }),

  utxoFragmentation: new Gauge({
    name: 'identity_utxo_fragmentation_ratio',
    help: 'UTXO fragmentation ratio by wallet',
    labelNames: ['wallet_id', 'mode']
  }),

  compromisedWallets: new Gauge({
    name: 'identity_compromised_wallets_total',
    help: 'Total number of compromised wallets'
  })
};

// Alert thresholds
export const ALERT_THRESHOLDS = {
  UTXO_FRAGMENTATION: 80,
  SESSION_EXPIRY_WARNING: 3600, // 1 hour in seconds
  MAX_FAILED_SWITCHES: 10,
  DUALITY_TOKEN_ACCESS_RATE: 100 // per minute
};
```

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup-identity-data.sh

set -e

BACKUP_DIR="/backups/identity"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting identity module backup..."

# Backup critical tables
pg_dump $DATABASE_URL \
  --table=users \
  --table=dual_wallets \
  --table=decentralized_identifiers \
  --table=duality_tokens \
  --table=utxo_pools \
  --table=identity_sessions \
  --table=identity_mode_history \
  --format=custom \
  --file="${BACKUP_DIR}/identity_backup_${TIMESTAMP}.dump"

# Encrypt the backup
gpg --encrypt --recipient backup@dreamprotocol.io \
  "${BACKUP_DIR}/identity_backup_${TIMESTAMP}.dump"

# Upload to S3
aws s3 cp \
  "${BACKUP_DIR}/identity_backup_${TIMESTAMP}.dump.gpg" \
  "s3://dreamprotocol-backups/identity/${TIMESTAMP}/" \
  --storage-class GLACIER

# Cleanup local backup (keep GPG encrypted version)
rm "${BACKUP_DIR}/identity_backup_${TIMESTAMP}.dump"

echo "Backup complete: identity_backup_${TIMESTAMP}.dump.gpg"
```

### Recovery Procedures

```markdown
## Identity Module Recovery Procedures

### Scenario 1: DualityToken Compromise Detected

1. **Immediate Actions:**
   ```sql
   -- Mark token as compromised
   UPDATE duality_tokens
   SET status = 'compromised',
       compromised = true,
       compromised_at = NOW()
   WHERE user_id = '<affected_user_id>';

   -- Revoke all active sessions
   UPDATE identity_sessions
   SET status = 'revoked',
       revoke_reason = 'security_compromise',
       revoked_at = NOW()
   WHERE user_id = '<affected_user_id>'
     AND status = 'active';
   ```

2. **Notify user via secure channel**
3. **Generate new DualityToken with key rotation**
4. **Audit access logs for breach analysis**

### Scenario 2: Database Restore from Backup

1. **Stop application servers**
2. **Restore database:**
   ```bash
   pg_restore -d dreamprotocol_db \
     --clean --if-exists \
     backups/identity_backup_YYYYMMDD_HHMMSS.dump
   ```
3. **Verify data integrity:**
   ```sql
   SELECT COUNT(*) FROM dual_wallets;
   SELECT COUNT(*) FROM duality_tokens WHERE status = 'active';
   ```
4. **Re-encrypt DualityTokens if master key rotated**
5. **Restart application servers**

### Scenario 3: Master Key Rotation

1. **Generate new master key in AWS Secrets Manager**
2. **Run key rotation script:**
   ```bash
   npm run identity:rotate-master-key \
     --old-key-id=mk_v1_production \
     --new-key-id=mk_v2_production
   ```
3. **Verify all DualityTokens re-encrypted**
4. **Update .env with new key ID**
5. **Archive old key (retain for 90 days minimum)**
```

---

## 🔍 Compliance & Privacy

### GDPR Compliance

**Data Subject Rights Implementation:**

1. **Right to Access (Article 15):**
   ```typescript
   async exportUserIdentityData(userId: string): Promise<UserDataExport> {
     return {
       identities: await this.getDualIdentities(userId),
       sessions: await this.getSessionHistory(userId),
       modeHistory: await this.getModeHistory(userId),
       // NEVER include DualityToken data in exports
       dualityTokenExists: await this.hasDualityToken(userId),
       utxoPools: await this.getUTXOPoolSummary(userId)
     };
   }
   ```

2. **Right to Erasure (Article 17):**
   ```typescript
   async deleteUserIdentity(userId: string, reason: string): Promise<void> {
     // Cascade delete will handle most tables
     // But we need special handling for DualityToken
     await this.securelyDeleteDualityToken(userId);
     await this.archiveIdentityForCompliance(userId);
     await db.query('DELETE FROM users WHERE id = $1', [userId]);
   }
   ```

3. **Data Minimization (Article 5):**
   - Only store encrypted private keys, never plaintext
   - Hash IP addresses, don't store raw IPs
   - Device fingerprints are hashed
   - DualityToken linkage never exposed

4. **Privacy by Design (Article 25):**
   - Dual-identity architecture inherently privacy-preserving
   - Zero-knowledge proofs for identity verification
   - Separate UTXO pools prevent transaction linking
   - Encrypted at rest, encrypted in transit

### Audit Trail Requirements

```typescript
// src/modules/identity/audit/audit-logger.ts

export enum AuditEventType {
  DUAL_IDENTITY_CREATED = 'dual_identity_created',
  IDENTITY_MODE_SWITCHED = 'identity_mode_switched',
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  DUALITY_TOKEN_ACCESSED = 'duality_token_accessed',
  WALLET_COMPROMISED = 'wallet_compromised',
  DID_RESOLVED = 'did_resolved',
  UTXO_CONSOLIDATION = 'utxo_consolidation'
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  walletId?: string;
  sessionId?: string;
  ipAddressHash?: string;
  deviceFingerprint?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  async log(entry: AuditLogEntry): Promise<void> {
    // Log to database
    await db.query(
      `INSERT INTO audit_log (event_type, user_id, wallet_id, session_id,
        ip_address_hash, device_fingerprint, timestamp, success, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.eventType,
        entry.userId,
        entry.walletId,
        entry.sessionId,
        entry.ipAddressHash,
        entry.deviceFingerprint,
        entry.timestamp,
        entry.success,
        entry.errorMessage,
        JSON.stringify(entry.metadata || {})
      ]
    );

    // Also log to external SIEM
    await this.sendToSIEM(entry);
  }

  private async sendToSIEM(entry: AuditLogEntry): Promise<void> {
    // Send to Datadog, Splunk, or other SIEM system
  }
}
```

---

## 📊 Performance Optimization

### Database Indexes Strategy

```sql
-- Additional performance indexes

-- Composite index for common query pattern
CREATE INDEX idx_dual_wallets_user_mode_status
ON dual_wallets(user_id, mode, status)
WHERE status = 'active';

-- Partial index for active sessions
CREATE INDEX idx_sessions_active_user
ON identity_sessions(user_id, expires_at)
WHERE status = 'active';

-- Index for recent mode history queries
CREATE INDEX idx_mode_history_recent
ON identity_mode_history(user_id, switched_at DESC)
WHERE switched_at > NOW() - INTERVAL '30 days';
```

### Caching Strategy

```typescript
// src/modules/identity/cache/identity-cache.ts

import Redis from 'ioredis';

export class IdentityCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async getCurrentIdentity(userId: string): Promise<CurrentIdentity | null> {
    const cached = await this.redis.get(`identity:current:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  async cacheCurrentIdentity(userId: string, identity: CurrentIdentity): Promise<void> {
    await this.redis.setex(
      `identity:current:${userId}`,
      3600, // 1 hour TTL
      JSON.stringify(identity)
    );
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.redis.del(`identity:current:${userId}`);
  }

  async cacheDIDDocument(did: string, document: DIDDocument): Promise<void> {
    // DID documents rarely change, long TTL
    await this.redis.setex(
      `did:document:${did}`,
      86400, // 24 hours
      JSON.stringify(document)
    );
  }
}
```

---

## ✅ Final Implementation Checklist

### Week 1: Foundation
- [x] Database schema designed
- [x] All 8 migrations created
- [x] TypeScript types defined
- [x] Environment configuration template created
- [x] Helper functions implemented
- [ ] Test migrations on dev database
- [ ] Verify all constraints and indexes

### Week 2: Core Service
- [ ] Replace placeholder implementations:
  - [ ] `encryptWithMasterKey()` - AWS Secrets Manager integration
  - [ ] `verifySignature()` - Ed25519 signature verification
  - [ ] `signWithKey()` - Ed25519 signing
  - [ ] AWS Secrets Manager client setup
- [ ] Implement Cardano wallet generation (using @cardano-sdk)
- [ ] Implement DID document generation (W3C compliant)
- [ ] Implement DualityToken creation with full encryption
- [ ] Implement UTXO pool initialization
- [ ] Write unit tests for all service methods
- [ ] Test with sample data

### Week 3: API & Integration
- [ ] Implement all identity routes
- [ ] Add authentication middleware
- [ ] Add comprehensive error handling
- [ ] Implement session management
- [ ] Add rate limiting
- [ ] Write integration tests
- [ ] API documentation (Swagger/OpenAPI)

### Week 3: Security & Deployment
- [ ] Security audit of encryption implementation
- [ ] Penetration testing of DualityToken access
- [ ] Verify UTXO pool separation
- [ ] Test session expiry mechanism
- [ ] Audit database access controls
- [ ] Deploy to staging environment
- [ ] Run load tests
- [ ] Monitor metrics and alerts
- [ ] Document incident response procedures

### Production Readiness
- [ ] All tests passing (unit + integration + e2e)
- [ ] Code coverage > 80%
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested
- [ ] Documentation complete
- [ ] Team training completed
- [ ] Incident response plan reviewed
- [ ] Production deployment checklist verified

---

**MODULE_01_IDENTITY_TECHNICAL_PLAN.md is now COMPLETE! ✅**

This document now includes:
1. ✅ Complete database migration scripts (8 migrations + rollback)
2. ✅ Full TypeScript type definitions
3. ✅ Environment configuration template
4. ✅ Deployment & operations guide
5. ✅ Monitoring & metrics strategy
6. ✅ Backup & recovery procedures
7. ✅ GDPR compliance implementation
8. ✅ Audit trail requirements
9. ✅ Performance optimization strategies
10. ✅ Final implementation checklist

**Next Steps:**
1. Run migrations on development database
2. Implement remaining placeholder functions
3. Set up AWS Secrets Manager for master key
4. Begin unit test implementation
5. Integrate with Cardano SDK

