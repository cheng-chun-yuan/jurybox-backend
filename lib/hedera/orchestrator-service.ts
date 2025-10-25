/**
 * Orchestrator Service
 * Manages orchestrators and their associated AA wallets
 * Handles creation, funding, and balance checking
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
import { getDatabase } from '../database.js'
import CryptoJS from 'crypto-js'

export interface CreateOrchestratorRequest {
  userAddress: string
  config: {
    maxDiscussionRounds: number
    roundTimeout: number
    consensusAlgorithm: string
    enableDiscussion: boolean
    convergenceThreshold: number
    outlierDetection: boolean
  }
  systemPrompt: string
  network: 'testnet' | 'mainnet'
  initialFunding?: number
}

export interface CreateOrchestratorResponse {
  orchestratorId: string
  wallet: {
    address: string
    accountId: string
    publicKey: string
    isActive: boolean
    createdAt: number
    lastUsed: number
  }
  systemPrompt: string
  config: any
  status: 'created'
}

export interface FundWalletRequest {
  orchestratorId: string
  amount: number
  userAddress: string
  transactionHash: string
}

export interface FundWalletResponse {
  success: boolean
  message: string
}

export interface BalanceResponse {
  balance: {
    hbar: string
    tinybars: string
    lastChecked: number
  }
  accountId: string
  address: string
}

export interface OrchestratorStatusResponse {
  orchestratorId: string
  status: string
  wallet: {
    address: string
    accountId: string
    isActive: boolean
  }
  config: any
  systemPrompt: string
  createdAt: number
}

export class OrchestratorService {
  private client: Client
  private operatorAccountId: AccountId
  private operatorPrivateKey: PrivateKey
  private prisma: any
  private encryptionKey: string

  constructor() {
    // Initialize with main account credentials
    const accountIdStr = process.env.HEDERA_ACCOUNT_ID || ''
    const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || ''
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'

    if (!accountIdStr || !privateKeyStr) {
      throw new Error('Hedera credentials not configured (HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY)')
    }

    this.operatorAccountId = AccountId.fromString(accountIdStr)
    this.operatorPrivateKey = PrivateKey.fromStringECDSA(privateKeyStr)
    
    const network = process.env.HEDERA_NETWORK || 'testnet'
    this.client = network === 'mainnet' 
      ? Client.forMainnet().setOperator(this.operatorAccountId, this.operatorPrivateKey)
      : Client.forTestnet().setOperator(this.operatorAccountId, this.operatorPrivateKey)
    
    this.prisma = getDatabase()
  }

  /**
   * Create new orchestrator with AA wallet
   */
  async createOrchestrator(request: CreateOrchestratorRequest): Promise<CreateOrchestratorResponse> {
    try {
      console.log('🎯 Creating orchestrator with AA wallet...')
      console.log(`User Address: ${request.userAddress}`)
      console.log(`Network: ${request.network}`)

      // 1. Generate unique orchestrator ID
      const orchestratorId = `orch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log(`Orchestrator ID: ${orchestratorId}`)

      // 2. Create Hedera account for AA wallet
      const hederaAccount = await this.createHederaAccount()
      console.log(`Created Hedera account: ${hederaAccount.accountId}`)

      // 3. Generate key pair
      const keyPair = await this.generateKeyPair()
      console.log(`Generated key pair`)

      // 4. Encrypt private key
      const encryptedPrivateKey = await this.encryptPrivateKey(keyPair.privateKey)
      console.log(`Encrypted private key`)

      // 5. Store in database
      await this.saveOrchestrator({
        id: orchestratorId,
        userAddress: request.userAddress,
        systemPrompt: request.systemPrompt,
        config: JSON.stringify(request.config),
        status: 'created'
      })

      await this.saveAAWallet({
        id: `wallet-${orchestratorId}`,
        orchestratorId,
        address: hederaAccount.address,
        accountId: hederaAccount.accountId,
        publicKey: keyPair.publicKey,
        privateKeyEncrypted: encryptedPrivateKey,
        isActive: true
      })

      console.log(`✅ Orchestrator created successfully`)

      return {
        orchestratorId,
        wallet: {
          address: hederaAccount.address,
          accountId: hederaAccount.accountId,
          publicKey: keyPair.publicKey,
          isActive: true,
          createdAt: Date.now(),
          lastUsed: Date.now()
        },
        systemPrompt: request.systemPrompt,
        config: request.config,
        status: 'created'
      }
    } catch (error) {
      console.error('❌ Failed to create orchestrator:', error)
      throw error
    }
  }

  /**
   * Record funding transaction
   */
  async recordFunding(request: FundWalletRequest): Promise<FundWalletResponse> {
    try {
      console.log(`💰 Recording funding for orchestrator: ${request.orchestratorId}`)

      // 1. Verify orchestrator exists
      const orchestrator = await this.getOrchestrator(request.orchestratorId)
      if (!orchestrator) {
        throw new Error('Orchestrator not found')
      }

      // 2. Update last_used timestamp
      await this.updateWalletLastUsed(request.orchestratorId)

      // 3. Log transaction (optional - could store in audit table)
      console.log(`Funding recorded: ${request.amount} HBAR, TX: ${request.transactionHash}`)

      return { success: true, message: 'Funding recorded successfully' }
    } catch (error) {
      console.error('❌ Failed to record funding:', error)
      throw error
    }
  }

  /**
   * Get balance from Hedera Mirror Node
   */
  async getWalletBalance(orchestratorId: string): Promise<BalanceResponse> {
    try {
      console.log(`🔍 Getting balance for orchestrator: ${orchestratorId}`)

      // 1. Get account ID from database
      const wallet = await this.getAAWallet(orchestratorId)
      if (!wallet) {
        throw new Error('Wallet not found')
      }

      // 2. Call Hedera Mirror Node API
      const network = process.env.HEDERA_NETWORK || 'testnet'
      const mirrorNodeUrl = network === 'mainnet' 
        ? 'https://mainnet-public.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com'
      
      const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${wallet.accountId}`)
      
      if (!response.ok) {
        throw new Error(`Mirror node request failed: ${response.status}`)
      }

      const data = await response.json()

      // 3. Extract and convert balance
      const tinybars = data.balance?.balance || '0'
      const hbar = (parseInt(tinybars) / 100000000).toString()

      console.log(`Balance: ${hbar} HBAR (${tinybars} tinybars)`)

      return {
        balance: {
          hbar,
          tinybars,
          lastChecked: Date.now()
        },
        accountId: wallet.accountId,
        address: wallet.address
      }
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error)
      throw error
    }
  }

  /**
   * Get orchestrator status
   */
  async getOrchestratorStatus(orchestratorId: string): Promise<OrchestratorStatusResponse> {
    try {
      const orchestrator = await this.getOrchestrator(orchestratorId)
      if (!orchestrator) {
        throw new Error('Orchestrator not found')
      }

      const wallet = await this.getAAWallet(orchestratorId)
      if (!wallet) {
        throw new Error('Wallet not found')
      }

    return {
        orchestratorId: orchestrator.id,
        status: orchestrator.status,
        wallet: {
          address: wallet.address,
          accountId: wallet.accountId,
          isActive: wallet.isActive
        },
        config: JSON.parse(orchestrator.config || '{}'),
        systemPrompt: orchestrator.systemPrompt || '',
        createdAt: orchestrator.createdAt.getTime()
      }
    } catch (error) {
      console.error('❌ Failed to get orchestrator status:', error)
      throw error
    }
  }

  /**
   * Create Hedera account
   */
  private async createHederaAccount(): Promise<{ address: string; accountId: string }> {
    try {
      // Generate a new key pair for the AA wallet
      const newKeyPair = PrivateKey.generateECDSA()
      
      // Create account transaction
      const transaction = new AccountCreateTransaction()
        .setKey(newKeyPair.publicKey)
        .setInitialBalance(new Hbar(0)) // Start with 0 balance

      // Submit the transaction
      const txResponse = await transaction.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)
      const accountId = receipt.accountId

      if (!accountId) {
        throw new Error('Failed to create Hedera account - no account ID returned')
      }

      return {
        address: newKeyPair.publicKey.toString(),
        accountId: accountId.toString()
      }
    } catch (error) {
      console.error('❌ Failed to create Hedera account:', error)
      throw error
    }
  }

  /**
   * Generate ECDSA key pair
   */
  private async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const keyPair = PrivateKey.generateECDSA()
    return {
      publicKey: keyPair.publicKey.toString(),
      privateKey: keyPair.toString()
    }
  }

  /**
   * Encrypt private key for storage
   */
  private async encryptPrivateKey(privateKey: string): Promise<string> {
    try {
      const encrypted = CryptoJS.AES.encrypt(privateKey, this.encryptionKey).toString()
      return encrypted
    } catch (error) {
      console.error('❌ Failed to encrypt private key:', error)
      throw error
    }
  }

  /**
   * Decrypt private key (for internal use)
   */
  private async decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedPrivateKey, this.encryptionKey).toString(CryptoJS.enc.Utf8)
      return decrypted
    } catch (error) {
      console.error('❌ Failed to decrypt private key:', error)
      throw error
    }
  }

  /**
   * Save orchestrator to database
   */
  private async saveOrchestrator(data: {
    id: string
    userAddress: string
    systemPrompt: string
    config: string
    status: string
  }): Promise<void> {
    try {
      await this.prisma.orchestrator.create({
        data: {
          id: data.id,
          userAddress: data.userAddress,
          systemPrompt: data.systemPrompt,
          config: data.config,
          status: data.status
        }
      })
      console.log(`✅ Orchestrator saved to database`)
    } catch (error) {
      console.error('❌ Failed to save orchestrator:', error)
      throw error
    }
  }

  /**
   * Save AA wallet to database
   */
  private async saveAAWallet(data: {
    id: string
    orchestratorId: string
    address: string
    accountId: string
    publicKey: string
    privateKeyEncrypted: string
    isActive: boolean
  }): Promise<void> {
    try {
      await this.prisma.aAWallet.create({
        data: {
          id: data.id,
          orchestratorId: data.orchestratorId,
          address: data.address,
          accountId: data.accountId,
          publicKey: data.publicKey,
          privateKeyEncrypted: data.privateKeyEncrypted,
          isActive: data.isActive
        }
      })
      console.log(`✅ AA wallet saved to database`)
    } catch (error) {
      console.error('❌ Failed to save AA wallet:', error)
      throw error
    }
  }

  /**
   * Get orchestrator from database
   */
  private async getOrchestrator(orchestratorId: string): Promise<any> {
    try {
      return await this.prisma.orchestrator.findUnique({
        where: { id: orchestratorId }
      })
    } catch (error) {
      console.error('❌ Failed to get orchestrator:', error)
      throw error
    }
  }

  /**
   * Get AA wallet from database
   */
  private async getAAWallet(orchestratorId: string): Promise<any> {
    try {
      return await this.prisma.aAWallet.findFirst({
        where: { 
          orchestratorId: orchestratorId,
          isActive: true
        }
      })
    } catch (error) {
      console.error('❌ Failed to get AA wallet:', error)
      throw error
    }
  }

  /**
   * Update wallet last used timestamp
   */
  private async updateWalletLastUsed(orchestratorId: string): Promise<void> {
    try {
      await this.prisma.aAWallet.updateMany({
        where: { orchestratorId: orchestratorId },
        data: { lastUsed: new Date() }
      })
      console.log(`✅ Wallet last used timestamp updated`)
    } catch (error) {
      console.error('❌ Failed to update wallet timestamp:', error)
      throw error
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
let orchestratorService: OrchestratorService | null = null

export function getOrchestratorService(): OrchestratorService {
  if (!orchestratorService) {
    orchestratorService = new OrchestratorService()
  }
  return orchestratorService
}