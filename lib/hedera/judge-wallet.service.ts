/**
 * Judge Wallet Service
 * Creates and manages Hedera wallets for judges to receive payments
 */

import {
  Client,
  AccountCreateTransaction,
  PrivateKey,
  Hbar,
  AccountId,
} from '@hashgraph/sdk'
import { config } from '../../server/config/index.js'
import CryptoJS from 'crypto-js'

class HederaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HederaError'
  }
}

function encryptAES(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString()
}


export interface JudgeWalletInfo {
  accountId: string
  evmAddress: string
  publicKey: string
  privateKeyEncrypted: string
  initialBalance: number
}

export class JudgeWalletService {
  private client: Client
  private operatorId: AccountId
  private operatorKey: PrivateKey

  constructor() {
    try {
      this.operatorId = AccountId.fromString(config.hedera.accountId)

      // Remove 0x prefix if present
      const privateKeyStr = config.hedera.privateKey.replace(/^0x/, '')

      // Default to ECDSA for operator key
      try {
        this.operatorKey = PrivateKey.fromStringECDSA(privateKeyStr)
      } catch {
        // Fallback to ED25519 if ECDSA fails
        this.operatorKey = PrivateKey.fromStringED25519(privateKeyStr)
      }

      this.client = Client.forName(config.hedera.network).setOperator(
        this.operatorId,
        this.operatorKey
      )

      console.log('Judge Wallet Service initialized', {
        network: config.hedera.network,
        operatorId: this.operatorId.toString(),
      })
    } catch (error) {
      console.error('Failed to initialize Judge Wallet Service', error)
      throw new HederaError('Failed to initialize Judge Wallet Service')
    }
  }

  /**
   * Create a new Hedera account for a judge to receive payments
   */
  async createJudgeWallet(
    initialBalance: number = 0
  ): Promise<JudgeWalletInfo> {
    try {
      console.log('Creating judge wallet', { initialBalance })

      // Generate new ECDSA key pair for the judge (enables EVM compatibility)
      const newPrivateKey = PrivateKey.generateECDSA()
      const newPublicKey = newPrivateKey.publicKey

      // Create new account with ECDSA key and alias
      const transaction = new AccountCreateTransaction()
        .setKey(newPublicKey)
        .setInitialBalance(new Hbar(initialBalance))

      const response = await transaction.execute(this.client)
      const receipt = await response.getReceipt(this.client)

      const newAccountId = receipt.accountId
      if (!newAccountId) {
        throw new HederaError('Failed to create judge account - no account ID returned')
      }

      // Get EVM address directly from public key
      const evmAddress = `0x${newPublicKey.toEvmAddress()}`

      // Encrypt private key for storage
      const encryptionKey = process.env.ENCRYPTION_KEY || config.hedera.privateKey
      const privateKeyEncrypted = encryptAES(
        newPrivateKey.toString(),
        encryptionKey
      )

      const walletInfo: JudgeWalletInfo = {
        accountId: newAccountId.toString(),
        evmAddress,
        publicKey: newPublicKey.toString(),
        privateKeyEncrypted,
        initialBalance,
      }

      console.log('Judge wallet created successfully', {
        accountId: walletInfo.accountId,
        evmAddress: walletInfo.evmAddress,
      })

      return walletInfo
    } catch (error) {
      console.error('Failed to create judge wallet', error)
      throw new HederaError('Failed to create judge wallet')
    }
  }

  /**
   * Convert Hedera Account ID to EVM address
   * Formula: 0x + pad(shard, 8) + pad(realm, 16) + pad(num, 16)
   */
  private accountIdToEvmAddress(accountId: string): string {
    try {
      const parts = accountId.split('.')
      if (parts.length !== 3) {
        throw new Error(`Invalid account ID format: ${accountId}`)
      }

      const shard = parseInt(parts[0])
      const realm = parseInt(parts[1])
      const num = parseInt(parts[2])

      if (isNaN(shard) || isNaN(realm) || isNaN(num)) {
        throw new Error(`Invalid account ID: ${accountId}`)
      }

      // Convert to hex and pad
      const shardHex = shard.toString(16).padStart(8, '0')
      const realmHex = realm.toString(16).padStart(16, '0')
      const numHex = num.toString(16).padStart(16, '0')

      return `0x${shardHex}${realmHex}${numHex}`
    } catch (error) {
      console.error('Failed to convert account ID to EVM address', error, {
        accountId,
      })
      throw new HederaError(`Failed to convert account ID: ${accountId}`)
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<number> {
    try {
      const account = AccountId.fromString(accountId)
      const balance = await this.client.getAccountBalance(account)
      return balance.hbars.toTinybars().toNumber() / 100000000 // Convert to HBAR
    } catch (error) {
      console.error('Failed to get account balance', error, { accountId })
      throw new HederaError(`Failed to get balance for account: ${accountId}`)
    }
  }

  /**
   * Close the client
   */
  async close(): Promise<void> {
    try {
      await this.client.close()
      console.log('Judge Wallet Service closed')
    } catch (error) {
      console.error('Failed to close Judge Wallet Service', error)
    }
  }
}

// Singleton instance
let judgeWalletService: JudgeWalletService | null = null

export function getJudgeWalletService(): JudgeWalletService {
  if (!judgeWalletService) {
    judgeWalletService = new JudgeWalletService()
  }
  return judgeWalletService
}

export function resetJudgeWalletService(): void {
  judgeWalletService = null
}
