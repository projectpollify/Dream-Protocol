/**
 * Data Migration Service
 * Handles batch migration of data from legacy MVP to Dream Protocol
 */

import { db, legacyDb } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import {
  MigrationResult,
  MigrationStats,
  ValidationResult,
  LegacyUser,
  LegacyPost,
  LegacyPoll,
  LegacyPollOption,
  LegacyVote,
  LegacyChamber,
  LegacyChamberMember,
} from '../types/bridge.types';

class DataMigrationService {
  /**
   * Main migration entry point
   * Called as background job
   */
  async migrateAllData(): Promise<MigrationResult> {
    const batchId = uuidv4();
    const startTime = Date.now();

    const result: MigrationResult = {
      batchId,
      success: true,
      entitiesMigrated: {},
      errors: [],
      startTime,
      endTime: 0,
      totalDuration: 0,
    };

    console.log(`[Migration] Starting batch migration: ${batchId}`);

    try {
      // Migrate in order (dependencies first)
      console.log('[Migration] Step 1/5: Migrating users...');
      result.entitiesMigrated['users'] = await this.migrateUsers(batchId);

      console.log('[Migration] Step 2/5: Migrating chambers...');
      result.entitiesMigrated['chambers'] = await this.migrateChambers(batchId);

      console.log('[Migration] Step 3/5: Migrating posts...');
      result.entitiesMigrated['posts'] = await this.migratePosts(batchId);

      console.log('[Migration] Step 4/5: Migrating polls...');
      result.entitiesMigrated['polls'] = await this.migratePolls(batchId);

      console.log('[Migration] Step 5/5: Migrating votes...');
      result.entitiesMigrated['votes'] = await this.migrateVotes(batchId);

      console.log('[Migration] All migrations completed successfully!');
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      console.error('[Migration] Migration failed:', error);
    }

    result.endTime = Date.now();
    result.totalDuration = result.endTime - startTime;

    // Log final result
    await this.logMigrationResult(result);

    console.log(
      `[Migration] Batch ${batchId} completed in ${result.totalDuration}ms`
    );
    console.log(`[Migration] Summary:`, result.entitiesMigrated);

    return result;
  }

  /**
   * Migrate users from MVP to new system
   */
  private async migrateUsers(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get all users from legacy system
      const legacyUsers = await legacyDb.query<LegacyUser>(
        `SELECT * FROM users_legacy ORDER BY id`
      );

      stats.total = legacyUsers.rows.length;
      console.log(`[Migration] Found ${stats.total} users to migrate`);

      for (const legacyUser of legacyUsers.rows) {
        try {
          // Check if already migrated
          const existing = await db.query(
            `SELECT new_user_id FROM user_migration_tracking WHERE legacy_user_id = $1`,
            [legacyUser.id]
          );

          if (existing.rows.length > 0) {
            console.log(`[Migration] User ${legacyUser.id} already migrated, skipping`);
            stats.success++;
            continue;
          }

          // Create new user with transformed data
          const newUserId = uuidv4();

          await db.query(
            `INSERT INTO users
             (id, email, username, password_hash, display_name,
              avatar_url, bio, has_dual_identity, current_identity_mode, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              newUserId,
              legacyUser.email,
              legacyUser.username,
              legacyUser.password_hash, // Keep same hash for now
              legacyUser.display_name || legacyUser.username,
              legacyUser.avatar_url,
              legacyUser.bio,
              false, // Will be set to true when identity created
              'true_self', // Default mode
              legacyUser.created_at,
              legacyUser.updated_at,
            ]
          );

          // Track migration
          await db.query(
            `INSERT INTO migration_status
             (legacy_system_id, new_system_id, entity_type, status, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyUser.id, newUserId, 'user', 'success', batchId]
          );

          // Track in user migration table
          await db.query(
            `INSERT INTO user_migration_tracking
             (legacy_user_id, new_user_id, migration_status, migrated_at)
             VALUES ($1, $2, $3, NOW())`,
            [legacyUser.id, newUserId, 'completed']
          );

          stats.success++;
        } catch (error: any) {
          stats.failed++;
          const errorMsg = `User ${legacyUser.id}: ${error.message}`;
          stats.errors.push(errorMsg);

          await db.query(
            `INSERT INTO migration_status
             (legacy_system_id, entity_type, status, error_message, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyUser.id, 'user', 'failed', error.message, batchId]
          );

          console.error(`[Migration] ${errorMsg}`);
        }
      }
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`User migration batch failed: ${error.message}`);
      console.error('[Migration] User batch failed:', error);
    }

    return stats;
  }

  /**
   * Migrate chambers
   */
  private async migrateChambers(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const legacyChambers = await legacyDb.query<LegacyChamber>(
        `SELECT * FROM chambers_legacy ORDER BY id`
      );

      stats.total = legacyChambers.rows.length;
      console.log(`[Migration] Found ${stats.total} chambers to migrate`);

      for (const legacyChamber of legacyChambers.rows) {
        try {
          // Get the migrated user ID for creator
          const creatorMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking
             WHERE legacy_user_id = $1`,
            [legacyChamber.created_by]
          );

          if (creatorMapping.rows.length === 0) {
            throw new Error(`Creator user ${legacyChamber.created_by} not migrated`);
          }

          const newChamberId = uuidv4();
          const creatorId = creatorMapping.rows[0].new_user_id;

          await db.query(
            `INSERT INTO chambers
             (id, name, description, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              newChamberId,
              legacyChamber.name,
              legacyChamber.description,
              creatorId,
              legacyChamber.created_at,
            ]
          );

          // Migrate chamber members
          const members = await legacyDb.query<LegacyChamberMember>(
            `SELECT user_id FROM chamber_members_legacy WHERE chamber_id = $1`,
            [legacyChamber.id]
          );

          for (const member of members.rows) {
            const memberMapping = await db.query(
              `SELECT new_user_id FROM user_migration_tracking
               WHERE legacy_user_id = $1`,
              [member.user_id]
            );

            if (memberMapping.rows.length > 0) {
              await db.query(
                `INSERT INTO chamber_members (chamber_id, user_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [newChamberId, memberMapping.rows[0].new_user_id]
              );
            }
          }

          await db.query(
            `INSERT INTO migration_status
             (legacy_system_id, new_system_id, entity_type, status, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyChamber.id, newChamberId, 'chamber', 'success', batchId]
          );

          stats.success++;
        } catch (error: any) {
          stats.failed++;
          const errorMsg = `Chamber ${legacyChamber.id}: ${error.message}`;
          stats.errors.push(errorMsg);
          console.error(`[Migration] ${errorMsg}`);
        }
      }
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Chamber migration batch failed: ${error.message}`);
      console.error('[Migration] Chamber batch failed:', error);
    }

    return stats;
  }

  /**
   * Migrate posts
   */
  private async migratePosts(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const legacyPosts = await legacyDb.query<LegacyPost>(
        `SELECT * FROM posts_legacy ORDER BY id`
      );

      stats.total = legacyPosts.rows.length;
      console.log(`[Migration] Found ${stats.total} posts to migrate`);

      for (const legacyPost of legacyPosts.rows) {
        try {
          // Get migrated user
          const userMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking WHERE legacy_user_id = $1`,
            [legacyPost.user_id]
          );

          if (userMapping.rows.length === 0) {
            throw new Error(`User ${legacyPost.user_id} not migrated`);
          }

          const newPostId = uuidv4();
          await db.query(
            `INSERT INTO posts
             (id, user_id, content, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              newPostId,
              userMapping.rows[0].new_user_id,
              legacyPost.content,
              legacyPost.created_at,
              legacyPost.updated_at,
            ]
          );

          await db.query(
            `INSERT INTO migration_status
             (legacy_system_id, new_system_id, entity_type, status, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyPost.id, newPostId, 'post', 'success', batchId]
          );

          stats.success++;
        } catch (error: any) {
          stats.failed++;
          const errorMsg = `Post ${legacyPost.id}: ${error.message}`;
          stats.errors.push(errorMsg);
          console.error(`[Migration] ${errorMsg}`);
        }
      }
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Post migration failed: ${error.message}`);
      console.error('[Migration] Post batch failed:', error);
    }

    return stats;
  }

  /**
   * Migrate polls and options
   */
  private async migratePolls(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const legacyPolls = await legacyDb.query<LegacyPoll>(
        `SELECT * FROM polls_legacy ORDER BY id`
      );

      stats.total = legacyPolls.rows.length;
      console.log(`[Migration] Found ${stats.total} polls to migrate`);

      for (const legacyPoll of legacyPolls.rows) {
        try {
          // Get migrated user
          const userMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking WHERE legacy_user_id = $1`,
            [legacyPoll.user_id]
          );

          if (userMapping.rows.length === 0) {
            throw new Error(`User ${legacyPoll.user_id} not migrated`);
          }

          const newPollId = uuidv4();
          await db.query(
            `INSERT INTO polls
             (id, user_id, title, description, poll_type, created_at, closed_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              newPollId,
              userMapping.rows[0].new_user_id,
              legacyPoll.title,
              legacyPoll.description,
              legacyPoll.poll_type,
              legacyPoll.created_at,
              legacyPoll.closed_at,
              legacyPoll.updated_at,
            ]
          );

          // Migrate poll options
          const options = await legacyDb.query<LegacyPollOption>(
            `SELECT * FROM poll_options_legacy WHERE poll_id = $1`,
            [legacyPoll.id]
          );

          for (const option of options.rows) {
            const newOptionId = uuidv4();
            await db.query(
              `INSERT INTO poll_options (id, poll_id, option_text, created_at)
               VALUES ($1, $2, $3, $4)`,
              [newOptionId, newPollId, option.option_text, option.created_at]
            );
          }

          await db.query(
            `INSERT INTO migration_status
             (legacy_system_id, new_system_id, entity_type, status, migration_batch_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [legacyPoll.id, newPollId, 'poll', 'success', batchId]
          );

          stats.success++;
        } catch (error: any) {
          stats.failed++;
          const errorMsg = `Poll ${legacyPoll.id}: ${error.message}`;
          stats.errors.push(errorMsg);
          console.error(`[Migration] ${errorMsg}`);
        }
      }
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Poll migration failed: ${error.message}`);
      console.error('[Migration] Poll batch failed:', error);
    }

    return stats;
  }

  /**
   * Migrate votes
   * NOTE: This is complex because votes now need dual-identity mapping
   */
  private async migrateVotes(batchId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const legacyVotes = await legacyDb.query<LegacyVote>(
        `SELECT * FROM votes_legacy ORDER BY id`
      );

      stats.total = legacyVotes.rows.length;
      console.log(`[Migration] Found ${stats.total} votes to migrate`);

      for (const legacyVote of legacyVotes.rows) {
        try {
          // Get user mapping
          const userMapping = await db.query(
            `SELECT new_user_id FROM user_migration_tracking WHERE legacy_user_id = $1`,
            [legacyVote.user_id]
          );

          if (userMapping.rows.length === 0) continue;

          // Get poll mapping
          const pollMapping = await db.query(
            `SELECT new_system_id FROM migration_status
             WHERE entity_type = 'poll' AND legacy_system_id = $1`,
            [legacyVote.poll_id]
          );

          if (pollMapping.rows.length === 0) continue;

          // All migrated votes start as true_self (we don't know which were shadow)
          const newVoteId = uuidv4();
          await db.query(
            `INSERT INTO votes
             (id, user_id, poll_id, option_id, identity_mode, weight, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              newVoteId,
              userMapping.rows[0].new_user_id,
              pollMapping.rows[0].new_system_id,
              null, // Will need option mapping logic
              'true_self', // Default: assume true self
              legacyVote.weight || 1.0,
              legacyVote.created_at,
            ]
          );

          stats.success++;
        } catch (error: any) {
          stats.failed++;
          const errorMsg = `Vote ${legacyVote.id}: ${error.message}`;
          stats.errors.push(errorMsg);
          console.error(`[Migration] ${errorMsg}`);
        }
      }
    } catch (error: any) {
      stats.failed = stats.total;
      stats.errors.push(`Vote migration failed: ${error.message}`);
      console.error('[Migration] Vote batch failed:', error);
    }

    return stats;
  }

  /**
   * Validate migrated data
   */
  async validateMigration(batchId: string): Promise<ValidationResult> {
    const validation: ValidationResult = {
      passed: true,
      checks: {},
      errors: [],
    };

    console.log(`[Migration] Validating batch: ${batchId}`);

    try {
      // Check user counts match
      const legacyUserCount = await legacyDb.query(
        `SELECT COUNT(*) as count FROM users_legacy`
      );
      const migratedUserCount = await db.query(
        `SELECT COUNT(*) as count FROM migration_status
         WHERE entity_type = 'user' AND migration_batch_id = $1 AND status = 'success'`,
        [batchId]
      );

      validation.checks['user_count_match'] =
        legacyUserCount.rows[0].count === migratedUserCount.rows[0].count;

      if (!validation.checks['user_count_match']) {
        validation.passed = false;
        validation.errors?.push(
          `User count mismatch: legacy=${legacyUserCount.rows[0].count}, migrated=${migratedUserCount.rows[0].count}`
        );
      }

      // Check for failed migrations
      const failedMigrations = await db.query(
        `SELECT COUNT(*) as count FROM migration_status
         WHERE migration_batch_id = $1 AND status = 'failed'`,
        [batchId]
      );

      validation.checks['no_failed_migrations'] =
        parseInt(failedMigrations.rows[0].count) === 0;

      if (!validation.checks['no_failed_migrations']) {
        validation.passed = false;
        validation.errors?.push(
          `Found ${failedMigrations.rows[0].count} failed migrations`
        );
      }

      console.log('[Migration] Validation result:', validation);
    } catch (error: any) {
      validation.passed = false;
      validation.errors?.push(`Validation error: ${error.message}`);
      console.error('[Migration] Validation failed:', error);
    }

    return validation;
  }

  /**
   * Rollback migration if needed
   */
  async rollbackMigration(batchId: string): Promise<void> {
    console.warn('[Migration] ROLLBACK INITIATED for batch:', batchId);

    try {
      // Get all migrations from this batch
      const migrations = await db.query(
        `SELECT new_system_id, entity_type FROM migration_status
         WHERE migration_batch_id = $1 AND status = 'success'
         ORDER BY created_at DESC`, // Reverse order
        [batchId]
      );

      console.log(`[Migration] Rolling back ${migrations.rows.length} entities`);

      // Delete in reverse order of creation
      for (const row of migrations.rows) {
        try {
          if (row.entity_type === 'user') {
            await db.query(`DELETE FROM users WHERE id = $1`, [row.new_system_id]);
          } else if (row.entity_type === 'chamber') {
            await db.query(`DELETE FROM chambers WHERE id = $1`, [row.new_system_id]);
          } else if (row.entity_type === 'post') {
            await db.query(`DELETE FROM posts WHERE id = $1`, [row.new_system_id]);
          } else if (row.entity_type === 'poll') {
            await db.query(`DELETE FROM polls WHERE id = $1`, [row.new_system_id]);
          } else if (row.entity_type === 'vote') {
            await db.query(`DELETE FROM votes WHERE id = $1`, [row.new_system_id]);
          }
        } catch (error: any) {
          console.error(`[Migration] Error rolling back ${row.entity_type}:`, error);
        }
      }

      // Mark as rolled back
      await db.query(
        `UPDATE migration_status SET status = 'rolled_back', updated_at = NOW()
         WHERE migration_batch_id = $1`,
        [batchId]
      );

      console.log('[Migration] Rollback completed');
    } catch (error) {
      console.error('[Migration] Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Log migration result to database
   */
  private async logMigrationResult(result: MigrationResult): Promise<void> {
    try {
      await db.query(
        `INSERT INTO migration_logs
         (entity_type, action, success, details, duration_ms, initiated_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'migration_batch',
          'batch_complete',
          result.success,
          JSON.stringify(result),
          result.totalDuration,
          'system',
        ]
      );
    } catch (error) {
      console.error('[Migration] Failed to log result:', error);
    }
  }
}

export const dataMigrationService = new DataMigrationService();
