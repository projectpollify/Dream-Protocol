/**
 * Module 06: Governance - REST API Routes
 * HTTP endpoints for governance functionality
 */

import { Router, Request, Response } from 'express';
import pollService from '../services/poll.service';
import voteService from '../services/vote.service';
import consensusService from '../services/consensus.service';
import delegationService from '../services/delegation.service';
import stakeService from '../services/stake.service';
import rollbackService from '../services/rollback.service';
import parameterService from '../services/parameter.service';
import constitutionalService from '../services/constitutional.service';
import actionService from '../services/action.service';
import { PollStatus, PollType, VoteOption, IdentityMode } from '../types';

const router: Router = Router();

// ============================================================================
// Poll Management Routes
// ============================================================================

/**
 * POST /api/v1/governance/create-poll
 * Creates a new governance poll
 */
router.post('/create-poll', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // From auth middleware
    const { title, description, proposalUrl, pollType, parameterName, parameterProposedValue, durationDays } = req.body;

    const poll = await pollService.createPoll(userId, {
      title,
      description,
      proposalUrl,
      pollType: pollType as PollType,
      parameterName,
      parameterProposedValue,
      durationDays: parseInt(durationDays, 10),
    });

    res.status(201).json({
      success: true,
      poll,
    });
  } catch (error: any) {
    console.error('[Create Poll Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/polls
 * Lists governance polls with filtering
 */
router.get('/polls', async (req: Request, res: Response) => {
  try {
    const { status, pollType, createdByUserId, limit, offset } = req.query;

    const polls = await pollService.listPolls({
      status: status as PollStatus,
      pollType: pollType as PollType,
      createdByUserId: createdByUserId as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      success: true,
      polls,
      count: polls.length,
    });
  } catch (error: any) {
    console.error('[List Polls Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/polls/:pollId
 * Gets detailed poll information including user votes
 */
router.get('/polls/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const { userId } = req.query; // Optional: if user is authenticated

    const poll = await pollService.getPollById(pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        error: 'Poll not found',
      });
    }

    // Get user votes if authenticated
    let userVotes = undefined;
    let userHasVoted = false;

    if (userId) {
      const votes = await voteService.getUserVotes(userId as string, pollId);
      userVotes = {
        trueSelf: votes.trueSelf?.voteOption,
        shadow: votes.shadow?.voteOption,
      };
      userHasVoted = !!votes.trueSelf || !!votes.shadow;
    }

    // Get Shadow Consensus if poll is closed
    let shadowConsensus = undefined;
    if (poll.status === PollStatus.CLOSED || poll.status === PollStatus.APPROVED || poll.status === PollStatus.REJECTED) {
      shadowConsensus = await consensusService.getShadowConsensus(pollId);
    }

    res.json({
      success: true,
      poll,
      userHasVoted,
      userVotes,
      shadowConsensus,
    });
  } catch (error: any) {
    console.error('[Get Poll Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Voting Routes
// ============================================================================

/**
 * POST /api/v1/governance/vote
 * Casts a vote on a governance poll
 */
router.post('/vote', async (req: Request, res: Response) => {
  try {
    const { userId, voterDid } = req.body; // From auth middleware
    const { pollId, identityMode, voteOption, reasoning } = req.body;

    const vote = await voteService.castVote(userId, voterDid, {
      pollId,
      identityMode: identityMode as IdentityMode,
      voteOption: voteOption as VoteOption,
      reasoning,
    });

    res.status(201).json({
      success: true,
      vote: {
        id: vote.id,
        pollId: vote.pollId,
        voterDid: vote.voterDid,
        voteOption: vote.voteOption,
        assignedSection: vote.assignedSection,
        sectionMultiplier: vote.sectionMultiplier,
        displayedVoteTime: vote.displayedVoteTime,
      },
    });
  } catch (error: any) {
    console.error('[Cast Vote Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/governance/vote
 * Changes an existing vote
 */
router.patch('/vote', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // From auth middleware
    const { pollId, identityMode, newVoteOption, newReasoning } = req.body;

    const updatedVote = await voteService.changeVote(
      userId,
      pollId,
      identityMode as IdentityMode,
      newVoteOption as VoteOption,
      newReasoning
    );

    res.json({
      success: true,
      vote: {
        id: updatedVote.id,
        voteOption: updatedVote.voteOption,
        voteChangeCount: updatedVote.voteChangeCount,
        displayedVoteTime: updatedVote.displayedVoteTime,
      },
    });
  } catch (error: any) {
    console.error('[Change Vote Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/votes/:pollId
 * Gets all votes for a poll (for transparency)
 */
router.get('/votes/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const votes = await voteService.getPollVotes(pollId);
    const breakdown = await voteService.getVoteBreakdown(pollId);

    res.json({
      success: true,
      votes: votes.map((v) => ({
        voterDid: v.voterDid,
        voteOption: v.voteOption,
        identityMode: v.identityMode,
        assignedSection: v.assignedSection,
        displayedVoteTime: v.displayedVoteTime,
        reasoning: v.reasoningText,
      })),
      breakdown,
    });
  } catch (error: any) {
    console.error('[Get Votes Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Shadow Consensus Routes
// ============================================================================

/**
 * GET /api/v1/governance/shadow-consensus/:pollId
 * Gets detailed Shadow Consensus analysis
 */
router.get('/shadow-consensus/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const analysis = await consensusService.getDetailedConsensusAnalysis(pollId);

    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('[Shadow Consensus Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/calculate-consensus/:pollId
 * Manually triggers Shadow Consensus calculation
 */
router.post('/calculate-consensus/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const snapshot = await consensusService.calculateShadowConsensus(pollId);

    res.json({
      success: true,
      snapshot,
    });
  } catch (error: any) {
    console.error('[Calculate Consensus Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Delegation Routes
// ============================================================================

/**
 * POST /api/v1/governance/delegate
 * Creates a vote delegation
 */
router.post('/delegate', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // From auth middleware
    const { delegatingIdentityMode, delegatedToUserId, delegationType, activeUntil, reason } = req.body;

    const delegation = await delegationService.createDelegation(userId, {
      delegatingIdentityMode: delegatingIdentityMode as IdentityMode,
      delegatedToUserId,
      delegationType,
      activeUntil: activeUntil ? new Date(activeUntil) : undefined,
      reason,
    });

    res.status(201).json({
      success: true,
      delegation,
    });
  } catch (error: any) {
    console.error('[Create Delegation Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/governance/delegate/:delegationId
 * Revokes a delegation
 */
router.delete('/delegate/:delegationId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // From auth middleware
    const { delegationId } = req.params;

    await delegationService.revokeDelegation(userId, delegationId);

    res.json({
      success: true,
      message: 'Delegation revoked successfully',
    });
  } catch (error: any) {
    console.error('[Revoke Delegation Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/delegations
 * Gets user's delegations
 */
router.get('/delegations', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required',
      });
    }

    const delegations = await delegationService.getUserDelegations(userId as string);

    res.json({
      success: true,
      delegations,
    });
  } catch (error: any) {
    console.error('[Get Delegations Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Statistics Routes
// ============================================================================

/**
 * GET /api/v1/governance/stats/:pollId
 * Gets poll statistics
 */
router.get('/stats/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const stats = await pollService.getPollStatistics(pollId);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[Get Stats Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Gratium Staking Routes
// ============================================================================

/**
 * POST /api/v1/governance/stake
 * Creates a Gratium stake on a poll outcome
 */
router.post('/stake', async (req: Request, res: Response) => {
  try {
    const { userId, voterDid, lightScore } = req.body; // From auth middleware
    const { pollId, identityMode, stakedPosition, gratiumAmount, reasoning } = req.body;

    // Validate stake request
    const validation = stakeService.validateStakeRequest({
      pollId,
      identityMode: identityMode as IdentityMode,
      stakedPosition: stakedPosition as VoteOption,
      gratiumAmount: parseInt(gratiumAmount, 10),
      reasoning,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const stake = await stakeService.createStake(
      userId,
      identityMode as IdentityMode,
      voterDid,
      {
        pollId,
        identityMode: identityMode as IdentityMode,
        stakedPosition: stakedPosition as VoteOption,
        gratiumAmount: parseInt(gratiumAmount, 10),
        reasoning,
      },
      lightScore ? parseFloat(lightScore) : undefined
    );

    res.status(201).json({
      success: true,
      stake: {
        id: stake.id,
        pollId: stake.governancePollId,
        stakedPosition: stake.stakedPosition,
        gratiumAmount: stake.gratiumAmount,
        confidenceLevel: stake.confidenceLevel,
        status: stake.status,
      },
      message: 'Stake created successfully. Tokens locked until poll closes.',
    });
  } catch (error: any) {
    console.error('[Create Stake Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/stake-pool/:pollId
 * Gets stake pool information for a poll
 */
router.get('/stake-pool/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const pool = await stakeService.getStakePool(pollId);

    if (!pool) {
      return res.json({
        success: true,
        pool: null,
        message: 'No stakes on this poll yet',
      });
    }

    res.json({
      success: true,
      pool: {
        totalYesStake: pool.totalYesStake,
        totalNoStake: pool.totalNoStake,
        totalPoolSize: pool.totalPoolSize,
        yesStakersCount: pool.yesStakersCount,
        noStakersCount: pool.noStakersCount,
        totalStakers: pool.totalStakers,
        poolStatus: pool.poolStatus,
        winningPosition: pool.winningPosition,
        averageYesStake: pool.averageYesStake,
        averageNoStake: pool.averageNoStake,
        largestSingleStake: pool.largestSingleStake,
      },
    });
  } catch (error: any) {
    console.error('[Get Stake Pool Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/stakes/:pollId
 * Gets all stakes for a poll (public transparency)
 */
router.get('/stakes/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    const stakes = await stakeService.getPollStakes(pollId);

    res.json({
      success: true,
      stakes: stakes.map((s) => ({
        stakerDid: s.stakerDid,
        stakedPosition: s.stakedPosition,
        gratiumAmount: s.gratiumAmount,
        confidenceLevel: s.confidenceLevel,
        status: s.status,
        reasoning: s.reasoningText,
        createdAt: s.createdAt,
      })),
      count: stakes.length,
    });
  } catch (error: any) {
    console.error('[Get Stakes Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/user-stakes/:pollId
 * Gets user's stakes for a specific poll (both True Self and Shadow)
 */
router.get('/user-stakes/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required',
      });
    }

    const stakes = await stakeService.getUserStakesForPoll(userId as string, pollId);

    res.json({
      success: true,
      stakes: {
        trueSelf: stakes.trueSelf
          ? {
              id: stakes.trueSelf.id,
              stakedPosition: stakes.trueSelf.stakedPosition,
              gratiumAmount: stakes.trueSelf.gratiumAmount,
              status: stakes.trueSelf.status,
              gratiumReward: stakes.trueSelf.gratiumReward,
            }
          : null,
        shadow: stakes.shadow
          ? {
              id: stakes.shadow.id,
              stakedPosition: stakes.shadow.stakedPosition,
              gratiumAmount: stakes.shadow.gratiumAmount,
              status: stakes.shadow.status,
              gratiumReward: stakes.shadow.gratiumReward,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('[Get User Stakes Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/stake-history
 * Gets user's stake history across all polls
 */
router.get('/stake-history', async (req: Request, res: Response) => {
  try {
    const { userId, limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required',
      });
    }

    const history = await stakeService.getUserStakeHistory(
      userId as string,
      limit ? parseInt(limit as string, 10) : 50
    );

    res.json({
      success: true,
      history: history.map((s) => ({
        id: s.id,
        pollId: s.governancePollId,
        stakedPosition: s.stakedPosition,
        gratiumAmount: s.gratiumAmount,
        status: s.status,
        gratiumReward: s.gratiumReward,
        confidenceLevel: s.confidenceLevel,
        createdAt: s.createdAt,
      })),
      count: history.length,
    });
  } catch (error: any) {
    console.error('[Get Stake History Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/calculate-potential-reward
 * Calculates potential reward for a hypothetical stake
 */
router.post('/calculate-potential-reward', async (req: Request, res: Response) => {
  try {
    const { pollId, position, stakeAmount } = req.body;

    const calculation = await stakeService.calculatePotentialReward(
      pollId,
      position as VoteOption,
      parseInt(stakeAmount, 10)
    );

    res.json({
      success: true,
      calculation: {
        currentPool: calculation.currentPool,
        potentialReward: calculation.potentialReward,
        rewardMultiplier: calculation.rewardMultiplier,
        message: `If you stake ${stakeAmount} Gratium on ${position.toUpperCase()} and win, you'll earn ${calculation.potentialReward} Gratium (${calculation.rewardMultiplier}x return)`,
      },
    });
  } catch (error: any) {
    console.error('[Calculate Reward Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Emergency Rollback Routes
// ============================================================================

/**
 * GET /api/v1/governance/rollback/founder-authority
 * Check founder's remaining rollback authority
 */
router.get('/rollback/founder-authority', async (req: Request, res: Response) => {
  try {
    const { founderId } = req.query;

    if (!founderId) {
      return res.status(400).json({
        success: false,
        error: 'founderId required',
      });
    }

    const authority = await rollbackService.checkFounderAuthority(founderId as string);

    res.json({
      success: true,
      authority: {
        hasAuthority: authority.hasAuthority,
        tokensRemaining: authority.tokensRemaining,
        yearsActive: authority.yearsActive,
        authorityPercentage: authority.authorityPercentage,
        message: authority.hasAuthority
          ? `Founder has ${authority.tokensRemaining} rollback tokens remaining (Year ${authority.yearsActive + 1}, ${authority.authorityPercentage}% authority)`
          : `Founder authority expired (Year ${authority.yearsActive + 1} or all tokens used)`,
      },
    });
  } catch (error: any) {
    console.error('[Get Founder Authority Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/rollback/founder-initiate
 * Founder initiates unilateral rollback (uses one token)
 */
router.post('/rollback/founder-initiate', async (req: Request, res: Response) => {
  try {
    const { founderId } = req.body; // From auth middleware
    const { actionId, reason } = req.body;

    if (!actionId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'actionId and reason required',
      });
    }

    const result = await rollbackService.initiateFounderRollback(
      founderId,
      actionId,
      reason
    );

    res.status(201).json({
      success: true,
      rollbackPollId: result.rollbackPollId,
      tokensRemaining: result.tokensRemaining,
      message: `Founder rollback initiated. ${result.tokensRemaining} tokens remaining. Community will vote on rollback poll.`,
    });
  } catch (error: any) {
    console.error('[Founder Rollback Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/rollback/petition
 * Create verified user petition for rollback (requires 100+ users)
 */
router.post('/rollback/petition', async (req: Request, res: Response) => {
  try {
    const { initiatorUserId } = req.body; // From auth middleware
    const { actionId, reason, petitionerUserIds } = req.body;

    if (!actionId || !reason || !petitionerUserIds || !Array.isArray(petitionerUserIds)) {
      return res.status(400).json({
        success: false,
        error: 'actionId, reason, and petitionerUserIds (array) required',
      });
    }

    const result = await rollbackService.createRollbackPetition(
      initiatorUserId,
      actionId,
      reason,
      petitionerUserIds
    );

    res.status(201).json({
      success: true,
      petitionId: result.petitionId,
      petitionersCount: petitionerUserIds.length,
      requiresVote: result.requiresVote,
      message: `Rollback petition created with ${petitionerUserIds.length} verified users. Community will vote on rollback poll.`,
    });
  } catch (error: any) {
    console.error('[Petition Rollback Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/rollback/check-triggers
 * Check if action should trigger automatic rollback
 */
router.post('/rollback/check-triggers', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;

    if (!actionId) {
      return res.status(400).json({
        success: false,
        error: 'actionId required',
      });
    }

    const result = await rollbackService.checkAutomaticTriggers(actionId);

    if (result.shouldRollback) {
      // Initiate automatic rollback
      const rollbackPollId = await rollbackService.initiateAutomaticRollback(
        actionId,
        result.triggers
      );

      res.json({
        success: true,
        shouldRollback: true,
        triggers: result.triggers,
        rollbackPollId,
        message: 'Automatic rollback triggered due to system detection.',
      });
    } else {
      res.json({
        success: true,
        shouldRollback: false,
        triggers: [],
        message: 'No automatic rollback triggers detected.',
      });
    }
  } catch (error: any) {
    console.error('[Check Triggers Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/rollback/status/:actionId
 * Get rollback status for a governance action
 */
router.get('/rollback/status/:actionId', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const status = await rollbackService.getRollbackStatus(actionId);

    res.json({
      success: true,
      status: {
        canRollback: status.canRollback,
        windowExpiresAt: status.windowExpiresAt,
        hoursRemaining: status.hoursRemaining,
        rollbackCount: status.rollbackCount,
        isParameterFrozen: status.isParameterFrozen,
        message: status.canRollback
          ? `Rollback window open for ${status.hoursRemaining} more hours`
          : status.isParameterFrozen
          ? 'Parameter frozen due to excessive rollbacks (3+)'
          : 'Rollback window expired',
      },
    });
  } catch (error: any) {
    console.error('[Get Rollback Status Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/rollback/execute/:pollId
 * Execute approved rollback (revert parameter)
 */
router.post('/rollback/execute/:pollId', async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;

    await rollbackService.executeRollback(pollId);

    res.json({
      success: true,
      message: 'Rollback executed successfully. Parameter reverted to previous value.',
    });
  } catch (error: any) {
    console.error('[Execute Rollback Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Parameter Whitelist Routes
// ============================================================================

/**
 * GET /api/v1/governance/parameters
 * List all voteable parameters with optional filtering
 */
router.get('/parameters', async (req: Request, res: Response) => {
  try {
    const { category, voteableOnly } = req.query;

    const parameters = await parameterService.getAllParameters({
      category: category as any,
      voteableOnly: voteableOnly === 'true',
    });

    res.json({
      success: true,
      parameters,
      count: parameters.length,
    });
  } catch (error: any) {
    console.error('[Get Parameters Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/parameters/:parameterName
 * Get details for a specific parameter including validation rules
 */
router.get('/parameters/:parameterName', async (req: Request, res: Response) => {
  try {
    const { parameterName } = req.params;

    const parameter = await parameterService.getParameterByName(parameterName);

    if (!parameter) {
      return res.status(404).json({
        success: false,
        error: `Parameter '${parameterName}' not found in whitelist`,
      });
    }

    res.json({
      success: true,
      parameter,
    });
  } catch (error: any) {
    console.error('[Get Parameter Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/parameters/validate
 * Validate a proposed parameter value before creating a poll
 */
router.post('/parameters/validate', async (req: Request, res: Response) => {
  try {
    const { parameterName, proposedValue } = req.body;

    if (!parameterName || proposedValue === undefined || proposedValue === null) {
      return res.status(400).json({
        success: false,
        error: 'parameterName and proposedValue are required',
      });
    }

    const validation = await parameterService.validateParameterValue(
      parameterName,
      String(proposedValue)
    );

    res.json({
      success: true,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  } catch (error: any) {
    console.error('[Validate Parameter Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/parameters/:parameterName/history
 * Get voting history for a specific parameter
 */
router.get('/parameters/:parameterName/history', async (req: Request, res: Response) => {
  try {
    const { parameterName } = req.params;

    const history = await parameterService.getParameterVotingHistory(parameterName);

    res.json({
      success: true,
      parameterName,
      history,
      totalVotes: history.length,
    });
  } catch (error: any) {
    console.error('[Get Parameter History Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Constitutional Articles Routes
// ============================================================================

/**
 * GET /api/v1/governance/constitution
 * Get all constitutional articles (protected rules)
 */
router.get('/constitution', async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;

    const articles = await constitutionalService.getAllArticles(
      activeOnly !== 'false'
    );

    res.json({
      success: true,
      articles,
      count: articles.length,
      message: 'These rules are protected and cannot be changed via simple governance votes',
    });
  } catch (error: any) {
    console.error('[Get Constitution Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/constitution/:articleNumber
 * Get specific constitutional article by number
 */
router.get('/constitution/:articleNumber', async (req: Request, res: Response) => {
  try {
    const { articleNumber } = req.params;

    const article = await constitutionalService.getArticleByNumber(
      parseInt(articleNumber, 10)
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        error: `Constitutional Article ${articleNumber} not found`,
      });
    }

    res.json({
      success: true,
      article,
    });
  } catch (error: any) {
    console.error('[Get Article Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/constitution/validate-poll
 * Validate if a proposed poll violates the constitution
 */
router.post('/constitution/validate-poll', async (req: Request, res: Response) => {
  try {
    const { pollType, parameterName, proposedValue, description } = req.body;

    if (!pollType) {
      return res.status(400).json({
        success: false,
        error: 'pollType is required',
      });
    }

    const validation = await constitutionalService.validatePollAgainstConstitution(
      pollType as PollType,
      parameterName,
      proposedValue,
      description
    );

    if (validation.violatesConstitution) {
      return res.status(403).json({
        success: false,
        violatesConstitution: true,
        violations: validation.violatedArticles,
        message: 'This poll violates constitutional protections and cannot be created',
      });
    }

    res.json({
      success: true,
      violatesConstitution: false,
      message: 'Poll does not violate constitutional protections',
    });
  } catch (error: any) {
    console.error('[Validate Poll Against Constitution Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Governance Action Execution Routes
// ============================================================================

/**
 * GET /api/v1/governance/actions
 * List all pending/scheduled governance actions
 */
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const actions = await actionService.getPendingActions();

    res.json({
      success: true,
      actions,
      count: actions.length,
    });
  } catch (error: any) {
    console.error('[Get Actions Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/actions/:actionId
 * Get specific action details
 */
router.get('/actions/:actionId', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const action = await actionService.getActionById(actionId);

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    res.json({
      success: true,
      action,
    });
  } catch (error: any) {
    console.error('[Get Action Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/actions/:actionId/execute
 * Manually execute a pending action
 */
router.post('/actions/:actionId/execute', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    const result = await actionService.executeAction(actionId);

    res.json({
      success: true,
      result,
      message: 'Action executed successfully',
    });
  } catch (error: any) {
    console.error('[Execute Action Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/actions/:actionId/cancel
 * Cancel a scheduled action
 */
router.post('/actions/:actionId/cancel', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;

    await actionService.cancelAction(actionId);

    res.json({
      success: true,
      message: 'Action cancelled successfully',
    });
  } catch (error: any) {
    console.error('[Cancel Action Error]', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/actions/process-scheduled
 * Process all due scheduled actions (cron job endpoint)
 */
router.post('/actions/process-scheduled', async (req: Request, res: Response) => {
  try {
    const result = await actionService.processScheduledActions();

    res.json({
      success: true,
      executed: result.executed,
      failed: result.failed,
      errors: result.errors,
      message: `Processed ${result.executed + result.failed} scheduled actions`,
    });
  } catch (error: any) {
    console.error('[Process Scheduled Actions Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Health Check
// ============================================================================

router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'governance',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Export
// ============================================================================

export default router;
