/**
 * Module 06: Governance - TypeScript Types
 * Dream Protocol - Dual-Mode Democratic Decision-Making Engine
 */

// ============================================================================
// Enums
// ============================================================================

export enum PollType {
  PARAMETER_VOTE = 'parameter_vote',
  CONSTITUTIONAL = 'constitutional',
  EMERGENCY_ROLLBACK = 'emergency_rollback',
  GOVERNANCE_FEATURE = 'governance_feature',
  GENERAL_COMMUNITY = 'general_community'
}

export enum PollStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CLOSED = 'closed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  ROLLED_BACK = 'rolled_back',
  DISPUTED = 'disputed'
}

export enum VoteOption {
  YES = 'yes',
  NO = 'no',
  ABSTAIN = 'abstain'
}

export enum IdentityMode {
  TRUE_SELF = 'true_self',
  SHADOW = 'shadow'
}

export enum DelegationType {
  ALL_GOVERNANCE = 'all_governance',
  PARAMETER_VOTES_ONLY = 'parameter_votes_only',
  SPECIFIC_POLL = 'specific_poll'
}

export enum DelegationStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PAUSED = 'paused'
}

export enum ParameterCategory {
  ECONOMIC_ACCESSIBILITY = 'economic_accessibility',
  FEATURE_ACCESS = 'feature_access',
  SYSTEM_PARAMETERS = 'system_parameters',
  REWARD_DISTRIBUTION = 'reward_distribution',
  GOVERNANCE_RULES = 'governance_rules'
}

export enum ValueType {
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  TEXT = 'text'
}

export enum GovernanceActionType {
  PARAMETER_UPDATE = 'parameter_update',
  FEATURE_TOGGLE = 'feature_toggle',
  REWARD_ADJUSTMENT = 'reward_adjustment',
  EMERGENCY_ROLLBACK = 'emergency_rollback',
  CUSTOM_ACTION = 'custom_action'
}

export enum ActionStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export enum StakeStatus {
  ACTIVE = 'active',
  WON = 'won',
  LOST = 'lost',
  REFUNDED = 'refunded',
  SLASHED = 'slashed'
}

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export enum PoolStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  DISTRIBUTED = 'distributed',
  REFUNDED = 'refunded'
}

export enum RollbackInitiationType {
  FOUNDER_UNILATERAL = 'founder_unilateral',
  VERIFIED_USER_PETITION = 'verified_user_petition',
  AUTOMATIC_TRIGGER = 'automatic_trigger'
}

export enum QuorumEnforcement {
  ABSOLUTE = 'absolute',
  PERCENTAGE = 'percentage',
  EITHER = 'either'
}

// ============================================================================
// Section Multipliers
// ============================================================================

export interface SectionMultipliers {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
  '6': number;
  '7': number;
}

// ============================================================================
// Governance Poll
// ============================================================================

export interface GovernancePoll {
  id: string;
  title: string;
  description: string;
  proposalUrl?: string;
  pollType: PollType;

  // Parameter voting
  parameterName?: string;
  parameterCurrentValue?: string;
  parameterProposedValue?: string;
  parameterMinValue?: string;
  parameterMaxValue?: string;
  parameterInWhitelist: boolean;

  // Voting details
  pollStartAt: Date;
  pollEndAt: Date;
  pollDurationMinutes: number;

  totalYesVotes: number;
  totalNoVotes: number;
  totalAbstainVotes: number;

  totalYesWeighted: number;
  totalNoWeighted: number;

  sectionMultipliers: SectionMultipliers;

  // Shadow Consensus
  shadowConsensusPercentage?: number;
  consensusConfidenceInterval?: number;
  publicVsPrivateGap?: number;

  // Status
  status: PollStatus;

  finalYesPercentage?: number;
  finalNoPercentage?: number;
  approvalRequiredPercentage: number;

  // Quorum
  minimumVoteQuorum: number;
  quorumAsPercentageOfVerified: number;
  quorumMet: boolean;
  totalUniqueVoters: number;

  // Governance action
  governanceActionId?: string;
  executeImmediately: boolean;
  executeAt?: Date;

  // Metadata
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;

  // Blockchain
  arweaveTxId?: string;
  cardanoTxHash?: string;
}

// ============================================================================
// Governance Vote
// ============================================================================

export interface GovernanceVote {
  id: string;
  pollId: string;
  userId: string;
  identityMode: IdentityMode;

  voteOption: VoteOption;
  voterDid: string;

  // Section assignment
  assignedSection: number;
  sectionMultiplier: number;

  baseVoteWeight: number;
  finalVoteWeight: number;

  reasoningText?: string;

  // Delegation
  votingPowerDelegatedFromUserId?: string;
  isDelegatedVote: boolean;

  // Metadata
  lightScoreAtVoteTime?: number;
  isVerifiedHuman?: boolean;
  ipAddress?: string;

  // Privacy
  actualVoteTime: Date;
  displayedVoteTime: Date;
  timingJitterSeconds: number;

  // Vote changes
  voteChangeCount: number;
  maxVoteChanges: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Governance Delegation
// ============================================================================

export interface GovernanceDelegation {
  id: string;

  delegatingUserId: string;
  delegatingIdentityMode: IdentityMode;

  delegatedToUserId: string;
  delegatedToIdentityMode: IdentityMode;

  delegationType: DelegationType;
  targetPollId?: string;

  activeFrom: Date;
  activeUntil?: Date;

  status: DelegationStatus;

  reasonText?: string;
  isRevocable: boolean;
  revokedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Parameter Whitelist
// ============================================================================

export interface ParameterWhitelist {
  id: string;

  parameterName: string;
  parameterCategory: ParameterCategory;

  valueType: ValueType;
  minValue?: string;
  maxValue?: string;
  defaultValue: string;
  currentValue: string;

  description: string;
  rationale?: string;

  requiresSuperMajority: boolean;
  minimumVoteDurationDays: number;
  maximumVoteDurationDays: number;
  requiresVerificationToVote: boolean;

  minimumVoteQuorum: number;
  quorumPercentageOfVerified: number;
  quorumEnforcement: QuorumEnforcement;

  isVoteable: boolean;
  isEmergencyParameter: boolean;

  lastVotedOn?: Date;
  timesVotedOn: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Constitutional Article
// ============================================================================

export interface ConstitutionalArticle {
  id: string;

  articleNumber: number;
  articleTitle: string;

  protectedRule: string;
  rationale?: string;

  examplesOfViolations?: string;

  amendmentRequiresFounderApproval: boolean;
  amendmentRequires90PercentApproval: boolean;
  amendmentMinimumDiscussionDays: number;

  status: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Governance Action
// ============================================================================

export interface GovernanceAction {
  id: string;

  governancePollId?: string;
  actionType: GovernanceActionType;

  parameterName?: string;
  oldValue?: string;
  newValue?: string;

  status: ActionStatus;

  scheduledAt?: Date;
  executedAt?: Date;

  // Rollback
  isRollbackOfActionId?: string;
  canBeRolledBack: boolean;
  rollbackWindowHours: number;
  rollbackWindowExpiresAt?: Date;
  rollbackCountForParameter: number;
  parameterFrozenUntil?: Date;

  rollbackInitiatedByUserId?: string;
  rollbackInitiationType?: RollbackInitiationType;
  founderRollbackTokensRemaining?: number;

  executionNotes?: string;
  errorMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Shadow Consensus Snapshot
// ============================================================================

export interface ShadowConsensusSnapshot {
  id: string;
  governancePollId: string;

  trueSelfYesCount: number;
  trueSelfNoCount: number;
  trueSelfAbstainCount: number;

  shadowYesCount: number;
  shadowNoCount: number;
  shadowAbstainCount: number;

  trueSelfYesPercentage: number;
  shadowYesPercentage: number;

  publicVsPrivateGapPercentage: number;
  gapInterpretation?: string;

  confidenceIntervalPlusMinus: number;
  sampleSize: number;

  trendDirection?: string;
  notablePatterns?: string;

  recordedAt: Date;
}

// ============================================================================
// Governance Stake
// ============================================================================

export interface GovernanceStake {
  id: string;

  governancePollId: string;
  userId: string;
  identityMode: IdentityMode;

  stakerDid: string;

  stakedPosition: VoteOption;
  gratiumAmount: number;

  status: StakeStatus;

  rewardMultiplier: number;
  gratiumReward: number;
  rewardPaidAt?: Date;

  confidenceLevel: ConfidenceLevel;

  reasoningText?: string;
  lightScoreAtStakeTime?: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Governance Stake Pool
// ============================================================================

export interface GovernanceStakePool {
  id: string;
  governancePollId: string;

  totalYesStake: number;
  totalNoStake: number;
  totalPoolSize: number;

  yesStakersCount: number;
  noStakersCount: number;
  totalStakers: number;

  poolStatus: PoolStatus;

  winningPosition?: VoteOption;
  totalRewardsDistributed: number;
  distributionCompletedAt?: Date;

  averageYesStake?: number;
  averageNoStake?: number;
  largestSingleStake?: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

export interface CreatePollRequest {
  title: string;
  description: string;
  proposalUrl?: string;
  pollType: PollType;
  parameterName?: string;
  parameterProposedValue?: string;
  durationDays: number;
}

export interface CastVoteRequest {
  pollId: string;
  identityMode: IdentityMode;
  voteOption: VoteOption;
  reasoning?: string;
}

export interface CreateDelegationRequest {
  delegatingIdentityMode: IdentityMode;
  delegatedToUserId: string;
  delegationType: DelegationType;
  activeUntil?: Date;
  reason?: string;
}

export interface CreateStakeRequest {
  pollId: string;
  identityMode: IdentityMode;
  stakedPosition: VoteOption;
  gratiumAmount: number;
  reasoning?: string;
}

export interface InitiateRollbackRequest {
  governanceActionId: string;
  reason: string;
  initiationType: RollbackInitiationType;
}

// ============================================================================
// Response Types
// ============================================================================

export interface PollDetailsResponse extends GovernancePoll {
  userHasVoted: boolean;
  userVotes?: {
    trueSelf?: VoteOption;
    shadow?: VoteOption;
  };
  stakePool?: GovernanceStakePool;
  shadowConsensus?: ShadowConsensusSnapshot;
}

export interface ShadowConsensusResponse {
  pollId: string;
  pollTitle: string;

  trueSelfBreakdown: {
    yesCount: number;
    noCount: number;
    abstainCount: number;
    yesPercentage: number;
  };

  shadowBreakdown: {
    yesCount: number;
    noCount: number;
    abstainCount: number;
    yesPercentage: number;
  };

  gapAnalysis: {
    gapPercentage: number;
    gapInterpretation: string;
    likelyCause?: string;
  };

  demographicAnalysis?: {
    byLightScore: Array<{
      lightScoreRange: string;
      gap: number;
    }>;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PollFilters {
  status?: PollStatus;
  pollType?: PollType;
  createdByUserId?: string;
  limit?: number;
  offset?: number;
}

export interface VoteStatistics {
  totalVotes: number;
  yesPercentage: number;
  noPercentage: number;
  abstainPercentage: number;
  quorumMet: boolean;
  consensusGap?: number;
}

export interface SectionAssignmentInput {
  userId: string;
  pollId: string;
  pollStartTimestamp: Date;
  identityMode: IdentityMode;
}

export interface ConfidenceInterval {
  percentage: number;
  plusMinus: number;
  sampleSize: number;
}
