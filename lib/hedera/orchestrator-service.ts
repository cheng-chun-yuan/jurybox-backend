/**
 * Multi-Agent Orchestrator Service
 * Handles multi-round evaluation, consensus algorithms, and coordination
 */

import { getHCSService } from './hcs-service.js'
import { dbService } from '../database.js'
import { getX402Service } from '../x402/payment-service.js'

export interface ConsensusResult {
  consensus: boolean
  finalScore?: number
  confidence: number
  round: number
  scores: Array<{
    judgeId: number
    score: number
    reasoning: string
    weight: number
  }>
  metaScores: {
    average: number
    median: number
    standardDeviation: number
    agreement: number
  }
}

export interface RoundResult {
  round: number
  consensus: boolean
  scores: any[]
  metaScores: any
  nextRound?: number
}

export class OrchestratorService {
  private hcsService = getHCSService()
  private paymentService = getX402Service()

  /**
   * Start a new evaluation task
   */
  async startTask(taskId: string, content: string, judges: number[], maxRounds: number = 3): Promise<string> {
    try {
      console.log(`🚀 Starting task ${taskId} with ${judges.length} judges...`)

      // Create HCS topic for this task
      const topicInfo = await this.hcsService.createTopic(`JuryBox Task: ${taskId}`)
      
      // Create task in database
      const task = await dbService.createTask({
        taskId,
        content,
        topicId: topicInfo.topicId,
        creatorAddress: process.env.CREATOR_ADDRESS || '0.0.1234',
        maxRounds,
      })

      // Log task creation
      await dbService.logEvent({
        taskId,
        event: 'task_created',
        data: { content, judges, maxRounds, topicId: topicInfo.topicId },
      })

      // Announce task to HCS
      const judgeAddresses = await this.getJudgeAddresses(judges)
      await this.hcsService.announceTask(taskId, topicInfo.topicId, content, judgeAddresses)

      // Start first round
      await this.startRound(taskId, 1)

      console.log(`✅ Task ${taskId} started successfully`)
      return topicInfo.topicId
    } catch (error) {
      console.error(`❌ Failed to start task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Start a new round
   */
  async startRound(taskId: string, round: number): Promise<void> {
    try {
      console.log(`🔄 Starting round ${round} for task ${taskId}...`)

      // Update task status
      await dbService.updateTaskStatus(taskId, 'active', round)

      // Log round start
      await dbService.logEvent({
        taskId,
        event: 'round_started',
        data: { round },
      })

      // Announce round start to HCS
      const task = await dbService.getTaskById(taskId)
      if (task) {
        await this.hcsService.submitMessage(
          task.topicId,
          JSON.stringify({
            type: 'round_start',
            taskId,
            round,
            timestamp: new Date().toISOString(),
          })
        )
      }

      console.log(`✅ Round ${round} started for task ${taskId}`)
    } catch (error) {
      console.error(`❌ Failed to start round ${round} for task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Process submitted scores and check for consensus
   */
  async processScores(taskId: string, round: number): Promise<RoundResult> {
    try {
      console.log(`📊 Processing scores for task ${taskId}, round ${round}...`)

      // Get all scores for this round
      const scores = await dbService.getScoresForTask(taskId, round)
      
      if (scores.length === 0) {
        throw new Error('No scores found for this round')
      }

      // Calculate consensus
      const consensusResult = await this.calculateConsensus(scores, round)

      // Log consensus calculation
      await dbService.logEvent({
        taskId,
        event: 'consensus_calculated',
        data: { round, consensus: consensusResult.consensus, metaScores: consensusResult.metaScores },
      })

      // Announce round completion
      const task = await dbService.getTaskById(taskId)
      if (task) {
        await this.hcsService.announceRoundCompletion(
          taskId,
          task.topicId,
          round,
          consensusResult.consensus,
          consensusResult.consensus ? undefined : round + 1
        )
      }

      const result: RoundResult = {
        round,
        consensus: consensusResult.consensus,
        scores: consensusResult.scores,
        metaScores: consensusResult.metaScores,
        nextRound: consensusResult.consensus ? undefined : round + 1,
      }

      if (consensusResult.consensus) {
        // Finalize task
        await this.finalizeTask(taskId, consensusResult.finalScore!, consensusResult)
      } else if (round < (task?.maxRounds || 3)) {
        // Start next round
        await this.startRound(taskId, round + 1)
      } else {
        // Max rounds reached, finalize with current consensus
        await this.finalizeTask(taskId, consensusResult.metaScores.average, consensusResult)
      }

      return result
    } catch (error) {
      console.error(`❌ Failed to process scores for task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Calculate consensus using multiple algorithms
   */
  async calculateConsensus(scores: any[], round: number): Promise<ConsensusResult> {
    const scoreValues = scores.map(s => s.score)
    const judgeIds = scores.map(s => s.judgeId)
    const reasonings = scores.map(s => s.reasoning)

    // Calculate basic statistics
    const average = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    const sortedScores = [...scoreValues].sort((a, b) => a - b)
    const median = sortedScores[Math.floor(sortedScores.length / 2)]
    
    // Calculate standard deviation
    const variance = scoreValues.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scoreValues.length
    const standardDeviation = Math.sqrt(variance)

    // Calculate agreement (inverse of coefficient of variation)
    const agreement = standardDeviation === 0 ? 1 : Math.max(0, 1 - (standardDeviation / average))

    // Determine consensus based on multiple criteria
    const consensusThreshold = 0.8 // 80% agreement
    const maxDeviation = 0.1 // Maximum 10% deviation from mean
    const minScores = 3 // Minimum number of scores required

    const consensus = 
      scores.length >= minScores &&
      agreement >= consensusThreshold &&
      standardDeviation <= maxDeviation

    const metaScores = {
      average,
      median,
      standardDeviation,
      agreement,
    }

    // Calculate weighted scores (based on judge reputation)
    const weightedScores = await Promise.all(
      scores.map(async (score) => {
        const judge = await dbService.getAgentById(score.judgeId)
        const weight = judge?.reputation || 1.0
        return {
          judgeId: score.judgeId,
          score: score.score,
          reasoning: score.reasoning,
          weight,
        }
      })
    )

    return {
      consensus,
      finalScore: consensus ? average : undefined,
      confidence: agreement,
      round,
      scores: weightedScores,
      metaScores,
    }
  }

  /**
   * Finalize a task and process payments
   */
  async finalizeTask(taskId: string, finalScore: number, consensusData: ConsensusResult): Promise<void> {
    try {
      console.log(`🏁 Finalizing task ${taskId} with final score: ${finalScore}`)

      // Update task status
      await dbService.finalizeTask(taskId, finalScore)

      // Submit final report to HCS
      const task = await dbService.getTaskById(taskId)
      if (task) {
        await this.hcsService.submitFinalReport(taskId, task.topicId, finalScore, consensusData)
      }

      // Process payments for all judges
      await this.processPayments(taskId)

      // Log task completion
      await dbService.logEvent({
        taskId,
        event: 'task_completed',
        data: { finalScore, consensusData },
      })

      console.log(`✅ Task ${taskId} finalized successfully`)
    } catch (error) {
      console.error(`❌ Failed to finalize task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Process payments for all judges in a task
   */
  async processPayments(taskId: string): Promise<void> {
    try {
      console.log(`💰 Processing payments for task ${taskId}...`)

      const task = await dbService.getTaskById(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      // Get all judges who participated
      const scores = await dbService.getScoresForTask(taskId)
      const uniqueJudges = [...new Set(scores.map(s => s.judgeId))]

      for (const judgeId of uniqueJudges) {
        const judge = await dbService.getAgentById(judgeId)
        if (!judge) continue

        try {
          // Create payment record
          await dbService.createPayment({
            taskId,
            judgeId,
            amount: judge.fee,
          })

          // Process X402 payment
          const paymentResult = await this.processJudgePayment(taskId, judgeId, judge.fee, judge.payToAddress)
          
          if (paymentResult.success) {
            // Update payment status
            await dbService.updatePaymentStatus(taskId, judgeId, 'settled', paymentResult.transactionId)
            
            // Submit payment record to HCS
            await this.hcsService.submitPaymentRecord(
              taskId,
              task.topicId,
              judgeId.toString(),
              judge.fee,
              paymentResult.transactionId || ''
            )
          }

          console.log(`✅ Payment processed for judge ${judgeId}`)
        } catch (error) {
          console.error(`❌ Failed to process payment for judge ${judgeId}:`, error)
          // Continue with other judges
        }
      }

      console.log(`✅ All payments processed for task ${taskId}`)
    } catch (error) {
      console.error(`❌ Failed to process payments for task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Process payment for a single judge using X402
   */
  private async processJudgePayment(taskId: string, judgeId: number, amount: number, payToAddress: string): Promise<{ success: boolean; transactionId?: string }> {
    try {
      // Build payment requirements
      const paymentRequirements = {
        price: `${amount} HBAR`,
        payToAddress,
        resource: `/evaluation/${taskId}`,
        description: `Payment for task evaluation: ${taskId}`,
      }

      // Process payment (this would use the creator's private key)
      const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY
      if (!creatorPrivateKey) {
        throw new Error('Creator private key not configured')
      }

      const paymentResult = await this.paymentService.processPayment(creatorPrivateKey, paymentRequirements as any)
      
      if (paymentResult.success && paymentResult.paymentPayload) {
        // Verify and settle payment
        const verification = await this.paymentService.verifyPayment(
          paymentResult.paymentPayload,
          paymentRequirements as any
        )

        if (verification.isValid) {
          const settlement = await this.paymentService.settlePayment(
            paymentResult.paymentPayload,
            paymentRequirements as any
          )

          return {
            success: settlement.success,
            transactionId: settlement.transactionId,
          }
        }
      }

      return { success: false }
    } catch (error) {
      console.error(`❌ Payment processing failed for judge ${judgeId}:`, error)
      return { success: false }
    }
  }

  /**
   * Get judge addresses for HCS announcements
   */
  private async getJudgeAddresses(judgeIds: number[]): Promise<string[]> {
    const addresses: string[] = []
    
    for (const judgeId of judgeIds) {
      const judge = await dbService.getAgentById(judgeId)
      if (judge) {
        addresses.push(judge.accountId)
      }
    }
    
    return addresses
  }

  /**
   * Get task status and progress
   */
  async getTaskStatus(taskId: string): Promise<any> {
    const task = await dbService.getTaskById(taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    const scores = await dbService.getScoresForTask(taskId)
    const payments = await dbService.getPaymentsForTask(taskId)
    const auditLogs = await dbService.getAuditLogs(taskId)

    return {
      task,
      scores,
      payments,
      auditLogs,
      progress: {
        currentRound: task.currentRound,
        maxRounds: task.maxRounds,
        totalScores: scores.length,
        completedPayments: payments.filter(p => p.status === 'settled').length,
        totalPayments: payments.length,
      },
    }
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
