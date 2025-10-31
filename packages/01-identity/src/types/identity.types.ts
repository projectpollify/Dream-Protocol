/**
 * Identity mode enumeration
 */
export enum IdentityMode {
  TRUE_SELF = 'true_self',
  SHADOW = 'shadow'
}

/**
 * Wallet status enumeration
 */
export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

/**
 * Session status enumeration
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  LOGGED_OUT = 'logged_out'
}

/**
 * Dual wallet entity
 */
export interface DualWallet {
  id: string;
  userId: string;
  mode: IdentityMode;
  cardanoAddress: string;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptionSalt: string;
  encryptionIv: string;
  did: string;
  status: WalletStatus;
  verified: boolean;
  createdAt: Date;
  lastAccessed?: Date;
  accessedCount: number;
}

/**
 * DID Document (W3C Standard)
 */
export interface DIDDocument {
  '@context': string;
  id: string;
  publicKey: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
  created?: string;
  updated?: string;
}

/**
 * Decentralized Identifier entity
 */
export interface DecentralizedIdentifier {
  id: string;
  userId: string;
  walletId: string;
  did: string;
  didDocument: DIDDocument;
  resolvable: boolean;
  resolverEndpoint?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dual identity creation result
 */
export interface DualIdentity {
  userId: string;
  trueIdentity: {
    did: string;
    cardanoAddress: string;
    mode: IdentityMode.TRUE_SELF;
    walletId: string;
  };
  shadowIdentity: {
    did: string;
    cardanoAddress: string;
    mode: IdentityMode.SHADOW;
    walletId: string;
  };
  createdAt: Date;
}

/**
 * Current identity response
 */
export interface CurrentIdentity {
  mode: IdentityMode;
  did: string;
  cardanoAddress: string;
  walletId: string;
}

/**
 * Cardano wallet generation result
 */
export interface CardanoWalletGeneration {
  mnemonic: string;
  cardanoAddress: string;
  publicKey: string;
  privateKey: string;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  authTag: string;
}

/**
 * Identity Error
 */
export class IdentityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
