/**
 * Module 09: Verification - Type Definitions
 * Multi-layer trust discovery system
 */

export type IdentityMode = 'true_self' | 'shadow';

// ============================================================================
// PROOF OF HUMANITY TYPES
// ============================================================================

export type VerificationStatus = 'pending' | 'verified' | 'expired' | 'failed';
export type VerificationMethod = 'captcha' | 'email' | 'phone' | 'worldcoin' | 'vouching' | 'economic';
export type PoHLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface PoHScores {
  behavioral: number; // 0-1
  biometric: number; // 0-1
  social: number; // 0-1
  temporal: number; // 0-1
  economic: number; // 0-1
}

export interface ProofOfHumanity {
  id: string;
  userId: string;
  identityMode: IdentityMode;
  level: PoHLevel;
  status: VerificationStatus;
  scores: PoHScores;
  methodsCompleted: VerificationMethod[];
  lastVerified: Date | null;
  nextReverification: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoHSession {
  sessionId: string;
  userId: string;
  identityMode: IdentityMode;
  requiredMethods: VerificationMethod[];
  completedMethods: VerificationMethod[];
  expiresAt: Date;
  score: number;
}

export interface VerificationResult {
  success: boolean;
  score: number;
  newLevel?: PoHLevel;
  nextSteps?: string[];
  error?: string;
}

export interface PoHStatus {
  level: PoHLevel;
  status: VerificationStatus;
  scores: PoHScores;
  expiresAt: Date | null;
  canVote: boolean;
  canStake: boolean;
  canCreateMarkets: boolean;
}

// ============================================================================
// VERACITY BOND TYPES
// ============================================================================

export type BondStatus = 'active' | 'resolved_truthful' | 'resolved_false' | 'expired' | 'challenged';
export type BondType = 'claim' | 'post' | 'comment' | 'prediction';
export type ResolutionOutcome = 'truthful' | 'false' | 'inconclusive';

export interface VeracityBond {
  id: string;
  userId: string;
  identityMode: IdentityMode;
  bondType: BondType;
  targetId: string;
  targetType: string;
  gratiumAmount: bigint;
  status: BondStatus;
  claimText?: string;
  confidenceLevel: number; // 1-10
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  resolvedAt: Date | null;
  slashedAmount: bigint;
}

export interface BondChallenge {
  id: string;
  bondId: string;
  challengerId: string;
  challengeAmount: bigint;
  challengeReason: string;
  evidence: Record<string, any>;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface BondResolution {
  bondId: string;
  outcome: ResolutionOutcome;
  evidence: Record<string, any>;
  slashedAmount: bigint;
  distributedTo: string[];
}

// ============================================================================
// PREDICTION MARKET TYPES
// ============================================================================

export type MarketStatus = 'open' | 'closed' | 'resolved' | 'cancelled';
export type MarketResolution = 'yes' | 'no' | 'invalid';
export type TradeType = 'buy' | 'sell';
export type Outcome = 'yes' | 'no';

export interface PredictionMarket {
  id: string;
  creatorId: string;
  question: string;
  description: string;
  category?: string;
  liquidityParameter: number; // 'b' in LMSR formula
  initialProbability: number;
  currentProbability: number;
  outcomeYesShares: bigint;
  outcomeNoShares: bigint;
  status: MarketStatus;
  resolution: MarketResolution | null;
  resolvedAt: Date | null;
  resolutionSource?: string;
  totalVolume: bigint;
  uniqueTraders: number;
  lastTradeAt: Date | null;
  opensAt: Date;
  closesAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketPosition {
  id: string;
  marketId: string;
  userId: string;
  identityMode: IdentityMode;
  outcome: Outcome;
  shares: bigint;
  averagePrice: number;
  investedGratium: bigint;
  currentValue: bigint;
  realizedProfit: bigint;
  lastTradeAt: Date;
  tradesCount: number;
}

export interface MarketTrade {
  id: string;
  marketId: string;
  userId: string;
  identityMode: IdentityMode;
  tradeType: TradeType;
  outcome: Outcome;
  shares: bigint;
  price: number;
  gratiumAmount: bigint;
  probabilityBefore: number;
  probabilityAfter: number;
  createdAt: Date;
}

export interface MarketQuote {
  cost: bigint;
  newProbability: number;
  priceImpact: number;
}

export interface PriceHistory {
  timestamp: Date;
  probability: number;
  volume: bigint;
}

// ============================================================================
// EPISTEMIC SCORING TYPES
// ============================================================================

export type EpistemicLayer = 'surface' | 'contextual' | 'analytical' | 'synthesis' | 'meta';
export type ScoreTarget = 'user' | 'post' | 'comment' | 'claim' | 'market';

export interface LayerScore {
  layer: EpistemicLayer;
  score: number; // 0-100
  factors: Record<string, number>;
  weight: number;
}

export interface LayerScores {
  surface: number;
  contextual: number;
  analytical: number;
  synthesis: number;
  meta: number;
}

export interface EpistemicScore {
  id: string;
  targetType: ScoreTarget;
  targetId: string;
  surfaceScore: number;
  contextualScore: number;
  analyticalScore: number;
  synthesisScore: number;
  metaScore: number;
  finalScore: number;
  confidence: number;
  factors: Record<string, any>;
  calculatedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpistemicFactor {
  id: string;
  scoreId: string;
  layer: EpistemicLayer;
  factorType: string;
  value: number;
  weight: number;
  evidence: Record<string, any>;
}

export interface ScoreChange {
  layer: EpistemicLayer;
  oldScore: number;
  newScore: number;
  delta: number;
}

// ============================================================================
// CONTENT NFT TYPES
// ============================================================================

export type ContentType = 'post' | 'comment' | 'analysis' | 'prediction';
export type CertificationLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ContentNFT {
  id: string;
  contentType: ContentType;
  contentId: string;
  creatorId: string;
  tokenId?: string;
  metadataUri?: string;
  certificationLevel: CertificationLevel;
  minted: boolean;
  mintedAt: Date | null;
  mintTransactionHash?: string;
  epistemicScoreId?: string;
  minimumScoreRequired: number;
  cosmofluxLocked: bigint;
  tradingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NFTMetadata {
  name: string;
  description: string;
  contentType: ContentType;
  contentId: string;
  creatorId: string;
  certificationLevel: CertificationLevel;
  epistemicScore: number;
  createdAt: Date;
  uri?: string;
}

export interface CertificationRequirements {
  level: CertificationLevel;
  minimumScore: number;
  cost: number;
}

// ============================================================================
// THALYRA AI TYPES
// ============================================================================

export type ThreatType = 'manipulation' | 'coordination' | 'misinformation' | 'spam' | 'impersonation';
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AutoAction = 'flag' | 'hide' | 'freeze' | 'alert_admin' | 'none';
export type ReviewOutcome = 'confirmed' | 'false_positive' | 'inconclusive';

export interface ThalyraDetection {
  id: string;
  threatType: ThreatType;
  severity: ThreatSeverity;
  confidence: number; // 0-1
  targetType?: string;
  targetId?: string;
  detectionData: Record<string, any>;
  patternsDetected: string[];
  affectedUsers: string[];
  autoActionTaken: AutoAction;
  manualReviewRequired: boolean;
  reviewedAt: Date | null;
  reviewedBy?: string;
  reviewOutcome?: ReviewOutcome;
  detectedAt: Date;
  heartbeatCycle: number;
  createdAt: Date;
}

export interface ThreatAssessment {
  threatType: ThreatType;
  severity: ThreatSeverity;
  confidence: number;
  evidence: string[];
  recommendations: string[];
  immediateActions: AutoAction[];
}

export interface CoordinationPattern {
  pattern: string;
  users: string[];
  activity: Record<string, any>;
  severity: ThreatSeverity;
}

export interface ManipulationSignal {
  signal: string;
  confidence: number;
  evidence: Record<string, any>;
}

export interface MisinformationScore {
  score: number; // 0-1
  category: string;
  confidence: number;
  evidence: string[];
}

export interface ThreatReport {
  totalThreats: number;
  byType: Record<ThreatType, number>;
  bySeverity: Record<ThreatSeverity, number>;
  falsePositiveRate: number;
}

export interface ThreatSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  pendingReview: number;
  averageConfidence: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePoHSessionRequest {
  userId: string;
  identityMode: IdentityMode;
}

export interface SubmitVerificationRequest {
  sessionId: string;
  method: VerificationMethod;
  data: Record<string, any>;
}

export interface CreateBondRequest {
  targetType: string;
  targetId: string;
  amount: bigint;
  claimText?: string;
  confidence: number;
}

export interface ChallengeBondRequest {
  amount: bigint;
  reason: string;
  evidence?: Record<string, any>;
}

export interface ResolveBondRequest {
  truthful: boolean;
  evidence: Record<string, any>;
}

export interface CreateMarketRequest {
  question: string;
  description: string;
  liquidityParameter: number;
  closesAt: Date;
  category?: string;
}

export interface BuySharesRequest {
  outcome: Outcome;
  maxCost: bigint;
}

export interface SellSharesRequest {
  outcome: Outcome;
  shares: bigint;
}

export interface ResolveMarketRequest {
  outcome: MarketResolution;
  source: string;
}

export interface AnalyzeTargetRequest {
  targetType: string;
  targetId: string;
}

export interface ReviewDetectionRequest {
  outcome: ReviewOutcome;
  notes?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface VerificationConfig {
  poh: {
    verificationMethods: VerificationMethod[];
    levelRequirements: Record<PoHLevel, VerificationMethod[]>;
    reverificationDays: number;
    sessionTimeout: number;
  };
  bonds: {
    minimumAmount: bigint;
    maximumAmount: bigint;
    defaultDuration: number;
    slashingPercentage: number;
    challengeWindow: number;
  };
  markets: {
    defaultLiquidity: number;
    minimumLiquidity: number;
    maximumLiquidity: number;
    minimumTradingPeriod: number;
    maximumTradingPeriod: number;
    creationCost: number;
  };
  epistemic: {
    layerWeights: Record<EpistemicLayer, number>;
    scoreDecayDays: number;
    minimumConfidence: number;
    cacheTimeout: number;
  };
  nft: {
    certificationLevels: Record<CertificationLevel, { minScore: number; cost: number }>;
    metadataStandard: string;
    storageProvider: string;
  };
  thalyra: {
    heartbeatInterval: number;
    threatThresholds: Record<ThreatSeverity, number>;
    autoActionThreshold: number;
    batchSize: number;
    mlModelVersion: string;
  };
}
