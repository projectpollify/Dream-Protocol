/**
 * Module 06: Governance - Vote Service
 * Dual voting system (True Self + Shadow) with section assignment
 */

import { query, transaction } from '../utils/database';
import { assignSection, getSectionMultiplier, calculateFinalVoteWeight } from '../utils/section-assignment';
import { applyTimingJitter } from '../utils/timing-jitter';
import {
  GovernanceVote,
  CastVoteRequest,
  IdentityMode,
  VoteOption,
  SectionMultipliers,
  PollStatus,
} from '../types';

// ============================================================================
// Cast Vote
// ============================================================================

/**
 * Casts a vote on a governance poll
 *
 * Steps:
 * 1. Validate poll is active
 * 2. Check user hasn't already voted with this identity
 * 3. Check for active delegation (manual vote overrides)
 * 4. Assign voter to section (deterministic hash)
 * 5. Calculate vote weight with multiplier
 * 6. Apply timing jitter for privacy
 * 7. Record vote in database
 * 8. Update poll vote totals
 *
 * @throws Error if poll closed, already voted, or other validation fails
 */
export async function castVote(
  userId: string,
  voterDid: string,
  request: CastVoteRequest
): Promise<GovernanceVote> {
  return await transaction(async (client) => {
    // Step 1: Get poll details and validate
    const pollResult = await client.query(
      `SELECT * FROM governance_polls WHERE id = $1`,
      [request.pollId]
    );

    if (pollResult.rows.length === 0) {
      throw new Error('Poll not found');
    }

    const poll = pollResult.rows[0];

    if (poll.status !== PollStatus.ACTIVE) {
      throw new Error(`Poll is ${poll.status}, voting not allowed`);
    }

    if (new Date() > new Date(poll.poll_end_at)) {
      throw new Error('Poll voting period has ended');
    }

    // Step 2: Check if user already voted with this identity
    const existingVoteResult = await client.query(
      `SELECT id FROM governance_votes
       WHERE poll_id = $1 AND user_id = $2 AND identity_mode = $3`,
      [request.pollId, userId, request.identityMode]
    );

    if (existingVoteResult.rows.length > 0) {
      throw new Error(
        `You have already voted on this poll as ${request.identityMode}. Use changeVote() to modify your vote.`
      );
    }

    // Step 3: Get user verification status and Light Score
    const userResult = await client.query(
      `SELECT is_verified_human, light_score FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (!user.is_verified_human) {
      throw new Error('Proof of Humanity verification required to vote');
    }

    // Step 4: Assign section (deterministic)
    const assignedSection = assignSection({
      userId,
      pollId: request.pollId,
      pollStartTimestamp: new Date(poll.poll_start_at),
      identityMode: request.identityMode,
    });

    // Step 5: Get section multiplier from poll
    const sectionMultipliers: SectionMultipliers = poll.section_multipliers;
    const sectionMultiplier = getSectionMultiplier(sectionMultipliers, assignedSection);

    // Step 6: Calculate final vote weight
    const baseVoteWeight = 1000; // All votes have equal base weight
    const finalVoteWeight = calculateFinalVoteWeight(baseVoteWeight, sectionMultiplier);

    // Step 7: Apply timing jitter for privacy
    const actualVoteTime = new Date();
    const { displayedVoteTime, timingJitterSeconds } = applyTimingJitter(
      actualVoteTime,
      new Date(poll.poll_end_at)
    );

    // Step 8: Check for delegation (manual vote overrides delegation)
    const delegationResult = await client.query(
      `SELECT id, delegated_to_user_id
       FROM governance_delegations
       WHERE delegating_user_id = $1
         AND delegating_identity_mode = $2
         AND status = 'active'
         AND (delegation_type = 'all_governance' OR
              (delegation_type = 'specific_poll' AND target_poll_id = $3))
         AND (active_until IS NULL OR active_until > NOW())`,
      [userId, request.identityMode, request.pollId]
    );

    const isDelegated = delegationResult.rows.length > 0;

    // Step 9: Insert vote
    const voteResult = await client.query<GovernanceVote>(
      `INSERT INTO governance_votes (
        poll_id,
        user_id,
        identity_mode,
        vote_option,
        voter_did,
        assigned_section,
        section_multiplier,
        base_vote_weight,
        reasoning_text,
        voting_power_delegated_from_user_id,
        is_delegated_vote,
        light_score_at_vote_time,
        is_verified_human,
        actual_vote_time,
        displayed_vote_time,
        timing_jitter_seconds,
        vote_change_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        request.pollId,
        userId,
        request.identityMode,
        request.voteOption,
        voterDid,
        assignedSection,
        sectionMultiplier,
        baseVoteWeight,
        request.reasoning || null,
        null, // Not delegated (manual vote)
        false,
        user.light_score,
        user.is_verified_human,
        actualVoteTime,
        displayedVoteTime,
        timingJitterSeconds,
        0, // Initial vote, no changes yet
      ]
    );

    const vote = voteResult.rows[0];

    // Step 10: Update poll vote totals
    await updatePollVoteTotals(client, request.pollId, request.voteOption, finalVoteWeight, 'add');

    // Step 11: Update unique voter count
    await updateUniqueVoterCount(client, request.pollId);

    return vote;
  });
}

// ============================================================================
// Change Vote
// ============================================================================

/**
 * Changes an existing vote
 *
 * Important:
 * - Section assignment does NOT change (deterministic)
 * - Multiplier stays the same
 * - Only vote option and reasoning can change
 * - New timing jitter applied
 * - Vote change count incremented
 * - Limited to 5 changes per poll
 */
export async function changeVote(
  userId: string,
  pollId: string,
  identityMode: IdentityMode,
  newVoteOption: VoteOption,
  newReasoning?: string
): Promise<GovernanceVote> {
  return await transaction(async (client) => {
    // Get existing vote
    const existingVoteResult = await client.query<GovernanceVote>(
      `SELECT * FROM governance_votes
       WHERE poll_id = $1 AND user_id = $2 AND identity_mode = $3`,
      [pollId, userId, identityMode]
    );

    if (existingVoteResult.rows.length === 0) {
      throw new Error('No existing vote found. Use castVote() to create a new vote.');
    }

    const existingVote = existingVoteResult.rows[0];

    // Check if already at max changes
    if (existingVote.voteChangeCount >= existingVote.maxVoteChanges) {
      throw new Error(
        `Maximum vote changes reached (${existingVote.maxVoteChanges}). Vote is now final.`
      );
    }

    // Check poll is still active
    const pollResult = await client.query(
      `SELECT poll_end_at, status FROM governance_polls WHERE id = $1`,
      [pollId]
    );

    if (pollResult.rows.length === 0) {
      throw new Error('Poll not found');
    }

    const poll = pollResult.rows[0];

    if (poll.status !== PollStatus.ACTIVE) {
      throw new Error('Poll is no longer active, cannot change vote');
    }

    if (new Date() > new Date(poll.poll_end_at)) {
      throw new Error('Voting period has ended, cannot change vote');
    }

    // Generate new timing jitter
    const actualVoteTime = new Date();
    const { displayedVoteTime, timingJitterSeconds } = applyTimingJitter(
      actualVoteTime,
      new Date(poll.poll_end_at)
    );

    // Update vote
    const updatedVoteResult = await client.query<GovernanceVote>(
      `UPDATE governance_votes
       SET vote_option = $1,
           reasoning_text = $2,
           actual_vote_time = $3,
           displayed_vote_time = $4,
           timing_jitter_seconds = $5,
           vote_change_count = vote_change_count + 1,
           updated_at = NOW()
       WHERE poll_id = $6 AND user_id = $7 AND identity_mode = $8
       RETURNING *`,
      [
        newVoteOption,
        newReasoning || null,
        actualVoteTime,
        displayedVoteTime,
        timingJitterSeconds,
        pollId,
        userId,
        identityMode,
      ]
    );

    const updatedVote = updatedVoteResult.rows[0];

    // Update poll vote totals (subtract old, add new)
    await updatePollVoteTotals(
      client,
      pollId,
      existingVote.voteOption,
      existingVote.finalVoteWeight,
      'subtract'
    );
    await updatePollVoteTotals(
      client,
      pollId,
      newVoteOption,
      updatedVote.finalVoteWeight,
      'add'
    );

    return updatedVote;
  });
}

// ============================================================================
// Get User Votes
// ============================================================================

/**
 * Gets both votes (True Self + Shadow) for a user on a specific poll
 */
export async function getUserVotes(
  userId: string,
  pollId: string
): Promise<{ trueSelf?: GovernanceVote; shadow?: GovernanceVote }> {
  const result = await query<GovernanceVote>(
    `SELECT * FROM governance_votes
     WHERE poll_id = $1 AND user_id = $2`,
    [pollId, userId]
  );

  const votes: { trueSelf?: GovernanceVote; shadow?: GovernanceVote } = {};

  for (const vote of result.rows) {
    if (vote.identityMode === IdentityMode.TRUE_SELF) {
      votes.trueSelf = vote;
    } else if (vote.identityMode === IdentityMode.SHADOW) {
      votes.shadow = vote;
    }
  }

  return votes;
}

/**
 * Gets all votes for a poll (for analysis)
 */
export async function getPollVotes(pollId: string): Promise<GovernanceVote[]> {
  const result = await query<GovernanceVote>(
    `SELECT * FROM governance_votes
     WHERE poll_id = $1
     ORDER BY displayed_vote_time ASC`,
    [pollId]
  );

  return result.rows;
}

/**
 * Gets vote breakdown by identity mode
 */
export async function getVoteBreakdown(pollId: string) {
  const result = await query(
    `SELECT
       identity_mode,
       vote_option,
       COUNT(*) as count,
       SUM(final_vote_weight) as weighted_total
     FROM governance_votes
     WHERE poll_id = $1
     GROUP BY identity_mode, vote_option`,
    [pollId]
  );

  return result.rows;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function updatePollVoteTotals(
  client: any,
  pollId: string,
  voteOption: VoteOption,
  voteWeight: number,
  operation: 'add' | 'subtract'
): Promise<void> {
  const modifier = operation === 'add' ? '+' : '-';

  let baseColumn: string;
  let weightedColumn: string | null;

  switch (voteOption) {
    case VoteOption.YES:
      baseColumn = 'total_yes_votes';
      weightedColumn = 'total_yes_weighted';
      break;
    case VoteOption.NO:
      baseColumn = 'total_no_votes';
      weightedColumn = 'total_no_weighted';
      break;
    case VoteOption.ABSTAIN:
      baseColumn = 'total_abstain_votes';
      weightedColumn = null; // Abstains don't get weighted
      break;
    default:
      throw new Error(`Invalid vote option: ${voteOption}`);
  }

  // Update base count
  await client.query(
    `UPDATE governance_polls
     SET ${baseColumn} = ${baseColumn} ${modifier} 1,
         updated_at = NOW()
     WHERE id = $1`,
    [pollId]
  );

  // Update weighted count (if not abstain)
  if (weightedColumn) {
    await client.query(
      `UPDATE governance_polls
       SET ${weightedColumn} = ${weightedColumn} ${modifier} $1
       WHERE id = $2`,
      [voteWeight, pollId]
    );
  }
}

async function updateUniqueVoterCount(client: any, pollId: string): Promise<void> {
  const result = await client.query(
    `SELECT COUNT(DISTINCT (user_id, identity_mode)) as unique_voters
     FROM governance_votes
     WHERE poll_id = $1`,
    [pollId]
  );

  const uniqueVoters = parseInt(result.rows[0].unique_voters, 10);

  await client.query(
    `UPDATE governance_polls
     SET total_unique_voters = $1
     WHERE id = $2`,
    [uniqueVoters, pollId]
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  castVote,
  changeVote,
  getUserVotes,
  getPollVotes,
  getVoteBreakdown,
};
