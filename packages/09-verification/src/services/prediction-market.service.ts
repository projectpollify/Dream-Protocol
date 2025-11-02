/**
 * Prediction Market Service
 * Module 09: Verification - Session 2
 *
 * Implements LMSR (Logarithmic Market Scoring Rule) for binary prediction markets.
 * The LMSR algorithm ensures:
 * - Prices always sum to 1.0
 * - Market maker never loses money
 * - Prices automatically adjust based on trading
 * - Liquidity parameter 'b' controls price sensitivity
 */

import { query, queryOne } from '../database';
import {
  PredictionMarket,
  MarketPosition,
  MarketTrade,
  MarketQuote,
  MarketStatus,
  MarketResolution,
  Outcome,
  TradeType,
} from '../types';

/**
 * LMSR Algorithm: Mathematical Core
 *
 * Cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
 * Price of yes: p_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 * Price of no:  p_no = e^(q_no/b) / (e^(q_yes/b) + e^(q_no/b))
 *
 * Where:
 * - q_yes = current quantity of YES shares
 * - q_no = current quantity of NO shares
 * - b = liquidity parameter (higher = slower price changes, more liquidity)
 *
 * Key properties:
 * - p_yes + p_no = 1.0 always
 * - Cost increases monotonically as quantities increase
 * - Market maker's wealth = b * ln(2) initially (for q_yes = q_no = 0)
 */

class LMSRCalculator {
  /**
   * Calculate exponential with safe handling of very large exponents
   * This prevents overflow while maintaining mathematical accuracy
   */
  private static safeExp(x: number): number {
    // Prevent overflow: if x > 700, Math.exp would return Infinity
    if (x > 700) {
      return Number.MAX_VALUE;
    }
    if (x < -700) {
      return 0;
    }
    return Math.exp(x);
  }

  /**
   * Calculate natural logarithm of sum of exponentials
   * logsum([a, b]) = ln(e^a + e^b)
   * Uses the log-sum-exp trick to prevent numerical overflow
   */
  private static logSumExp(values: number[]): number {
    if (values.length === 0) {
      return Number.NEGATIVE_INFINITY;
    }

    const maxVal = Math.max(...values);
    if (maxVal === Number.NEGATIVE_INFINITY) {
      return Number.NEGATIVE_INFINITY;
    }

    const sum = values.reduce((acc, val) => {
      return acc + this.safeExp(val - maxVal);
    }, 0);

    return maxVal + Math.log(sum);
  }

  /**
   * Calculate total cost to reach a given quantity distribution
   * C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
   */
  static calculateCost(qYes: number, qNo: number, liquidity: number): number {
    const logSum = this.logSumExp([qYes / liquidity, qNo / liquidity]);
    return liquidity * logSum;
  }

  /**
   * Calculate probability of YES outcome given current quantities
   * p_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
   */
  static calculateProbability(qYes: number, qNo: number, liquidity: number): number {
    const expYes = this.safeExp(qYes / liquidity);
    const expNo = this.safeExp(qNo / liquidity);

    if (expYes === 0 && expNo === 0) {
      return 0.5; // Both zero, assume 50-50
    }

    const total = expYes + expNo;
    if (total === 0) {
      return 0.5;
    }

    return expYes / total;
  }

  /**
   * Calculate price for buying N shares of a given outcome
   * Price = C(q + n) - C(q)
   */
  static calculateBuyCost(
    qYes: number,
    qNo: number,
    outcome: Outcome,
    shares: number,
    liquidity: number,
  ): number {
    const currentCost = this.calculateCost(qYes, qNo, liquidity);

    let newQYes = qYes;
    let newQNo = qNo;

    if (outcome === 'yes') {
      newQYes += shares;
    } else {
      newQNo += shares;
    }

    const newCost = this.calculateCost(newQYes, newQNo, liquidity);
    return Math.max(0, newCost - currentCost); // Cost should never be negative
  }

  /**
   * Calculate proceeds from selling N shares of a given outcome
   * Proceeds = C(q) - C(q - n)
   */
  static calculateSellProceeds(
    qYes: number,
    qNo: number,
    outcome: Outcome,
    shares: number,
    liquidity: number,
  ): number {
    const currentCost = this.calculateCost(qYes, qNo, liquidity);

    let newQYes = qYes;
    let newQNo = qNo;

    if (outcome === 'yes') {
      newQYes = Math.max(0, qYes - shares);
    } else {
      newQNo = Math.max(0, qNo - shares);
    }

    const newCost = this.calculateCost(newQYes, newQNo, liquidity);
    return Math.max(0, currentCost - newCost);
  }

  /**
   * Get price per share at current quantities
   * This is the marginal price (derivative of cost function)
   * For LMSR: p = e^(q/b) / (e^(q_yes/b) + e^(q_no/b))
   */
  static getMarginalPrice(
    qYes: number,
    qNo: number,
    outcome: Outcome,
    liquidity: number,
  ): number {
    return this.calculateProbability(qYes, qNo, liquidity);
  }
}

export class PredictionMarketService {
  /**
   * Create a new prediction market
   */
  static async createMarket(
    creatorId: string,
    question: string,
    description: string,
    liquidityParameter: number,
    closesAt: Date,
    category?: string,
  ): Promise<PredictionMarket> {
    const id = `market_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const market: PredictionMarket = {
      id,
      creatorId,
      question,
      description,
      category,
      liquidityParameter,
      initialProbability: 0.5,
      currentProbability: 0.5,
      outcomeYesShares: BigInt(0),
      outcomeNoShares: BigInt(0),
      status: 'open',
      resolution: null,
      resolvedAt: null,
      totalVolume: BigInt(0),
      uniqueTraders: 0,
      lastTradeAt: null,
      opensAt: now,
      closesAt,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const sql = `
      INSERT INTO prediction_markets (
        id, creator_id, question, description, category,
        liquidity_parameter, initial_probability, current_probability,
        outcome_yes_shares, outcome_no_shares, status,
        total_volume, unique_traders, opens_at, closes_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const result = await queryOne<PredictionMarket>(sql, [
      id,
      creatorId,
      question,
      description,
      category,
      liquidityParameter,
      0.5,
      0.5,
      0,
      0,
      'open',
      0,
      0,
      now,
      closesAt,
      now,
      now,
    ]);

    if (!result) {
      throw new Error('Failed to create prediction market');
    }

    return result;
  }

  /**
   * Get market details
   */
  static async getMarket(marketId: string): Promise<PredictionMarket | null> {
    const sql = 'SELECT * FROM prediction_markets WHERE id = $1';
    return queryOne<PredictionMarket>(sql, [marketId]);
  }

  /**
   * List markets with filtering
   */
  static async listMarkets(filters?: {
    status?: MarketStatus;
    category?: string;
    creatorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PredictionMarket[]> {
    let sql = 'SELECT * FROM prediction_markets WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }

    if (filters?.creatorId) {
      sql += ` AND creator_id = $${paramIndex++}`;
      params.push(filters.creatorId);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await query<PredictionMarket>(sql, params);
    return result.rows;
  }

  /**
   * Calculate quote for buying shares
   * Returns: cost in Gratium, new probability, price impact
   */
  static calculateBuyQuote(
    market: PredictionMarket,
    outcome: Outcome,
    sharesToBuy: number,
  ): MarketQuote {
    const qYes = Number(market.outcomeYesShares);
    const qNo = Number(market.outcomeNoShares);
    const liquidity = market.liquidityParameter;

    const currentProb = LMSRCalculator.calculateProbability(qYes, qNo, liquidity);
    const cost = LMSRCalculator.calculateBuyCost(qYes, qNo, outcome, sharesToBuy, liquidity);

    // Calculate new probability after trade
    let newQYes = qYes;
    let newQNo = qNo;
    if (outcome === 'yes') {
      newQYes += sharesToBuy;
    } else {
      newQNo += sharesToBuy;
    }
    const newProb = LMSRCalculator.calculateProbability(newQYes, newQNo, liquidity);

    return {
      cost: BigInt(Math.round(cost)),
      newProbability: newProb,
      priceImpact: Math.abs(newProb - currentProb),
    };
  }

  /**
   * Calculate quote for selling shares
   * Returns: proceeds in Gratium, new probability, price impact
   */
  static calculateSellQuote(
    market: PredictionMarket,
    outcome: Outcome,
    sharesToSell: number,
  ): MarketQuote {
    const qYes = Number(market.outcomeYesShares);
    const qNo = Number(market.outcomeNoShares);
    const liquidity = market.liquidityParameter;

    const currentProb = LMSRCalculator.calculateProbability(qYes, qNo, liquidity);
    const proceeds = LMSRCalculator.calculateSellProceeds(qYes, qNo, outcome, sharesToSell, liquidity);

    // Calculate new probability after trade
    let newQYes = qYes;
    let newQNo = qNo;
    if (outcome === 'yes') {
      newQYes = Math.max(0, qYes - sharesToSell);
    } else {
      newQNo = Math.max(0, qNo - sharesToSell);
    }
    const newProb = LMSRCalculator.calculateProbability(newQYes, newQNo, liquidity);

    return {
      cost: BigInt(Math.round(proceeds)),
      newProbability: newProb,
      priceImpact: Math.abs(newProb - currentProb),
    };
  }

  /**
   * Execute a buy order
   */
  static async buyShares(
    marketId: string,
    userId: string,
    identityMode: 'true_self' | 'shadow',
    outcome: Outcome,
    shares: number,
    maxCostGratium: bigint,
  ): Promise<MarketTrade> {
    const market = await this.getMarket(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    if (market.status !== 'open') {
      throw new Error('Market is not open for trading');
    }

    // Check if market has closed
    if (new Date() > market.closesAt) {
      throw new Error('Market has closed');
    }

    // Calculate cost
    const quote = this.calculateBuyQuote(market, outcome, shares);

    if (quote.cost > maxCostGratium) {
      throw new Error(`Cost ${quote.cost} exceeds max cost ${maxCostGratium}`);
    }

    // Create trade record
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const trade: MarketTrade = {
      id: tradeId,
      marketId,
      userId,
      identityMode,
      tradeType: 'buy',
      outcome,
      shares: BigInt(shares),
      price: quote.newProbability,
      gratiumAmount: quote.cost,
      probabilityBefore: LMSRCalculator.calculateProbability(
        Number(market.outcomeYesShares),
        Number(market.outcomeNoShares),
        market.liquidityParameter,
      ),
      probabilityAfter: quote.newProbability,
      createdAt: now,
    };

    // Insert trade
    const tradeSql = `
      INSERT INTO market_trades (
        id, market_id, user_id, identity_mode, trade_type, outcome,
        shares, price, gratium_amount, probability_before, probability_after, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await query(tradeSql, [
      tradeId,
      marketId,
      userId,
      identityMode,
      'buy',
      outcome,
      shares,
      quote.newProbability,
      quote.cost,
      trade.probabilityBefore,
      quote.newProbability,
      now,
    ]);

    // Update market state
    const updateMarketSql = `
      UPDATE prediction_markets
      SET
        ${outcome === 'yes' ? 'outcome_yes_shares = outcome_yes_shares + $1' : 'outcome_no_shares = outcome_no_shares + $1'},
        current_probability = $2,
        total_volume = total_volume + $3,
        last_trade_at = $4,
        updated_at = $4
      WHERE id = $5
    `;

    await query(updateMarketSql, [shares, quote.newProbability, quote.cost, now, marketId]);

    // Update or create position
    await this.updatePosition(marketId, userId, identityMode, outcome, shares, quote.newProbability);

    return trade;
  }

  /**
   * Execute a sell order
   */
  static async sellShares(
    marketId: string,
    userId: string,
    identityMode: 'true_self' | 'shadow',
    outcome: Outcome,
    shares: number,
  ): Promise<MarketTrade> {
    const market = await this.getMarket(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    if (market.status !== 'open') {
      throw new Error('Market is not open for trading');
    }

    // Check position
    const position = await this.getPosition(marketId, userId, identityMode, outcome);
    if (!position || position.shares < BigInt(shares)) {
      throw new Error('Insufficient shares to sell');
    }

    // Calculate proceeds
    const quote = this.calculateSellQuote(market, outcome, shares);

    // Create trade record
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const trade: MarketTrade = {
      id: tradeId,
      marketId,
      userId,
      identityMode,
      tradeType: 'sell',
      outcome,
      shares: BigInt(shares),
      price: quote.newProbability,
      gratiumAmount: quote.cost,
      probabilityBefore: LMSRCalculator.calculateProbability(
        Number(market.outcomeYesShares),
        Number(market.outcomeNoShares),
        market.liquidityParameter,
      ),
      probabilityAfter: quote.newProbability,
      createdAt: now,
    };

    // Insert trade
    const tradeSql = `
      INSERT INTO market_trades (
        id, market_id, user_id, identity_mode, trade_type, outcome,
        shares, price, gratium_amount, probability_before, probability_after, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await query(tradeSql, [
      tradeId,
      marketId,
      userId,
      identityMode,
      'sell',
      outcome,
      shares,
      quote.newProbability,
      quote.cost,
      trade.probabilityBefore,
      quote.newProbability,
      now,
    ]);

    // Update market state
    const updateMarketSql = `
      UPDATE prediction_markets
      SET
        ${outcome === 'yes' ? 'outcome_yes_shares = outcome_yes_shares - $1' : 'outcome_no_shares = outcome_no_shares - $1'},
        current_probability = $2,
        total_volume = total_volume + $3,
        last_trade_at = $4,
        updated_at = $4
      WHERE id = $5
    `;

    await query(updateMarketSql, [shares, quote.newProbability, quote.cost, now, marketId]);

    // Update position
    await this.updatePosition(marketId, userId, identityMode, outcome, -shares, quote.newProbability);

    return trade;
  }

  /**
   * Get user's position in a market
   */
  static async getPosition(
    marketId: string,
    userId: string,
    identityMode: 'true_self' | 'shadow',
    outcome: Outcome,
  ): Promise<MarketPosition | null> {
    const sql = `
      SELECT * FROM market_positions
      WHERE market_id = $1 AND user_id = $2 AND identity_mode = $3 AND outcome = $4
    `;
    return queryOne<MarketPosition>(sql, [marketId, userId, identityMode, outcome]);
  }

  /**
   * Update position (internal helper)
   */
  private static async updatePosition(
    marketId: string,
    userId: string,
    identityMode: 'true_self' | 'shadow',
    outcome: Outcome,
    sharesChange: number,
    currentPrice: number,
  ): Promise<void> {
    const position = await this.getPosition(marketId, userId, identityMode, outcome);

    if (!position) {
      // Create new position
      const positionId = `pos_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = new Date();

      const insertSql = `
        INSERT INTO market_positions (
          id, market_id, user_id, identity_mode, outcome,
          shares, average_price, invested_gratium, current_value, realized_profit,
          last_trade_at, trades_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      await query(insertSql, [
        positionId,
        marketId,
        userId,
        identityMode,
        outcome,
        sharesChange,
        currentPrice,
        0, // invested will be calculated from trades
        0,
        0,
        now,
        1,
      ]);
    } else {
      // Update existing position
      const newShares = Number(position.shares) + sharesChange;
      const updateSql = `
        UPDATE market_positions
        SET
          shares = $1,
          average_price = $2,
          last_trade_at = $3,
          trades_count = trades_count + 1
        WHERE id = $4
      `;

      const newAvgPrice =
        newShares > 0
          ? (Number(position.shares) * position.averagePrice + sharesChange * currentPrice) / newShares
          : currentPrice;

      await query(updateSql, [newShares, newAvgPrice, new Date(), position.id]);
    }
  }

  /**
   * Resolve a market
   */
  static async resolveMarket(
    marketId: string,
    resolution: MarketResolution,
    source?: string,
  ): Promise<PredictionMarket> {
    const market = await this.getMarket(marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    if (market.status === 'resolved') {
      throw new Error('Market is already resolved');
    }

    const now = new Date();
    const updateSql = `
      UPDATE prediction_markets
      SET
        status = 'resolved',
        resolution = $1,
        resolved_at = $2,
        resolution_source = $3,
        updated_at = $2
      WHERE id = $4
      RETURNING *
    `;

    const result = await queryOne<PredictionMarket>(updateSql, [resolution, now, source, marketId]);

    if (!result) {
      throw new Error('Failed to resolve market');
    }

    return result;
  }

  /**
   * Get market trade history
   */
  static async getTradeHistory(
    marketId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<MarketTrade[]> {
    const sql = `
      SELECT * FROM market_trades
      WHERE market_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query<MarketTrade>(sql, [marketId, limit, offset]);
    return result.rows;
  }

  /**
   * Get current market probabilities
   */
  static getCurrentProbabilities(market: PredictionMarket): {
    yes: number;
    no: number;
  } {
    const qYes = Number(market.outcomeYesShares);
    const qNo = Number(market.outcomeNoShares);
    const liquidity = market.liquidityParameter;

    const pYes = LMSRCalculator.calculateProbability(qYes, qNo, liquidity);

    return {
      yes: pYes,
      no: 1 - pYes,
    };
  }
}

export { LMSRCalculator };
