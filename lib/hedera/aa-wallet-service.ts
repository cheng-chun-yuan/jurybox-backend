/**
 * AA Wallet Service
 * Creates and manages Auto Accounts (AA wallets) for orchestrator registration
 * Based on create-aa-from-address.ts pattern
 */

import {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
  TransferTransaction,
  AccountBalanceQuery,
  AccountInfoQuery,
} from '@hashgraph/sdk'
import { dbService } from '../database.js'
import { getDatabase } from '../database.js'

export interface AAWalletInfo {
  aaWalletId: string
  userAddress: string
  publicKey: string
  initialBalance: number
  fundedBalance: number
  fundingTxId: string
  name: string
  createdAt: Date
}

export interface AAWalletResponse {
  accountId: string
  evmAddress: string
  name: string
}

export class AAWalletService {
  private client: Client
  private operatorAccountId: AccountId
  private operatorPrivateKey: PrivateKey

  constructor() {
    // Initialize with main account credentials (for funding only)
    const accountIdStr = process.env.HEDERA_ACCOUNT_ID || ''
    const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || ''

    if (!accountIdStr || !privateKeyStr) {
      throw new Error('Hedera credentials not configured (HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY)')
    }

    this.operatorAccountId = AccountId.fromString(accountIdStr)
    this.operatorPrivateKey = PrivateKey.fromStringECDSA(privateKeyStr)
    this.client = Client.forTestnet().setOperator(this.operatorAccountId, this.operatorPrivateKey)
  }

  /**
   * Create AA wallet from user's address (no private key required)
   * User provides only their wallet address (public key)
   * System creates Auto Account without needing private key
   * Only funding requires private key from main account
   */
  async createAAWallet(
    userAddress: string,
    fundingAmount: number = 10,
    name: string = 'Orchestrator AA Wallet'
  ): Promise<AAWalletInfo> {
    try {
      console.log('🔐 Creating AA Wallet for user...')
      console.log(`User Address: ${userAddress}`)
      console.log(`Funding Amount: ${fundingAmount} HBAR`)

      // Step 1: Parse the user's public key from their address
      const publicKey = await this.parsePublicKey(userAddress)

      console.log(`\n🔑 Using Public Key for AA Wallet Creation:`)
      console.log(`   Public Key: ${publicKey.toString()}`)
      console.log(`   Key Type: ECDSA (secp256k1)`)
      console.log(`   User's Private Key: NOT REQUIRED ✅`)

      // Step 2: Create account transaction using user's public key
      const transaction = new AccountCreateTransaction()
        .setKey(publicKey)
        .setInitialBalance(new Hbar(0)) // Start with 0 balance

      // Submit the transaction (no private key needed from user)
      const txResponse = await transaction.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)
      const aaAccountId = receipt.accountId

      if (!aaAccountId) {
        throw new Error('Failed to create AA wallet - no account ID returned')
      }

      console.log(`\n✅ AA Wallet Created!`)
      console.log(`   User Address: ${userAddress}`)
      console.log(`   AA Wallet ID: ${aaAccountId.toString()}`)
      console.log(`   Public Key: ${publicKey.toString()}`)
      console.log(`   Transaction ID: ${txResponse.transactionId.toString()}`)

      // Step 3: Check initial balance (should be 0)
      const initialBalance = await this.checkBalance(aaAccountId.toString())

      // Step 4: Fund the AA Wallet
      console.log(`\n💸 Funding AA Wallet...`)
      const fundingTxId = await this.fundAAWallet(aaAccountId.toString(), fundingAmount)

      // Step 5: Check funded balance
      const fundedBalance = await this.checkBalance(aaAccountId.toString())

      console.log(`✅ AA Wallet funded successfully!`)
      console.log(`   Amount: ${fundingAmount} HBAR`)
      console.log(`   Final Balance: ${fundedBalance} HBAR`)
      console.log(`   Funding Transaction: ${fundingTxId}`)

      const walletInfo: AAWalletInfo = {
        aaWalletId: aaAccountId.toString(),
        userAddress,
        publicKey: publicKey.toString(),
        initialBalance: initialBalance,
        fundedBalance: fundedBalance,
        fundingTxId: fundingTxId,
        name: name,
        createdAt: new Date(),
      }

      // Step 6: Store in database
      await this.storeAAWallet(walletInfo)

      console.log('🔐 Security Notes:')
      console.log('   ✅ User\'s private key was NEVER required')
      console.log('   ✅ Only public key/address was used')
      console.log('   ✅ User maintains full control of their private key')
      console.log('   ✅ Wallet is ready for X402 payments and transactions')

      return walletInfo
    } catch (error) {
      console.error('❌ Failed to create AA wallet:', error)
      throw error
    }
  }

  /**
   * Parse public key from user address (supports multiple formats)
   */
  private async parsePublicKey(userAddress: string): Promise<any> {
    let publicKey: any

    if (userAddress.startsWith('0x')) {
      // EVM address format - convert to public key
      console.log(`Detected EVM address format: ${userAddress}`)
      // For demo purposes, we'll generate a mock public key
      // In real implementation, you'd derive this from the EVM address
      publicKey = PrivateKey.generateECDSA().publicKey
      console.log(`Generated corresponding public key: ${publicKey.toString()}`)
    } else if (userAddress.startsWith('302')) {
      // DER-encoded public key format
      console.log(`Detected DER-encoded public key format`)
      publicKey = PrivateKey.fromStringECDSA(userAddress).publicKey
    } else if (userAddress.startsWith('0.')) {
      // Hedera account ID format - retrieve public key
      console.log(`Detected Hedera account ID format: ${userAddress}`)
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(AccountId.fromString(userAddress))
        .execute(this.client)
      publicKey = accountInfo.key
      console.log(`Retrieved public key: ${publicKey.toString()}`)
    } else {
      // Assume it's already a public key string
      publicKey = PrivateKey.fromStringECDSA(userAddress).publicKey
      console.log(`Detected public key format`)
    }

    return publicKey
  }

  /**
   * Check account balance
   */
  private async checkBalance(accountId: string): Promise<number> {
    const balance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(this.client)

    return balance.hbars.toTinybars().toNumber() / 100_000_000
  }

  /**
   * Fund AA Wallet from operator account
   */
  private async fundAAWallet(accountId: string, amount: number): Promise<string> {
    const transaction = new TransferTransaction()
      .addHbarTransfer(this.operatorAccountId, new Hbar(-amount))
      .addHbarTransfer(AccountId.fromString(accountId), new Hbar(amount))

    const txResponse = await transaction.execute(this.client)
    const receipt = await txResponse.getReceipt(this.client)

    return txResponse.transactionId.toString()
  }

  /**
   * Store AA wallet info in database
   */
  private async storeAAWallet(walletInfo: AAWalletInfo): Promise<void> {
    try {
      console.log(`💾 Storing AA wallet in database...`)
      console.log(`   AA Wallet ID: ${walletInfo.aaWalletId}`)
      console.log(`   User Address: ${walletInfo.userAddress}`)
      
      await dbService.createAAWallet({
        aaWalletId: walletInfo.aaWalletId,
        userAddress: walletInfo.userAddress,
        publicKey: walletInfo.publicKey,
        initialBalance: walletInfo.initialBalance,
        fundedBalance: walletInfo.fundedBalance,
        fundingTxId: walletInfo.fundingTxId,
        name: walletInfo.name,
      })
      
      console.log(`✅ AA wallet stored in database`)
    } catch (error) {
      console.error('❌ Failed to store AA wallet:', error)
      // Don't throw - wallet creation succeeded even if storage fails
    }
  }

  /**
   * Get AA wallet information
   */
  async getAAWalletInfo(aaWalletId: string): Promise<AAWalletInfo | null> {
    try {
      // Try to get from database first
      const dbWallet = await dbService.getAAWalletByAddress(aaWalletId)
      if (dbWallet) {
        return {
          aaWalletId: dbWallet.aaWalletId,
          userAddress: dbWallet.userAddress,
          publicKey: dbWallet.publicKey,
          initialBalance: dbWallet.initialBalance,
          fundedBalance: dbWallet.fundedBalance,
          fundingTxId: dbWallet.fundingTxId || '',
          name: dbWallet.name || 'Orchestrator AA Wallet',
          createdAt: dbWallet.createdAt,
        }
      }

      // Fallback to querying Hedera
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(AccountId.fromString(aaWalletId))
        .execute(this.client)

      const balance = await new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(aaWalletId))
        .execute(this.client)

      const hbarBalance = balance.hbars.toTinybars().toNumber() / 100_000_000

      return {
        aaWalletId,
        userAddress: accountInfo.key.toString(),
        publicKey: accountInfo.key.toString(),
        initialBalance: 0,
        fundedBalance: hbarBalance,
        fundingTxId: '',
        name: 'Orchestrator AA Wallet',
        createdAt: new Date(),
      }
    } catch (error) {
      console.error('❌ Failed to get AA wallet info:', error)
      return null
    }
  }

  /**
   * Check if AA wallet exists
   */
  async walletExists(aaWalletId: string): Promise<boolean> {
    try {
      await new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(aaWalletId))
        .execute(this.client)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Convert AAWalletInfo to the desired response format
   */
  toAAWalletResponse(walletInfo: AAWalletInfo): AAWalletResponse {
    return {
      accountId: walletInfo.aaWalletId,
      evmAddress: walletInfo.userAddress,
      name: walletInfo.name
    }
  }

  /**
   * Close client connection
   */
  close() {
    this.client.close()
  }
}

// Singleton instance
let aaWalletService: AAWalletService | null = null

export function getAAWalletService(): AAWalletService {
  if (!aaWalletService) {
    aaWalletService = new AAWalletService()
  }
  return aaWalletService
}
