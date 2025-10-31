import * as Cardano from '@cardano-sdk/core';
import { CardanoWalletGeneration } from '../types/identity.types';

/**
 * Cardano Wallet Service
 * Handles wallet generation and Cardano blockchain interactions
 */
export class CardanoService {
  /**
   * Generates a new Cardano wallet with mnemonic
   */
  async generateWallet(): Promise<CardanoWalletGeneration> {
    try {
      // Generate 24-word mnemonic
      const mnemonic = Cardano.util.generateMnemonicWords();
      const mnemonicString = mnemonic.join(' ');

      // Derive keys from mnemonic
      const rootKey = await Cardano.util.createRootKeyFromMnemonic(mnemonicString);

      // Derive account key (path: m/1852'/1815'/0')
      const accountKey = rootKey
        .derive(Cardano.util.harden(1852)) // Purpose: Shelley era
        .derive(Cardano.util.harden(1815)) // Coin type: ADA
        .derive(Cardano.util.harden(0));   // Account: 0

      // Derive first address (path: m/1852'/1815'/0'/0/0)
      const addressKey = accountKey
        .derive(0) // External chain
        .derive(0); // Address index

      const publicKey = addressKey.toPublic();
      const privateKey = addressKey.toRawKey();

      // Generate payment address (testnet for now)
      const networkId = process.env.CARDANO_NETWORK === 'mainnet'
        ? Cardano.NetworkId.Mainnet
        : Cardano.NetworkId.Testnet;

      const paymentCredential = Cardano.PaymentCredential.fromPublicKey(publicKey);
      const address = Cardano.EnterpriseAddress.fromCredentials(networkId, paymentCredential);

      return {
        mnemonic: mnemonicString,
        cardanoAddress: address.toBech32(),
        publicKey: publicKey.hex(),
        privateKey: privateKey.hex()
      };
    } catch (error) {
      throw new Error(`Failed to generate Cardano wallet: ${error.message}`);
    }
  }

  /**
   * Validates a Cardano address
   */
  isValidAddress(address: string): boolean {
    try {
      Cardano.Address.fromBech32(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets current network (testnet or mainnet)
   */
  getNetwork(): string {
    return process.env.CARDANO_NETWORK || 'testnet';
  }
}

const cardanoService = new CardanoService();

export default cardanoService;
