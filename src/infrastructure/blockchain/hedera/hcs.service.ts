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
} from '@hashgraph/sdk'
import { appConfig } from '../../config'
import { getLogger } from '../../../shared/utils'
import { HederaError, HCSTopicError } from '../../../shared/errors'

const logger = getLogger()

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

export interface TaskAnnouncement {
  type: 'task_announcement'
  taskId: string
  topicId: string
  content: string
  judges: string[]
  timestamp: string
  round: number
}

export interface ScoreSubmission {
  type: 'score_submission'
  taskId: string
  topicId: string
  judgeId: string
  round: number
  score: number
  reasoning: string
  timestamp: string
}

export interface RoundCompletion {
  type: 'round_completion'
  taskId: string
  topicId: string
  round: number
  consensus: boolean
  nextRound?: number
  timestamp: string
}

export interface FinalReport {
  type: 'final_report'
  taskId: string
  topicId: string
  finalScore: number
  consensusData: any
  timestamp: string
}

export interface PaymentRecord {
  type: 'payment_record'
  taskId: string
  topicId: string
  judgeId: string
  amount: number
  txHash: string
  timestamp: string
}

export type HCSMessageType =
  | TaskAnnouncement
  | ScoreSubmission
  | RoundCompletion
  | FinalReport
  | PaymentRecord

export class HCSService {
  private client: Client
  private accountId: AccountId
  private privateKey: PrivateKey

  constructor() {
    try {
      this.accountId = AccountId.fromString(appConfig.hedera.accountId)
      this.privateKey = PrivateKey.fromString(appConfig.hedera.privateKey)

      this.client = Client.forName(appConfig.hedera.network).setOperator(
        this.accountId,
        this.privateKey
      )

      logger.info('HCS Service initialized', {
        network: appConfig.hedera.network,
        accountId: this.accountId.toString(),
      })
    } catch (error) {
      logger.error('Failed to initialize HCS Service', error)
      throw new HederaError('Failed to initialize HCS Service', { error })
    }
  }

  /**
   * Create a new HCS topic for a task
   */
  async createTopic(memo?: string): Promise<TopicInfo> {
    try {
      logger.debug('Creating HCS topic', { memo })

      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo || `JuryBox Task Topic - ${Date.now()}`)
        .setAdminKey(this.privateKey.publicKey)
        .setSubmitKey(this.privateKey.publicKey)

      const response = await transaction.execute(this.client)
      const receipt = await response.getReceipt(this.client)

      const topicId = receipt.topicId
      if (!topicId) {
        throw new HCSTopicError('No topic ID returned')
      }

      const topicInfo: TopicInfo = {
        topicId: topicId.toString(),
        topicMemo: memo,
        adminKey: this.privateKey.publicKey.toString(),
        submitKey: this.privateKey.publicKey.toString(),
      }

      logger.info('HCS topic created', topicInfo)

      return topicInfo
    } catch (error) {
      logger.error('Failed to create HCS topic', error)
      throw new HCSTopicError('Failed to create topic')
    }
  }

  /**
   * Submit a message to an HCS topic
   */
  async submitMessage(topicId: string, message: string): Promise<string> {
    try {
      logger.debug('Submitting message to HCS topic', { topicId })

      const topicIdObj = TopicId.fromString(topicId)
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicIdObj)
        .setMessage(message)

      const response = await transaction.execute(this.client)
      const receipt = await response.getReceipt(this.client)

      const consensusTimestamp = (receipt as any).consensusTimestamp
      if (!consensusTimestamp) {
        throw new HCSTopicError('No consensus timestamp returned')
      }

      const timestamp = consensusTimestamp.toString()
      logger.info('Message submitted to HCS', { topicId, timestamp })

      return timestamp
    } catch (error) {
      logger.error('Failed to submit message to HCS topic', error, { topicId })
      throw new HCSTopicError('Failed to submit message', { topicId, error })
    }
  }

  /**
   * Query messages from an HCS topic
   */
  async queryMessages(
    topicId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<HCSMessage[]> {
    try {
      logger.debug('Querying messages from HCS topic', { topicId })

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

      logger.info('Retrieved messages from HCS topic', {
        topicId,
        count: messages.length,
      })

      return messages
    } catch (error) {
      logger.error('Failed to query messages from HCS topic', error, { topicId })
      throw new HCSTopicError('Failed to query messages', { topicId, error })
    }
  }

  /**
   * Get the latest messages from a topic (for real-time updates)
   */
  async getLatestMessages(topicId: string, limit: number = 10): Promise<HCSMessage[]> {
    const messages = await this.queryMessages(topicId)
    return messages.slice(-limit) // Get the last N messages
  }

  /**
   * Submit a task announcement to HCS
   */
  async announceTask(
    taskId: string,
    topicId: string,
    content: string,
    judges: string[]
  ): Promise<string> {
    const announcement: TaskAnnouncement = {
      type: 'task_announcement',
      taskId,
      topicId,
      content,
      judges,
      timestamp: new Date().toISOString(),
      round: 1,
    }

    return this.submitMessage(topicId, JSON.stringify(announcement))
  }

  /**
   * Submit a score to HCS
   */
  async submitScore(
    taskId: string,
    topicId: string,
    judgeId: string,
    round: number,
    score: number,
    reasoning: string
  ): Promise<string> {
    const scoreSubmission: ScoreSubmission = {
      type: 'score_submission',
      taskId,
      topicId,
      judgeId,
      round,
      score,
      reasoning,
      timestamp: new Date().toISOString(),
    }

    return this.submitMessage(topicId, JSON.stringify(scoreSubmission))
  }

  /**
   * Submit a round completion announcement
   */
  async announceRoundCompletion(
    taskId: string,
    topicId: string,
    round: number,
    consensus: boolean,
    nextRound?: number
  ): Promise<string> {
    const announcement: RoundCompletion = {
      type: 'round_completion',
      taskId,
      topicId,
      round,
      consensus,
      nextRound,
      timestamp: new Date().toISOString(),
    }

    return this.submitMessage(topicId, JSON.stringify(announcement))
  }

  /**
   * Submit a final report to HCS
   */
  async submitFinalReport(
    taskId: string,
    topicId: string,
    finalScore: number,
    consensusData: any
  ): Promise<string> {
    const finalReport: FinalReport = {
      type: 'final_report',
      taskId,
      topicId,
      finalScore,
      consensusData,
      timestamp: new Date().toISOString(),
    }

    return this.submitMessage(topicId, JSON.stringify(finalReport))
  }

  /**
   * Submit a payment record to HCS
   */
  async submitPaymentRecord(
    taskId: string,
    topicId: string,
    judgeId: string,
    amount: number,
    txHash: string
  ): Promise<string> {
    const paymentRecord: PaymentRecord = {
      type: 'payment_record',
      taskId,
      topicId,
      judgeId,
      amount,
      txHash,
      timestamp: new Date().toISOString(),
    }

    return this.submitMessage(topicId, JSON.stringify(paymentRecord))
  }

  /**
   * Parse and validate HCS messages
   */
  parseMessage(message: HCSMessage): HCSMessageType | null {
    try {
      const parsed = JSON.parse(message.message)

      // Validate message structure
      if (!parsed.type || !parsed.timestamp) {
        logger.warn('Invalid message format: missing type or timestamp', { message })
        return null
      }

      return parsed as HCSMessageType
    } catch (error) {
      logger.error('Failed to parse HCS message', error)
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
      network: appConfig.hedera.network,
    }
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    try {
      await this.client.close()
      logger.info('HCS Service closed')
    } catch (error) {
      logger.error('Failed to close HCS Service', error)
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

export function resetHCSService(): void {
  hcsService = null
}
