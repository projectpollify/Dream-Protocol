/**
 * Test Data Helpers
 *
 * Utilities for creating mock test data
 */

import { randomUUID } from 'crypto';

/**
 * Generate a random email for testing
 */
export function generateTestEmail(): string {
  return `test-${randomUUID()}@dreamprotocol.test`;
}

/**
 * Generate a random username for testing
 */
export function generateTestUsername(): string {
  return `user_${randomUUID().substring(0, 8)}`;
}

/**
 * Generate test user data
 */
export function generateTestUser() {
  return {
    email: generateTestEmail(),
    username: generateTestUsername(),
    password: 'TestPassword123!',
    password_hash: '$2b$10$testhashedpassword', // Mock bcrypt hash
  };
}

/**
 * Generate test wallet address (mock Cardano format)
 */
export function generateTestWalletAddress(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let address = 'addr_test1';
  for (let i = 0; i < 50; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

/**
 * Generate test DID
 */
export function generateTestDID(): string {
  return `did:example:${randomUUID()}`;
}

/**
 * Generate test encrypted key (mock)
 */
export function generateMockEncryptedKey(): string {
  return Buffer.from(`encrypted_${randomUUID()}`).toString('base64');
}

/**
 * Generate test session token
 */
export function generateTestSessionToken(): string {
  return `session_${randomUUID()}`;
}

/**
 * Create test user profile data
 */
export function generateTestProfile() {
  return {
    display_name: `Test User ${randomUUID().substring(0, 8)}`,
    bio: 'This is a test bio for testing purposes.',
    location: 'Test City',
    website: 'https://test.example.com',
    profile_visibility: 'public' as const,
  };
}

/**
 * Sleep utility for testing delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate test token amounts (as bigint with 18 decimals)
 */
export function generateTokenAmount(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e18));
}

/**
 * Create mock UTXO
 */
export function generateMockUTXO() {
  return {
    tx_hash: randomUUID(),
    output_index: Math.floor(Math.random() * 10),
    amount: Math.floor(Math.random() * 1000000),
    address: generateTestWalletAddress(),
    spent: false,
  };
}

/**
 * Create test purchase order
 */
export function generateTestPurchaseOrder() {
  return {
    amount_usd: 100,
    token_type: 'pollcoin' as const,
    payment_provider: 'stripe' as const,
  };
}
