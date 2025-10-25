/**
 * Hedera Agent Service
 * Manages agent creation and operations using Hedera Agent Kit
 */

import {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  AccountInfoQuery,
  Hbar,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk'
import type { HederaAccountInfo, Agent, JudgmentRequest } from '../../types/agent'

export class HederaAgentService {
  private client: Client
  private operatorAccountId: AccountId
  private operatorPrivateKey: PrivateKey

  constructor() {
    // Initialize Hedera client for testnet
    // In production, use mainnet and secure key management
    const accountIdStr = process.env.HEDERA_ACCOUNT_ID || ''
    const privateKeyStr = process.env.HEDERA_PRIVATE_KEY || ''

    if (!accountIdStr || !privateKeyStr) {
      throw new Error('Hedera credentials not configured')
    }

    this.operatorAccountId = AccountId.fromString(accountIdStr)
    
    // Use ECDSA hex encoded private key format (keep 0x prefix)
    this.operatorPrivateKey = PrivateKey.fromStringECDSA(privateKeyStr)

    this.client = Client.forTestnet().setOperator(
      this.operatorAccountId,
      this.operatorPrivateKey
    )
  }

  /**
   * Create a new Hedera account for an agent
   */
  async createAgentAccount(
    initialBalance: number = 10
  ): Promise<HederaAccountInfo> {
    try {
      // Generate new key pair for the agent
      const privateKey = PrivateKey.generateED25519()
      const publicKey = privateKey.publicKey

      // Create account transaction
      const transaction = new AccountCreateTransaction()
        .setKey(publicKey)
        .setInitialBalance(new Hbar(initialBalance))

      // Submit the transaction
      const txResponse = await transaction.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)
      const accountId = receipt.accountId

      if (!accountId) {
        throw new Error('Failed to create account')
      }

      return {
        accountId: accountId.toString(),
        publicKey: publicKey.toString(),
        privateKey: privateKey.toString(),
        balance: initialBalance,
      }
    } catch (error) {
      console.error('Error creating agent account:', error)
      throw error
    }
  }

  /**
   * Transfer HBAR from one account to another
   * Used for agent-to-agent payments
   */
  async transferHbar(
    fromAccountId: string,
    fromPrivateKey: string,
    toAccountId: string,
    amount: number
  ): Promise<string> {
    try {
      const senderKey = PrivateKey.fromString(fromPrivateKey)

      const transaction = new TransferTransaction()
        .addHbarTransfer(AccountId.fromString(fromAccountId), new Hbar(-amount))
        .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount))
        .freezeWith(this.client)

      const signedTx = await transaction.sign(senderKey)
      const txResponse = await signedTx.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)

      return txResponse.transactionId.toString()
    } catch (error) {
      console.error('Error transferring HBAR:', error)
      throw error
    }
  }

  /**
   * Create a topic for agent communications
   * Uses Hedera Consensus Service (HCS)
   */
  async createAgentTopic(memo: string): Promise<string> {
    try {
      const transaction = new TopicCreateTransaction()
        .setSubmitKey(this.operatorPrivateKey.publicKey)
        .setTopicMemo(memo)

      const txResponse = await transaction.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)
      const topicId = receipt.topicId

      if (!topicId) {
        throw new Error('Failed to create topic')
      }

      return topicId.toString()
    } catch (error) {
      console.error('Error creating topic:', error)
      throw error
    }
  }

  /**
   * Submit a message to an agent topic
   */
  async submitMessage(topicId: string, message: string): Promise<string> {
    try {
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)

      const txResponse = await transaction.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)

      return txResponse.transactionId.toString()
    } catch (error) {
      console.error('Error submitting message:', error)
      throw error
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<number> {
    try {
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(AccountId.fromString(accountId))
        .execute(this.client)
      return accountInfo.balance.toTinybars().toNumber() / 100_000_000 // Convert to HBAR
    } catch (error) {
      console.error('Error getting balance:', error)
      throw error
    }
  }

  /**
   * Initialize agent with Hedera capabilities
   */
  async initializeAgent(agent: Partial<Agent>): Promise<HederaAccountInfo> {
    // Create Hedera account for the agent
    const accountInfo = await this.createAgentAccount()

    // Create a topic for agent communications
    const topicId = await this.createAgentTopic(
      `Agent: ${agent.name} - ${agent.id}`
    )

    console.log(`Agent initialized with topic: ${topicId}`)

    return accountInfo
  }

  /**
   * Process payment for judgment
   */
  async processJudgmentPayment(
    request: JudgmentRequest,
    agent: Agent,
    payerAccountId: string,
    payerPrivateKey: string
  ): Promise<string> {
    const amount = agent.paymentConfig.pricePerJudgment

    return await this.transferHbar(
      payerAccountId,
      payerPrivateKey,
      agent.hederaAccount.accountId,
      amount
    )
  }

  /**
   * Get the Hedera client
   */
  getClient(): Client {
    return this.client
  }

  /**
   * Close the client connection
   */
  close() {
    this.client.close()
  }
}

// Singleton instance
let hederaService: HederaAgentService | null = null

export function getHederaService(): HederaAgentService {
  if (!hederaService) {
    hederaService = new HederaAgentService()
  }
  return hederaService
}
