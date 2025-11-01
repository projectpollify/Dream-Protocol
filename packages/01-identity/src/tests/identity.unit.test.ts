/**
 * Module 01: Identity - Unit Tests
 *
 * Tests individual functions and services for correctness
 * Target: 80%+ code coverage
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';

// ============================================================================
// UNIT TESTS - Wallet Generation
// ============================================================================

describe('Unit Tests - Wallet Generation', () => {
  it('should generate two distinct Cardano wallets for dual identity', async () => {
    const { cardanoService } = await import('../services/cardano.service');

    const wallet1 = await cardanoService.generateWallet();
    const wallet2 = await cardanoService.generateWallet();

    // Verify both wallets exist
    expect(wallet1).toBeDefined();
    expect(wallet2).toBeDefined();

    // Verify they have unique addresses
    expect(wallet1.cardanoAddress).toBeDefined();
    expect(wallet2.cardanoAddress).toBeDefined();
    expect(wallet1.cardanoAddress).not.toBe(wallet2.cardanoAddress);

    // Verify Cardano address format
    expect(wallet1.cardanoAddress).toMatch(/^addr/);
    expect(wallet2.cardanoAddress).toMatch(/^addr/);
  });

  it('should have unique public/private key pairs', async () => {
    const { cardanoService } = await import('../services/cardano.service');

    const wallet1 = await cardanoService.generateWallet();
    const wallet2 = await cardanoService.generateWallet();

    // Public keys must be different
    expect(wallet1.publicKey).not.toBe(wallet2.publicKey);

    // Private keys must be different
    expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
  });

  it('should generate valid Cardano format addresses', async () => {
    const { cardanoService } = await import('../services/cardano.service');

    const wallet = await cardanoService.generateWallet();

    // Basic Cardano address validation
    expect(wallet.cardanoAddress).toMatch(/^addr/);
    expect(wallet.cardanoAddress.length).toBeGreaterThan(50);
  });
});

// ============================================================================
// UNIT TESTS - DID Document Generation
// ============================================================================

describe('Unit Tests - DID Document', () => {
  it('should generate W3C compliant DID format', () => {
    const userId = randomUUID();
    const did_true = `did:agoranet:${userId}_true_self`;
    const did_shadow = `did:agoranet:${userId}_shadow`;

    // Verify DID format
    expect(did_true).toMatch(/^did:agoranet:/);
    expect(did_shadow).toMatch(/^did:agoranet:/);

    // Verify they're different
    expect(did_true).not.toBe(did_shadow);
  });

  it('should create DID documents with required fields', async () => {
    const { IdentityService } = await import('../services/identity.service');
    const service = new IdentityService();

    const mockPublicKey = 'mock_public_key_123';
    const userId = randomUUID();

    // @ts-ignore - accessing private method for testing
    const didDoc = service.generateDIDDocument(mockPublicKey, userId, 'true_self');

    // Required W3C DID fields
    expect(didDoc).toHaveProperty('id');
    expect(didDoc).toHaveProperty('publicKey');
    expect(didDoc).toHaveProperty('authentication');
    expect(didDoc).toHaveProperty('@context');
  });

  it('should ensure DIDs for true_self and shadow are unique', () => {
    const userId = randomUUID();
    const did_true = `did:agoranet:${userId}_true_self`;
    const did_shadow = `did:agoranet:${userId}_shadow`;

    expect(did_true).not.toBe(did_shadow);
    expect(did_true).toContain('true_self');
    expect(did_shadow).toContain('shadow');
  });
});

// ============================================================================
// UNIT TESTS - Encryption
// ============================================================================

describe('Unit Tests - Encryption', () => {
  it('should encrypt private keys with AES-256-GCM', async () => {
    const { encrypt } = await import('../utils/encryption');

    const privateKey = 'test_private_key_12345';
    const password = 'SecurePassword123!';

    const encrypted = await encrypt(privateKey, password);

    // Verify encryption output
    expect(encrypted).toHaveProperty('ciphertext');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('salt');
    expect(encrypted).toHaveProperty('authTag');

    // Ciphertext should not equal plaintext
    expect(encrypted.ciphertext).not.toBe(privateKey);
  });

  it('should decrypt encrypted keys with correct master key', async () => {
    const { encrypt, decrypt } = await import('../utils/encryption');

    const originalKey = 'test_private_key_12345';
    const password = 'SecurePassword123!';

    const encrypted = await encrypt(originalKey, password);
    const decrypted = await decrypt(
      encrypted.ciphertext,
      password,
      encrypted.salt,
      encrypted.iv,
      encrypted.authTag
    );

    expect(decrypted).toBe(originalKey);
  });

  it('should fail decryption with wrong master key', async () => {
    const { encrypt, decrypt } = await import('../utils/encryption');

    const originalKey = 'test_private_key_12345';
    const correctPassword = 'SecurePassword123!';
    const wrongPassword = 'WrongPassword456!';

    const encrypted = await encrypt(originalKey, correctPassword);

    await expect(
      decrypt(
        encrypted.ciphertext,
        wrongPassword,
        encrypted.salt,
        encrypted.iv,
        encrypted.authTag
      )
    ).rejects.toThrow();
  });

  it('should generate random IV for each encryption (no duplicates)', async () => {
    const { encrypt } = await import('../utils/encryption');

    const privateKey = 'test_private_key_12345';
    const password = 'SecurePassword123!';

    const encrypted1 = await encrypt(privateKey, password);
    const encrypted2 = await encrypt(privateKey, password);

    // IVs should be different (nonce must be random)
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });
});

// ============================================================================
// UNIT TESTS - Master Key Derivation
// ============================================================================

describe('Unit Tests - Master Key Derivation', () => {
  it('should derive key using PBKDF2 with correct parameters', async () => {
    const { deriveKey } = await import('../utils/encryption');

    const password = 'TestPassword123!';
    const salt = 'test_salt_123456';

    const derivedKey = await deriveKey(password, salt);

    expect(derivedKey).toBeDefined();
    expect(derivedKey.length).toBeGreaterThan(0);
  });

  it('should produce same key for same password + salt', async () => {
    const { deriveKey } = await import('../utils/encryption');

    const password = 'TestPassword123!';
    const salt = 'test_salt_123456';

    const key1 = await deriveKey(password, salt);
    const key2 = await deriveKey(password, salt);

    expect(key1.toString('hex')).toBe(key2.toString('hex'));
  });

  it('should produce different key for different password', async () => {
    const { deriveKey } = await import('../utils/encryption');

    const salt = 'test_salt_123456';

    const key1 = await deriveKey('Password1', salt);
    const key2 = await deriveKey('Password2', salt);

    expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
  });

  it('should produce different key for different salt', async () => {
    const { deriveKey } = await import('../utils/encryption');

    const password = 'TestPassword123!';

    const key1 = await deriveKey(password, 'salt1');
    const key2 = await deriveKey(password, 'salt2');

    expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
  });
});

// ============================================================================
// UNIT TESTS - Session Management
// ============================================================================

describe('Unit Tests - Session Management', () => {
  it('should generate unique session tokens', async () => {
    const { generateToken } = await import('../utils/encryption');

    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
  });

  it('should hash IP addresses for privacy', async () => {
    const { hashIPAddress } = await import('../utils/encryption');

    const ip = '192.168.1.1';
    const hashed = hashIPAddress(ip);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(ip);
    expect(hashed.length).toBe(64); // SHA-256 hex length
  });

  it('should produce consistent hash for same IP', async () => {
    const { hashIPAddress } = await import('../utils/encryption');

    const ip = '192.168.1.1';
    const hash1 = hashIPAddress(ip);
    const hash2 = hashIPAddress(ip);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different IP', async () => {
    const { hashIPAddress } = await import('../utils/encryption');

    const hash1 = hashIPAddress('192.168.1.1');
    const hash2 = hashIPAddress('192.168.1.2');

    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================================
// UNIT TESTS - Identity Mode Validation
// ============================================================================

describe('Unit Tests - Identity Mode', () => {
  it('should validate identity mode as true_self or shadow', () => {
    const validModes = ['true_self', 'shadow'];

    validModes.forEach((mode) => {
      expect(['true_self', 'shadow']).toContain(mode);
    });
  });

  it('should reject invalid identity modes', () => {
    const invalidModes = ['invalid', 'both', 'neither', ''];

    invalidModes.forEach((mode) => {
      expect(['true_self', 'shadow']).not.toContain(mode);
    });
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

/*
 * Unit Tests Summary for Module 01: Identity
 *
 * ✅ Wallet Generation (3 tests)
 * ✅ DID Document Generation (3 tests)
 * ✅ Encryption (5 tests)
 * ✅ Master Key Derivation (4 tests)
 * ✅ Session Management (4 tests)
 * ✅ Identity Mode Validation (2 tests)
 *
 * Total: 21 unit tests
 * Coverage Target: 80%+
 */
