/**
 * Module 05: Token Exchange - Purchase Service
 *
 * Handles the complete purchase flow: quote → initiate → complete
 */

import { PoolClient } from 'pg';
import {
  TokenPurchaseOrder,
  GetQuoteDTO,
  QuoteResponse,
  InitiatePurchaseDTO,
  InitiatePurchaseResponse,
  CompletePurchaseDTO,
  CompletePurchaseResponse,
  GetPurchaseHistoryDTO,
  PurchaseHistoryResponse,
  PurchaseHistoryItem,
  calculateOnPlatformPrice,
  parseTokenAmount,
  formatTokenAmount,
} from '../types/token-exchange.types';
import { query, insert, findOne, findMany, transaction } from '../utils/database';

// ============================================================================
// Quote Generation
// ============================================================================

/**
 * Get a purchase quote (valid for 5 minutes)
 */
export async function getQuote(data: GetQuoteDTO): Promise<QuoteResponse> {
  const { token_type, amount_tokens, fiat_currency, payment_method } = data;

  // Get current market price (in production, fetch from DEX/price feed)
  // For now, using placeholder prices
  const marketPriceUsd =
    token_type === 'pollcoin' ? 0.15 : 0.07;

  // Calculate on-platform price with 15% premium
  const onPlatformPrice = calculateOnPlatformPrice(marketPriceUsd, 15.0, 1.0);

  // Parse token amount
  const tokenAmountBigInt = BigInt(amount_tokens);
  const tokenAmountDecimal = parseFloat(formatTokenAmount(tokenAmountBigInt));

  // Calculate fiat cost
  const fiatAmount = tokenAmountDecimal * onPlatformPrice;

  // Calculate fees
  const paymentProcessingFee = fiatAmount * 0.022 + 0.3; // Stripe: 2.2% + $0.30
  const platformRevenue = fiatAmount - (tokenAmountDecimal * marketPriceUsd) - paymentProcessingFee;
  const totalFees = paymentProcessingFee + platformRevenue;

  // Quote expires in 5 minutes
  const quoteValidUntil = new Date(Date.now() + 5 * 60 * 1000);

  // Check spot-only compliance (always compliant for on-platform purchases)
  const complianceStatus = 'compliant';

  return {
    token_type,
    amount_tokens,
    amount_display: formatTokenAmount(tokenAmountBigInt),
    market_price_usd: marketPriceUsd,
    on_platform_price_usd: onPlatformPrice,
    fiat_amount: parseFloat(fiatAmount.toFixed(2)),
    fiat_currency,
    fees: {
      payment_processing: parseFloat(paymentProcessingFee.toFixed(2)),
      platform_revenue: parseFloat(platformRevenue.toFixed(2)),
      total: parseFloat(totalFees.toFixed(2)),
    },
    quote_valid_until: quoteValidUntil,
    spot_only_compliance: complianceStatus,
  };
}

// ============================================================================
// Purchase Initiation
// ============================================================================

/**
 * Initiate a token purchase (creates order and returns payment provider info)
 */
export async function initiatePurchase(
  data: InitiatePurchaseDTO
): Promise<InitiatePurchaseResponse> {
  const {
    user_id,
    token_type,
    amount_tokens,
    fiat_currency,
    payment_provider,
    identity_mode,
  } = data;

  // Step 1: Check purchase limits
  await checkPurchaseLimits(user_id, BigInt(amount_tokens));

  // Step 2: Get quote to calculate pricing
  const quote = await getQuote({
    token_type,
    amount_tokens,
    fiat_currency,
  });

  // Step 3: Create purchase order
  const order = await transaction(async (client: PoolClient) => {
    const orderData = {
      user_id,
      identity_mode,
      fiat_amount: quote.fiat_amount.toString(),
      fiat_currency,
      token_type,
      token_amount: amount_tokens,
      price_per_token: quote.on_platform_price_usd.toString(),
      premium_percentage: '15.00',
      payment_provider,
      provider_transaction_id: `pending_${Date.now()}`, // Will be updated later
      status: 'pending',
      kyc_verified: false, // Will be checked later
    };

    return await insert<TokenPurchaseOrder>('token_purchase_orders', orderData);
  });

  // Step 4: Generate payment provider details
  // In production, this would call Stripe API to create PaymentIntent
  const clientSecret = `stripe_client_secret_${order.id}`;
  const redirectUrl = `/checkout/${payment_provider}?purchase_id=${order.id}`;

  return {
    purchase_id: order.id,
    client_secret: clientSecret,
    redirect_url: redirectUrl,
    status: order.status,
    created_at: order.created_at,
  };
}

// ============================================================================
// Purchase Completion
// ============================================================================

/**
 * Complete a purchase (after payment provider confirms payment)
 */
export async function completePurchase(
  data: CompletePurchaseDTO
): Promise<CompletePurchaseResponse> {
  const { purchase_id, payment_intent_id, user_id } = data;

  return await transaction(async (client: PoolClient) => {
    // Step 1: Get purchase order
    const order = await findOne<TokenPurchaseOrder>('token_purchase_orders', {
      id: purchase_id,
      user_id,
    });

    if (!order) {
      throw new Error('Purchase order not found');
    }

    if (order.status === 'completed') {
      throw new Error('Purchase already completed');
    }

    // Step 2: Update order status
    await client.query(
      `UPDATE token_purchase_orders
       SET status = $1,
           completed_at = NOW(),
           provider_transaction_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      ['completed', payment_intent_id, purchase_id]
    );

    // Step 3: Credit tokens to user's ledger
    const tokenAmountBigInt = BigInt(order.token_amount);
    const balanceField =
      order.token_type === 'pollcoin' ? 'pollcoin_balance' : 'gratium_balance';

    await client.query(
      `UPDATE token_ledger
       SET ${balanceField} = ${balanceField} + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND identity_mode = $3`,
      [order.token_amount, user_id, order.identity_mode]
    );

    // Step 4: Record transaction in token_transactions table
    await client.query(
      `INSERT INTO token_transactions (
        transaction_type, token_type, amount,
        to_user_id, to_identity_mode,
        status, completed_at, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        'purchase',
        order.token_type,
        order.token_amount,
        user_id,
        order.identity_mode,
        'completed',
        `Purchased via ${order.payment_provider} for ${order.fiat_amount} ${order.fiat_currency}`,
      ]
    );

    // Step 5: Update purchase limits
    await updatePurchaseLimits(client, user_id, tokenAmountBigInt);

    // Step 6: Get updated balance
    const ledgerResult = await client.query(
      `SELECT ${balanceField} as balance
       FROM token_ledger
       WHERE user_id = $1 AND identity_mode = $2`,
      [user_id, order.identity_mode]
    );

    const newBalance = ledgerResult.rows[0].balance;

    return {
      success: true,
      purchase_id,
      token_type: order.token_type,
      amount_received: order.token_amount,
      amount_display: formatTokenAmount(tokenAmountBigInt),
      transaction_id: purchase_id, // Using purchase_id as transaction reference
      status: 'completed',
      tokens_credited_at: new Date(),
      balance: newBalance.toString(),
    };
  });
}

// ============================================================================
// Purchase History
// ============================================================================

/**
 * Get user's purchase history
 */
export async function getPurchaseHistory(
  data: GetPurchaseHistoryDTO
): Promise<PurchaseHistoryResponse> {
  const { user_id, limit = 20, offset = 0, status } = data;

  // Build query
  let sql = `
    SELECT id, token_type, token_amount, fiat_amount, fiat_currency,
           price_per_token, status, completed_at, payment_provider
    FROM token_purchase_orders
    WHERE user_id = $1
  `;
  const params: any[] = [user_id];

  if (status) {
    sql += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  // Execute query
  const result = await query<PurchaseHistoryItem>(sql, params);

  // Get total count
  const countSql = `
    SELECT COUNT(*) as count
    FROM token_purchase_orders
    WHERE user_id = $1${status ? ' AND status = $2' : ''}
  `;
  const countParams = status ? [user_id, status] : [user_id];
  const countResult = await query<{ count: string }>(countSql, countParams);
  const total = parseInt(countResult.rows[0].count);

  // Format response
  const purchases = result.rows.map((row) => ({
    ...row,
    fiat_amount: parseFloat(row.fiat_amount as unknown as string),
    price_per_token: parseFloat(row.price_per_token as unknown as string),
  }));

  return {
    purchases,
    total,
    limit,
    offset,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user can purchase this amount (respects tier limits)
 */
async function checkPurchaseLimits(
  userId: string,
  tokenAmount: bigint
): Promise<void> {
  const limits = await findOne<any>('purchase_limits', { user_id: userId });

  if (!limits) {
    throw new Error('Purchase limits not initialized for user');
  }

  // Check daily limit
  const remainingDaily =
    BigInt(limits.daily_limit) - BigInt(limits.purchased_today);
  if (tokenAmount > remainingDaily) {
    throw new Error(
      `Daily purchase limit exceeded. Remaining: ${formatTokenAmount(remainingDaily)} tokens`
    );
  }

  // Check monthly limit
  const remainingMonthly =
    BigInt(limits.monthly_limit) - BigInt(limits.purchased_this_month);
  if (tokenAmount > remainingMonthly) {
    throw new Error(
      `Monthly purchase limit exceeded. Remaining: ${formatTokenAmount(remainingMonthly)} tokens`
    );
  }

  // Check yearly limit
  const remainingYearly =
    BigInt(limits.yearly_limit) - BigInt(limits.purchased_this_year);
  if (tokenAmount > remainingYearly) {
    throw new Error(
      `Yearly purchase limit exceeded. Remaining: ${formatTokenAmount(remainingYearly)} tokens`
    );
  }
}

/**
 * Update purchase limits after successful purchase
 */
async function updatePurchaseLimits(
  client: PoolClient,
  userId: string,
  tokenAmount: bigint
): Promise<void> {
  await client.query(
    `UPDATE purchase_limits
     SET purchased_today = purchased_today + $1,
         purchased_this_month = purchased_this_month + $1,
         purchased_this_year = purchased_this_year + $1,
         last_purchase_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $2`,
    [tokenAmount.toString(), userId]
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getQuote,
  initiatePurchase,
  completePurchase,
  getPurchaseHistory,
};
