/**
 * Hedera Consensus Service (HCS) Service
 * Handles topic creation, message submission, and message retrieval
 */

import { 
  Client, 
  TopicCreateTransaction, 
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TopicId,
  PrivateKey,
  AccountId,
  Status
} from '@hashgraph/sdk'
import { config } from '../../server/config/index.js'

export interface HCSMessage {
  id: string
  topicId: string
  message: string
  consensusTimestamp: string
  payerAccountId: string
}

export interface TopicInfo {
  topicId: string
  topicMemo?: string
  adminKey?: string
  submitKey?: string
}

export class HCSService {
  private client: Client
  private accountId: AccountId
  private privateKey: PrivateKey

  constructor() {
    // Initialize Hedera client
    this.accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID || '0.0.1234')
    this.privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY || '')
    
    this.client = Client.forName(process.env.HEDERA_NETWORK || 'testnet')
      .setOperator(this.accountId, this.privateKey)
  }

  /**
   * Create a new HCS topic for a task
   */
  async createTopic(memo?: string): Promise<TopicInfo> {
    try {
      console.log('🔗 Creating HCS topic...')
      
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo || `JuryBox Task Topic - ${Date.now()}`)
        .setAdminKey(this.privateKey.publicKey)
        .setSubmitKey(this.privateKey.publicKey)

      const response = await transaction.execute(this.client)
      const receipt = await response.getReceipt(this.client)
      
      const topicId = receipt.topicId
      if (!topicId) {
        throw new Error('Failed to create topic - no topic ID returned')
      }

      console.log(`✅ HCS topic created: ${topicId.toString()}`)
      
      return {
        topicId: topicId.toString(),
        topicMemo: memo,
        adminKey: this.privateKey.publicKey.toString(),
        submitKey: this.privateKey.publicKey.toString(),
      }
    } catch (error) {
      console.error('❌ Failed to create HCS topic:', error)
      throw error
    }
  }

  /**
   * Submit a message to an HCS topic
   */
  async submitMessage(topicId: string, message: string): Promise<string> {
    try {
      console.log(`📤 Submitting message to topic ${topicId}...`)
      
      const topicIdObj = TopicId.fromString(topicId)
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicIdObj)
        .setMessage(message)

      const response = await transaction.execute(this.client)
      const receipt = await response.getReceipt(this.client)
      
      const consensusTimestamp = receipt.consensusTimestamp
      if (!consensusTimestamp) {
        throw new Error('Failed to submit message - no consensus timestamp returned')
      }

      console.log(`✅ Message submitted with timestamp: ${consensusTimestamp.toString()}`)
      return consensusTimestamp.toString()
    } catch (error) {
      console.error('❌ Failed to submit message to HCS topic:', error)
      throw error
    }
  }

  /**
   * Query messages from an HCS topic
   */
  async queryMessages(topicId: string, startTime?: Date, endTime?: Date): Promise<HCSMessage[]> {
    try {
      console.log(`📥 Querying messages from topic ${topicId}...`)
      
      const topicIdObj = TopicId.fromString(topicId)
      const query = new TopicMessageQuery()
        .setTopicId(topicIdObj)
        .setStartTime(startTime || new Date(0))
        .setEndTime(endTime || new Date())

      const messages: HCSMessage[] = []
      
      // Execute query and collect messages
      for await (const message of query) {
        messages.push({
          id: message.consensusTimestamp?.toString() || '',
          topicId: topicId,
          message: Buffer.from(message.contents).toString('utf-8'),
          consensusTimestamp: message.consensusTimestamp?.toString() || '',
          payerAccountId: message.payerAccountId?.toString() || '',
        })
      }

      console.log(`✅ Retrieved ${messages.length} messages from topic`)
      return messages
    } catch (error) {
      console.error('❌ Failed to query messages from HCS topic:', error)
      throw error
    }
  }

  /**
   * Get the latest messages from a topic (for real-time updates)
   */
  async getLatestMessages(topicId: string, limit: number = 10): Promise<HCSMessage[]> {
    try {
      const messages = await this.queryMessages(topicId)
      return messages.slice(-limit) // Get the last N messages
    } catch (error) {
      console.error('❌ Failed to get latest messages:', error)
      throw error
    }
  }

  /**
   * Submit a task announcement to HCS
   */
  async announceTask(taskId: string, topicId: string, content: string, judges: string[]): Promise<string> {
    const announcement = {
      type: 'task_announcement',
      taskId,
      topicId,
      content,
      judges,
      timestamp: new Date().toISOString(),
      round: 1,
    }

    const message = JSON.stringify(announcement)
    return this.submitMessage(topicId, message)
  }

  /**
   * Submit a score to HCS
   */
  async submitScore(taskId: string, topicId: string, judgeId: string, round: number, score: number, reasoning: string): Promise<string> {
    const scoreSubmission = {
      type: 'score_submission',
      taskId,
      topicId,
      judgeId,
      round,
      score,
      reasoning,
      timestamp: new Date().toISOString(),
    }

    const message = JSON.stringify(scoreSubmission)
    return this.submitMessage(topicId, message)
  }

  /**
   * Submit a round completion announcement
   */
  async announceRoundCompletion(taskId: string, topicId: string, round: number, consensus: boolean, nextRound?: number): Promise<string> {
    const announcement = {
      type: 'round_completion',
      taskId,
      topicId,
      round,
      consensus,
      nextRound,
      timestamp: new Date().toISOString(),
    }

    const message = JSON.stringify(announcement)
    return this.submitMessage(topicId, message)
  }

  /**
   * Submit a final report to HCS
   */
  async submitFinalReport(taskId: string, topicId: string, finalScore: number, consensusData: any): Promise<string> {
    const finalReport = {
      type: 'final_report',
      taskId,
      topicId,
      finalScore,
      consensusData,
      timestamp: new Date().toISOString(),
    }

    const message = JSON.stringify(finalReport)
    return this.submitMessage(topicId, message)
  }

  /**
   * Submit a payment record to HCS
   */
  async submitPaymentRecord(taskId: string, topicId: string, judgeId: string, amount: number, txHash: string): Promise<string> {
    const paymentRecord = {
      type: 'payment_record',
      taskId,
      topicId,
      judgeId,
      amount,
      txHash,
      timestamp: new Date().toISOString(),
    }

    const message = JSON.stringify(paymentRecord)
    return this.submitMessage(topicId, message)
  }

  /**
   * Parse and validate HCS messages
   */
  parseMessage(message: HCSMessage): any {
    try {
      const parsed = JSON.parse(message.message)
      
      // Validate message structure
      if (!parsed.type || !parsed.timestamp) {
        throw new Error('Invalid message format: missing type or timestamp')
      }

      return parsed
    } catch (error) {
      console.error('❌ Failed to parse HCS message:', error)
      return null
    }
  }

  /**
   * Get client instance for advanced operations
   */
  getClient(): Client {
    return this.client
  }

  /**
   * Get account information
   */
  getAccountInfo() {
    return {
      accountId: this.accountId.toString(),
      network: process.env.HEDERA_NETWORK || 'testnet',
    }
  }
}

// Singleton instance
let hcsService: HCSService | null = null

export function getHCSService(): HCSService {
  if (!hcsService) {
    hcsService = new HCSService()
  }
  return hcsService
}
