/**
 * Hedera Consensus Service (HCS) Communication Layer
 * Enables secure, tamper-proof message passing between agents
 */

import {
  TopicId,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TopicMessage,
} from '@hashgraph/sdk'
import { getHederaService } from './agent-service'

export interface AgentMessage {
  type: 'score' | 'discussion' | 'adjustment' | 'final'
  agentId: string
  agentName: string
  timestamp: number
  roundNumber: number
  data: {
    score?: number
    reasoning?: string
    originalScore?: number
    adjustedScore?: number
    confidence?: number
    aspects?: Record<string, number>
    discussion?: string
    replyTo?: string
  }
}

export interface EvaluationRound {
  roundNumber: number
  startTime: number
  endTime?: number
  messages: AgentMessage[]
  consensus?: number
}

export class HCSCommunicationService {
  private hederaService = getHederaService()
  private subscriptions = new Map<string, any>()
  private messageHandlers = new Map<string, (message: AgentMessage) => void>()

  /**
   * Create a new evaluation topic for agent communication
   */
  async createEvaluationTopic(
    evaluationId: string,
    metadata: {
      title: string
      numberOfAgents: number
      maxRounds: number
    }
  ): Promise<string> {
    const memo = JSON.stringify({
      evaluationId,
      ...metadata,
      createdAt: Date.now(),
    })

    const topicId = await this.hederaService.createAgentTopic(memo)
    console.log(`Created evaluation topic: ${topicId} for ${evaluationId}`)

    return topicId
  }

  /**
   * Submit agent score to HCS topic
   */
  async submitScore(
    topicId: string,
    message: AgentMessage
  ): Promise<string> {
    const messageString = JSON.stringify(message)
    const txId = await this.hederaService.submitMessage(topicId, messageString)

    console.log(
      `Agent ${message.agentName} submitted ${message.type}:`,
      message.data.score || message.data.discussion
    )

    return txId
  }

  /**
   * Subscribe to evaluation topic to receive all agent messages
   */
  async subscribeToTopic(
    topicId: string,
    onMessage: (message: AgentMessage) => void,
    startTime?: Date
  ): Promise<void> {
    const query = new TopicMessageQuery()
      .setTopicId(TopicId.fromString(topicId))
      .setStartTime(startTime || new Date())

    const subscription = query.subscribe(
      this.hederaService['client'],
      (error: Error | null, topicMessage: TopicMessage | null) => {
        if (error) {
          console.error('Error receiving topic message:', error)
          return
        }

        if (!topicMessage) return

        try {
          const messageString = Buffer.from(
            topicMessage.contents
          ).toString('utf-8')
          const agentMessage: AgentMessage = JSON.parse(messageString)

          // Call the message handler
          onMessage(agentMessage)
        } catch (err) {
          console.error('Error parsing topic message:', err)
        }
      }
    )

    this.subscriptions.set(topicId, subscription)
    console.log(`Subscribed to topic: ${topicId}`)
  }

  /**
   * Unsubscribe from evaluation topic
   */
  unsubscribeFromTopic(topicId: string): void {
    const subscription = this.subscriptions.get(topicId)
    if (subscription) {
      // Note: HCS subscriptions don't have explicit unsubscribe in SDK
      // They're automatically cleaned up when the query object is garbage collected
      this.subscriptions.delete(topicId)
      console.log(`Unsubscribed from topic: ${topicId}`)
    }
  }

  /**
   * Get all messages from a topic (for historical review)
   */
  async getTopicHistory(
    topicId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<AgentMessage[]> {
    return new Promise((resolve, reject) => {
      const messages: AgentMessage[] = []
      const query = new TopicMessageQuery()
        .setTopicId(TopicId.fromString(topicId))
        .setStartTime(startTime || new Date(0))

      if (endTime) {
        query.setEndTime(endTime)
      }

      query.subscribe(
        this.hederaService['client'],
        (error: Error | null, topicMessage: TopicMessage | null) => {
          if (error) {
            reject(error)
            return
          }

          if (!topicMessage) {
            // No more messages, resolve
            setTimeout(() => resolve(messages), 1000)
            return
          }

          try {
            const messageString = Buffer.from(
              topicMessage.contents
            ).toString('utf-8')
            const agentMessage: AgentMessage = JSON.parse(messageString)
            messages.push(agentMessage)
          } catch (err) {
            console.error('Error parsing message:', err)
          }
        }
      )
    })
  }

  /**
   * Broadcast discussion message to all agents
   */
  async broadcastDiscussion(
    topicId: string,
    agentId: string,
    agentName: string,
    discussion: string,
    roundNumber: number,
    replyTo?: string
  ): Promise<string> {
    const message: AgentMessage = {
      type: 'discussion',
      agentId,
      agentName,
      timestamp: Date.now(),
      roundNumber,
      data: {
        discussion,
        replyTo,
      },
    }

    return this.submitScore(topicId, message)
  }

  /**
   * Submit score adjustment after discussion
   */
  async submitAdjustment(
    topicId: string,
    agentId: string,
    agentName: string,
    originalScore: number,
    adjustedScore: number,
    reasoning: string,
    roundNumber: number
  ): Promise<string> {
    const message: AgentMessage = {
      type: 'adjustment',
      agentId,
      agentName,
      timestamp: Date.now(),
      roundNumber,
      data: {
        originalScore,
        adjustedScore,
        reasoning,
      },
    }

    return this.submitScore(topicId, message)
  }

  /**
   * Wait for all agents to submit their scores
   */
  async waitForAllScores(
    topicId: string,
    expectedAgentCount: number,
    roundNumber: number,
    timeout: number = 60000
  ): Promise<AgentMessage[]> {
    return new Promise((resolve, reject) => {
      const scores: AgentMessage[] = []
      const startTime = Date.now()

      const checkInterval = setInterval(() => {
        if (scores.length >= expectedAgentCount) {
          clearInterval(checkInterval)
          resolve(scores)
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(
            new Error(
              `Timeout waiting for all agents. Got ${scores.length}/${expectedAgentCount}`
            )
          )
        }
      }, 500)

      this.subscribeToTopic(topicId, (message) => {
        if (
          (message.type === 'score' || message.type === 'adjustment') &&
          message.roundNumber === roundNumber
        ) {
          scores.push(message)
        }
      })
    })
  }

  /**
   * Create evaluation summary and store on HCS
   */
  async publishFinalConsensus(
    topicId: string,
    evaluationId: string,
    finalScore: number,
    individualScores: Record<string, number>,
    consensusAlgorithm: string,
    totalRounds: number
  ): Promise<string> {
    const message: AgentMessage = {
      type: 'final',
      agentId: 'coordinator',
      agentName: 'System Coordinator',
      timestamp: Date.now(),
      roundNumber: totalRounds,
      data: {
        score: finalScore,
        reasoning: JSON.stringify({
          evaluationId,
          individualScores,
          consensusAlgorithm,
          totalRounds,
          timestamp: Date.now(),
        }),
      },
    }

    return this.submitScore(topicId, message)
  }
}

// Singleton instance
let hcsService: HCSCommunicationService | null = null

export function getHCSService(): HCSCommunicationService {
  if (!hcsService) {
    hcsService = new HCSCommunicationService()
  }
  return hcsService
}
