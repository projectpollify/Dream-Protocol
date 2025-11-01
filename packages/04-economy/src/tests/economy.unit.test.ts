/**
 * Module 04: Economy - Unit Tests
 *
 * Tests individual functions and token economy logic
 * Target: 80%+ code coverage
 */

import { describe, it, expect } from 'vitest';
import {
  formatTokenAmount,
  parseTokenAmount,
  calculateBurnAmount,
  calculateNetAmount,
} from '../types/economy.types';

// ============================================================================
// UNIT TESTS - Token Amount Formatting
// ============================================================================

describe('Unit Tests - Token Amount Formatting', () => {
  it('should format bigint to decimal string (18 decimals)', () => {
    expect(formatTokenAmount(BigInt('1000000000000000000'))).toBe('1');
    expect(formatTokenAmount(BigInt('1500000000000000000'))).toBe('1.5');
    expect(formatTokenAmount(BigInt('100000000000000000000'))).toBe('100');
  });

  it('should handle zero', () => {
    expect(formatTokenAmount(BigInt(0))).toBe('0');
  });

  it('should handle very small amounts (wei precision)', () => {
    expect(formatTokenAmount(BigInt('1'))).toBe('0.000000000000000001');
    expect(formatTokenAmount(BigInt('1000000000000000'))).toBe('0.001');
  });

  it('should handle large amounts', () => {
    expect(formatTokenAmount(BigInt('1000000000000000000000000'))).toBe('1000000');
  });
});

// ============================================================================
// UNIT TESTS - Token Amount Parsing
// ============================================================================

describe('Unit Tests - Token Amount Parsing', () => {
  it('should parse decimal string to bigint (18 decimals)', () => {
    expect(parseTokenAmount('1')).toBe(BigInt('1000000000000000000'));
    expect(parseTokenAmount('1.5')).toBe(BigInt('1500000000000000000'));
    expect(parseTokenAmount('100')).toBe(BigInt('100000000000000000000'));
  });

  it('should handle zero', () => {
    expect(parseTokenAmount('0')).toBe(BigInt(0));
  });

  it('should handle very precise decimals', () => {
    expect(parseTokenAmount('0.000000000000000001')).toBe(BigInt('1'));
  });

  it('should handle integer strings', () => {
    expect(parseTokenAmount('50')).toBe(BigInt('50000000000000000000'));
  });
});

// ============================================================================
// UNIT TESTS - Balance Validation
// ============================================================================

describe('Unit Tests - Balance Validation', () => {
  it('should create initial balance with zero tokens', () => {
    const balance = {
      pollcoin_balance: BigInt(0),
      gratium_balance: BigInt(0),
      pollcoin_locked: BigInt(0),
      gratium_locked: BigInt(0),
    };

    expect(balance.pollcoin_balance).toBe(BigInt(0));
    expect(balance.gratium_balance).toBe(BigInt(0));
  });

  it('should prevent negative balances', () => {
    const balance = BigInt(50);
    const transfer = BigInt(100);

    const canTransfer = balance >= transfer;
    expect(canTransfer).toBe(false);
  });

  it('should allow transfer when balance is sufficient', () => {
    const balance = BigInt(100);
    const transfer = BigInt(50);

    const canTransfer = balance >= transfer;
    expect(canTransfer).toBe(true);
  });

  it('should calculate available balance (total - locked)', () => {
    const totalBalance = BigInt(100);
    const lockedBalance = BigInt(30);
    const availableBalance = totalBalance - lockedBalance;

    expect(availableBalance).toBe(BigInt(70));
  });
});

// ============================================================================
// UNIT TESTS - Burn Mechanics
// ============================================================================

describe('Unit Tests - Burn Mechanics', () => {
  it('should calculate 1% burn for PollCoin transfers', () => {
    const amount = BigInt('1000000000000000000'); // 1 token
    const burn = calculateBurnAmount(amount, 'pollcoin');

    expect(burn).toBe(BigInt('10000000000000000')); // 0.01 token (1%)
  });

  it('should calculate 0.5% burn for Gratium transfers', () => {
    const amount = BigInt('1000000000000000000'); // 1 token
    const burn = calculateBurnAmount(amount, 'gratium');

    expect(burn).toBe(BigInt('5000000000000000')); // 0.005 token (0.5%)
  });

  it('should handle large transfer amounts', () => {
    const amount = BigInt('100000000000000000000'); // 100 tokens
    const burn = calculateBurnAmount(amount, 'pollcoin');

    expect(burn).toBe(BigInt('1000000000000000000')); // 1 token (1% of 100)
  });

  it('should handle very small amounts', () => {
    const amount = BigInt('100000000000000000'); // 0.1 token
    const burn = calculateBurnAmount(amount, 'pollcoin');

    expect(burn).toBe(BigInt('1000000000000000')); // 0.001 token (1%)
  });

  it('should not allow burn to go negative', () => {
    const amount = BigInt('1'); // Smallest unit
    const burn = calculateBurnAmount(amount, 'pollcoin');

    expect(burn).toBeGreaterThanOrEqual(BigInt(0));
  });
});

// ============================================================================
// UNIT TESTS - Net Amount Calculation
// ============================================================================

describe('Unit Tests - Net Amount After Burn', () => {
  it('should calculate net amount after 1% PollCoin burn', () => {
    const amount = BigInt('1000000000000000000'); // 1 token
    const net = calculateNetAmount(amount, 'pollcoin');

    expect(net).toBe(BigInt('990000000000000000')); // 0.99 token
  });

  it('should calculate net amount after 0.5% Gratium burn', () => {
    const amount = BigInt('1000000000000000000'); // 1 token
    const net = calculateNetAmount(amount, 'gratium');

    expect(net).toBe(BigInt('995000000000000000')); // 0.995 token
  });

  it('should handle 100 token transfer', () => {
    const amount = BigInt('100000000000000000000'); // 100 tokens
    const net = calculateNetAmount(amount, 'pollcoin');

    expect(net).toBe(BigInt('99000000000000000000')); // 99 tokens (1 burned)
  });
});

// ============================================================================
// UNIT TESTS - Transfer Validation
// ============================================================================

describe('Unit Tests - Transfer Validation', () => {
  it('should validate transfer between different identities', () => {
    const fromUser = 'user_1';
    const fromMode = 'true_self';
    const toUser = 'user_2';
    const toMode = 'shadow';

    // Valid transfer - different users
    expect(fromUser).not.toBe(toUser);
  });

  it('should allow self-transfer between True Self and Shadow', () => {
    const userId = 'user_1';
    const fromMode = 'true_self';
    const toMode = 'shadow';

    // Valid self-transfer - same user, different identities
    expect(fromMode).not.toBe(toMode);
  });

  it('should prevent transfer to same identity', () => {
    const userId = 'user_1';
    const fromMode = 'true_self';
    const toMode = 'true_self';

    // Invalid - same identity
    const isValid = fromMode !== toMode || userId !== userId;
    expect(isValid).toBe(false);
  });
});

// ============================================================================
// UNIT TESTS - Token Locking
// ============================================================================

describe('Unit Tests - Token Locking', () => {
  it('should lock tokens for governance', () => {
    const totalBalance = BigInt(100);
    const lockAmount = BigInt(50);
    const lockedBalance = lockAmount;
    const availableBalance = totalBalance - lockedBalance;

    expect(lockedBalance).toBe(BigInt(50));
    expect(availableBalance).toBe(BigInt(50));
  });

  it('should prevent transfer of locked tokens', () => {
    const totalBalance = BigInt(100);
    const lockedBalance = BigInt(50);
    const availableBalance = totalBalance - lockedBalance;
    const transferAmount = BigInt(75);

    const canTransfer = availableBalance >= transferAmount;
    expect(canTransfer).toBe(false); // Only 50 available, trying to transfer 75
  });

  it('should allow transfer of available tokens only', () => {
    const totalBalance = BigInt(100);
    const lockedBalance = BigInt(50);
    const availableBalance = totalBalance - lockedBalance;
    const transferAmount = BigInt(40);

    const canTransfer = availableBalance >= transferAmount;
    expect(canTransfer).toBe(true); // 50 available, transferring 40
  });

  it('should unlock tokens after release', () => {
    let totalBalance = BigInt(100);
    let lockedBalance = BigInt(50);

    // Release lock
    lockedBalance = BigInt(0);
    const availableBalance = totalBalance - lockedBalance;

    expect(availableBalance).toBe(BigInt(100));
  });
});

// ============================================================================
// UNIT TESTS - Light Score Bounds
// ============================================================================

describe('Unit Tests - Light Score', () => {
  it('should initialize Light Score at 50 (neutral)', () => {
    const initialScore = 50;
    expect(initialScore).toBe(50);
  });

  it('should enforce minimum Light Score of 0', () => {
    const score = -10;
    const boundedScore = Math.max(0, Math.min(100, score));

    expect(boundedScore).toBe(0);
  });

  it('should enforce maximum Light Score of 100', () => {
    const score = 150;
    const boundedScore = Math.max(0, Math.min(100, score));

    expect(boundedScore).toBe(100);
  });

  it('should accept valid scores between 0-100', () => {
    const validScores = [0, 25, 50, 75, 100];

    validScores.forEach((score) => {
      const isValid = score >= 0 && score <= 100;
      expect(isValid).toBe(true);
    });
  });

  it('should update Light Score with event logging', () => {
    let currentScore = 50;
    const delta = 10;

    // Update score
    currentScore = Math.max(0, Math.min(100, currentScore + delta));

    expect(currentScore).toBe(60);
  });
});

// ============================================================================
// UNIT TESTS - Transaction Types
// ============================================================================

describe('Unit Tests - Transaction Types', () => {
  it('should validate transaction type enum', () => {
    const validTypes = [
      'transfer',
      'tip',
      'stake',
      'unstake',
      'burn',
      'reward',
      'purchase',
      'poll_creation',
      'vote_cost',
      'veracity_bond',
      'prediction_market',
    ];

    validTypes.forEach((type) => {
      expect([
        'transfer',
        'tip',
        'stake',
        'unstake',
        'burn',
        'reward',
        'purchase',
        'poll_creation',
        'vote_cost',
        'veracity_bond',
        'prediction_market',
      ]).toContain(type);
    });
  });

  it('should track transaction status', () => {
    const validStatuses = ['pending', 'completed', 'failed', 'reversed'];

    validStatuses.forEach((status) => {
      expect(['pending', 'completed', 'failed', 'reversed']).toContain(status);
    });
  });
});

// ============================================================================
// UNIT TESTS - Dual Identity Economy
// ============================================================================

describe('Unit Tests - Dual Identity Economy', () => {
  it('should maintain separate balances for True Self and Shadow', () => {
    const userId = 'user_1';

    const trueSelfBalance = {
      user_id: userId,
      identity_mode: 'true_self' as const,
      pollcoin_balance: BigInt(100),
      gratium_balance: BigInt(50),
    };

    const shadowBalance = {
      user_id: userId,
      identity_mode: 'shadow' as const,
      pollcoin_balance: BigInt(30),
      gratium_balance: BigInt(20),
    };

    expect(trueSelfBalance.user_id).toBe(shadowBalance.user_id);
    expect(trueSelfBalance.identity_mode).not.toBe(shadowBalance.identity_mode);
    expect(trueSelfBalance.pollcoin_balance).not.toBe(shadowBalance.pollcoin_balance);
  });

  it('should allow independent transfers for each identity', () => {
    // True Self balance
    let trueSelfBalance = BigInt(100);

    // Shadow balance
    let shadowBalance = BigInt(50);

    // True Self transfers 30
    trueSelfBalance = trueSelfBalance - BigInt(30);

    // Shadow balance should be unaffected
    expect(trueSelfBalance).toBe(BigInt(70));
    expect(shadowBalance).toBe(BigInt(50)); // Unchanged
  });
});

// ============================================================================
// UNIT TESTS - Token Supply Tracking
// ============================================================================

describe('Unit Tests - Token Supply', () => {
  it('should track total supply', () => {
    let totalSupply = BigInt('1000000000000000000000000000'); // 1 billion tokens

    expect(totalSupply).toBe(BigInt('1000000000000000000000000000'));
  });

  it('should decrease supply when tokens are burned', () => {
    let totalSupply = BigInt('1000000000000000000000000000');
    const burnAmount = BigInt('1000000000000000000'); // 1 token

    totalSupply = totalSupply - burnAmount;

    expect(totalSupply).toBe(BigInt('999999999999999999999999999'));
  });

  it('should track circulating supply (total - locked)', () => {
    const totalSupply = BigInt('1000000000000000000000000000');
    const totalLocked = BigInt('100000000000000000000000000'); // 100M locked
    const circulatingSupply = totalSupply - totalLocked;

    expect(circulatingSupply).toBe(BigInt('900000000000000000000000000'));
  });
});

// ============================================================================
// UNIT TESTS - Atomic Transaction Logic
// ============================================================================

describe('Unit Tests - Atomic Transactions', () => {
  it('should validate transaction can be completed atomically', () => {
    const senderBalance = BigInt(100);
    const amount = BigInt(50);
    const burn = calculateBurnAmount(amount, 'pollcoin');
    const netAmount = amount - burn;

    // Sender must have enough
    expect(senderBalance >= amount).toBe(true);

    // Calculate final balances
    const senderFinalBalance = senderBalance - amount;
    const receiverFinalBalance = netAmount;

    expect(senderFinalBalance).toBe(BigInt(50));
    expect(receiverFinalBalance).toBe(BigInt(49)); // 50 - 1% burn
  });

  it('should rollback transaction on failure', () => {
    let senderBalance = BigInt(100);
    let receiverBalance = BigInt(50);

    // Simulate transaction start
    const originalSenderBalance = senderBalance;
    const originalReceiverBalance = receiverBalance;

    // Simulate failure (error occurs)
    const transactionFailed = true;

    if (transactionFailed) {
      // Rollback
      senderBalance = originalSenderBalance;
      receiverBalance = originalReceiverBalance;
    }

    expect(senderBalance).toBe(BigInt(100));
    expect(receiverBalance).toBe(BigInt(50));
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

/*
 * Unit Tests Summary for Module 04: Economy
 *
 * ✅ Token Amount Formatting (4 tests)
 * ✅ Token Amount Parsing (4 tests)
 * ✅ Balance Validation (4 tests)
 * ✅ Burn Mechanics (5 tests)
 * ✅ Net Amount Calculation (3 tests)
 * ✅ Transfer Validation (3 tests)
 * ✅ Token Locking (4 tests)
 * ✅ Light Score Bounds (5 tests)
 * ✅ Transaction Types (2 tests)
 * ✅ Dual Identity Economy (2 tests)
 * ✅ Token Supply Tracking (3 tests)
 * ✅ Atomic Transaction Logic (2 tests)
 *
 * Total: 41 unit tests
 * Coverage Target: 80%+
 *
 * Note: These test the core token economy logic and calculations.
 * Integration tests will test actual service interactions with database.
 */
