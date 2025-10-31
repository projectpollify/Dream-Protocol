import crypto from 'crypto';
import { db } from '../utils/database';
import { cardanoService } from './cardano.service';
import { encrypt, encryptWithMasterKey, hashIPAddress, generateToken } from '../utils/encryption';
import {
  DualIdentity,
  CurrentIdentity,
  IdentityMode,
  DIDDocument,
  IdentityError
} from '../types/identity.types';

/**
 * Identity Service
 * Handles dual-identity creation, management, and switching
 */
export class IdentityService {
  /**
   * Create dual identities for a new user
   */
  async createDualIdentity(
    userId: string,
    userPassword: string,
    ipAddress?: string
  ): Promise<DualIdentity> {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Step 1: Generate True Self wallet
      console.log('Generating True Self wallet...');
      const trueWallet = await cardanoService.generateWallet();

      // Step 2: Generate Shadow wallet
      console.log('Generating Shadow wallet...');
      const shadowWallet = await cardanoService.generateWallet();

      // Step 3: Generate DIDs
      const trueDID = `did:agoranet:${userId}_true_self`;
      const shadowDID = `did:agoranet:${userId}_shadow`;

      // Step 4: Encrypt private keys with user password
      const truePrivateKeyEncrypted = await encrypt(trueWallet.privateKey, userPassword);
      const shadowPrivateKeyEncrypted = await encrypt(shadowWallet.privateKey, userPassword);

      // Step 5: Insert True Self wallet
      const trueWalletResult = await client.query(
        `INSERT INTO dual_wallets
         (user_id, mode, cardano_address, public_key, encrypted_private_key,
          encryption_salt, encryption_iv, did, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          userId,
          'true_self',
          trueWallet.cardanoAddress,
          trueWallet.publicKey,
          truePrivateKeyEncrypted.ciphertext,
          truePrivateKeyEncrypted.salt,
          truePrivateKeyEncrypted.iv,
          trueDID,
          true
        ]
      );

      const trueWalletId = trueWalletResult.rows[0].id;

      // Step 6: Insert Shadow wallet
      const shadowWalletResult = await client.query(
        `INSERT INTO dual_wallets
         (user_id, mode, cardano_address, public_key, encrypted_private_key,
          encryption_salt, encryption_iv, did, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          userId,
          'shadow',
          shadowWallet.cardanoAddress,
          shadowWallet.publicKey,
          shadowPrivateKeyEncrypted.ciphertext,
          shadowPrivateKeyEncrypted.salt,
          shadowPrivateKeyEncrypted.iv,
          shadowDID,
          true
        ]
      );

      const shadowWalletId = shadowWalletResult.rows[0].id;

      // Step 7: Create DID documents
      const trueDIDDoc = this.generateDIDDocument(trueWallet.publicKey, userId, 'true_self');
      const shadowDIDDoc = this.generateDIDDocument(shadowWallet.publicKey, userId, 'shadow');

      await client.query(
        `INSERT INTO decentralized_identifiers (user_id, wallet_id, did, did_document)
         VALUES ($1, $2, $3, $4)`,
        [userId, trueWalletId, trueDID, JSON.stringify(trueDIDDoc)]
      );

      await client.query(
        `INSERT INTO decentralized_identifiers (user_id, wallet_id, did, did_document)
         VALUES ($1, $2, $3, $4)`,
        [userId, shadowWalletId, shadowDID, JSON.stringify(shadowDIDDoc)]
      );

      // Step 8: Create DualityToken (secret linkage)
      const creationProof = {
        timestamp: new Date().toISOString(),
        ipAddressHash: ipAddress ? hashIPAddress(ipAddress) : null,
        deviceFingerprint: crypto.randomBytes(16).toString('hex')
      };

      const trueMasterEncrypted = await encryptWithMasterKey(trueWallet.privateKey);
      const shadowMasterEncrypted = await encryptWithMasterKey(shadowWallet.privateKey);

      await client.query(
        `INSERT INTO duality_tokens
         (user_id, true_self_private_key_encrypted, shadow_private_key_encrypted,
          master_key_id, creation_proof)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          trueMasterEncrypted,
          shadowMasterEncrypted,
          process.env.MASTER_KEY_ID || 'mk_v1_dev',
          JSON.stringify(creationProof)
        ]
      );

      // Step 9: Initialize UTXO pools
      await client.query(
        `INSERT INTO utxo_pools (user_id, wallet_id, mode, utxo_data)
         VALUES ($1, $2, $3, $4)`,
        [userId, trueWalletId, 'true_self', JSON.stringify({ utxos: [], totalUnspent: 0 })]
      );

      await client.query(
        `INSERT INTO utxo_pools (user_id, wallet_id, mode, utxo_data)
         VALUES ($1, $2, $3, $4)`,
        [userId, shadowWalletId, 'shadow', JSON.stringify({ utxos: [], totalUnspent: 0 })]
      );

      // Step 10: Update user record
      await client.query(
        `UPDATE users
         SET has_dual_identity = true,
             identity_created_at = NOW(),
             current_identity_mode = 'true_self'
         WHERE id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      console.log(`Dual identity created for user ${userId}`);

      return {
        userId,
        trueIdentity: {
          did: trueDID,
          cardanoAddress: trueWallet.cardanoAddress,
          mode: IdentityMode.TRUE_SELF,
          walletId: trueWalletId
        },
        shadowIdentity: {
          did: shadowDID,
          cardanoAddress: shadowWallet.cardanoAddress,
          mode: IdentityMode.SHADOW,
          walletId: shadowWalletId
        },
        createdAt: new Date()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create dual identity:', error);
      throw new IdentityError(
        'Failed to create dual identity',
        'DUAL_IDENTITY_CREATE_FAILED',
        500,
        { userId, error: error.message }
      );
    } finally {
      client.release();
    }
  }

  /**
   * Switch active identity mode
   */
  async switchIdentityMode(
    userId: string,
    targetMode: IdentityMode,
    sessionId: string
  ): Promise<void> {
    try {
      // Verify user has both identities
      const identities = await db.query(
        `SELECT mode FROM dual_wallets WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (identities.rows.length !== 2) {
        throw new IdentityError(
          'User does not have dual identity set up',
          'DUAL_IDENTITY_NOT_FOUND',
          404,
          { userId }
        );
      }

      // Update user's current mode
      await db.query(
        `UPDATE users
         SET current_identity_mode = $1, last_identity_switch = NOW()
         WHERE id = $2`,
        [targetMode, userId]
      );

      // Update session
      await db.query(
        `UPDATE identity_sessions
         SET active_identity_mode = $1, last_activity = NOW()
         WHERE id = $2`,
        [targetMode, sessionId]
      );

      // Log the switch
      await db.query(
        `INSERT INTO identity_mode_history (user_id, to_mode, session_id, switched_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, targetMode, sessionId]
      );

      console.log(`User ${userId} switched to ${targetMode}`);
    } catch (error) {
      console.error('Failed to switch identity mode:', error);
      throw error;
    }
  }

  /**
   * Get current active identity
   */
  async getCurrentIdentity(userId: string): Promise<CurrentIdentity> {
    try {
      const result = await db.query(
        `SELECT u.current_identity_mode as mode, dw.did, dw.cardano_address, dw.id as wallet_id
         FROM users u
         JOIN dual_wallets dw ON dw.user_id = u.id
         WHERE u.id = $1
           AND dw.mode = COALESCE(u.current_identity_mode, 'true_self')
           AND dw.status = 'active'`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new IdentityError(
          'Identity not found',
          'IDENTITY_NOT_FOUND',
          404,
          { userId }
        );
      }

      const row = result.rows[0];
      return {
        mode: row.mode as IdentityMode,
        did: row.did,
        cardanoAddress: row.cardano_address,
        walletId: row.wallet_id
      };
    } catch (error) {
      console.error('Failed to get current identity:', error);
      throw error;
    }
  }

  /**
   * Create identity session
   */
  async createIdentitySession(
    userId: string,
    mode: IdentityMode,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; sessionToken: string; expiresAt: Date }> {
    try {
      const sessionToken = generateToken(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const result = await db.query(
        `INSERT INTO identity_sessions
         (user_id, session_token, active_identity_mode, ip_address_hash,
          user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          userId,
          sessionToken,
          mode,
          ipAddress ? hashIPAddress(ipAddress) : null,
          userAgent,
          expiresAt
        ]
      );

      return {
        sessionId: result.rows[0].id,
        sessionToken,
        expiresAt
      };
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new IdentityError(
        'Failed to create session',
        'SESSION_CREATE_FAILED',
        500,
        { userId, error: error.message }
      );
    }
  }

  /**
   * Generate DID Document (W3C Standard)
   */
  private generateDIDDocument(publicKey: string, userId: string, mode: string): DIDDocument {
    const did = `did:agoranet:${userId}_${mode}`;

    return {
      '@context': 'https://www.w3.org/ns/did/v1',
      id: did,
      publicKey: [
        {
          id: `${did}#key-1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase: publicKey
        }
      ],
      authentication: [`${did}#key-1`],
      assertionMethod: [`${did}#key-1`],
      created: new Date().toISOString()
    };
  }
}

export const identityService = new IdentityService();
