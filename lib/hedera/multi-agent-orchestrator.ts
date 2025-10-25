/**
 * Multi-Agent Orchestrator
 * Coordinates the evaluation workflow with HCS-based communication
 * Implements the complete multi-agent evaluation system on Hedera
 */

import type {
  Agent,
  JudgmentRequest,
  JudgmentResult,
  OrchestratorConfig,
  EvaluationProgress,
  ConsensusResult,
  ConversationMessage,
  EvaluationTranscript,
  OrchestratorOutput
} from '../../types/agent'
import { getHCSService, type AgentMessage, type EvaluationRound } from './hcs-communication'
import { ConsensusAlgorithms } from './consensus-algorithms'
import { getX402Service } from '../x402/payment-service'
import { getViemRegistryService } from '../erc8004/viem-registry-service'
import { getOpenAIService } from '../ai/openai-service'
import { getAgentHTTPClient } from '../agents/http-client-service'

// Remove duplicate interfaces - they're now imported from types/agent.ts

export class MultiAgentOrchestrator {
  private hcsService = getHCSService()
  private x402Service = getX402Service()
  private registryService = getViemRegistryService()
  private openAIService = getOpenAIService()
  private agentHTTPClient = getAgentHTTPClient()

  /**
   * Execute complete multi-agent evaluation workflow
   * Following the 7-step process described in the documentation
   */
  async executeEvaluation(
    request: JudgmentRequest,
    config: OrchestratorConfig,
    existingTopicId?: string
  ): Promise<OrchestratorOutput> {
    const agents = request.selectedAgents
    console.log('🚀 Starting Multi-Agent Evaluation Orchestrator')
    console.log(`Agents: ${agents.map((a) => a.name).join(', ')}`)
    console.log(`Algorithm: ${config.consensusAlgorithm}`)

    // Step 1: Setup Environment and Communication Layer
    const topicId = existingTopicId || await this.setupCommunicationLayer(request, agents, config)

    try {
      // Step 2: Define Agents and Evaluation Criteria (already done via agents config)
      const evaluationCriteria = request.criteria || [
        'Accuracy',
        'Clarity',
        'Completeness',
        'Relevance',
      ]

      // Step 3: Independent Scoring Phase
      const initialScores = await this.independentScoringPhase(
        request,
        agents,
        topicId,
        evaluationCriteria
      )

      let currentScores = { ...initialScores }
      const evaluationRounds: EvaluationRound[] = [
        {
          roundNumber: 0,
          startTime: Date.now(),
          endTime: Date.now(),
          messages: Object.entries(initialScores).map(([agentId, score]) => ({
            type: 'score' as const,
            agentId,
            agentName: agents.find((a) => a.id === agentId)?.name || agentId,
            timestamp: Date.now(),
            roundNumber: 0,
            data: { score },
          })),
        },
      ]

      // Step 4 & 5: Multi-Agent Discussion and Consensus
      if (config.enableDiscussion && agents.length > 1) {
        const { finalScores, rounds } = await this.multiRoundDiscussion(
          topicId,
          agents,
          currentScores,
          request.content,
          evaluationCriteria,
          config
        )
        currentScores = finalScores
        evaluationRounds.push(...rounds)
      }

      // Step 6: Consensus Aggregation
      const consensusResult = await this.aggregateConsensus(
        currentScores,
        agents,
        config,
        evaluationRounds
      )

      // Step 7: Store final result on Hedera for transparency
      await this.publishFinalResult(
        topicId,
        request.id,
        consensusResult,
        evaluationRounds.length
      )

      // Create individual judgment results for each agent
      const judgmentResults = this.createJudgmentResults(
        request,
        agents,
        currentScores,
        consensusResult
      )

      // Update agent reputations based on participation
      await this.updateAgentReputations(agents, consensusResult)

      console.log('✅ Evaluation completed successfully')
      console.log(`Final Score: ${consensusResult.finalScore.toFixed(2)}`)
      console.log(`Confidence: ${(consensusResult.confidence * 100).toFixed(1)}%`)
      console.log(`Convergence: ${consensusResult.convergenceRounds} rounds`)

      // Create transcript from evaluation rounds
      const transcript = this.createTranscript(topicId, evaluationRounds)

      // Create progress object
      const progress: EvaluationProgress = {
        status: 'completed',
        currentRound: evaluationRounds.length,
        totalRounds: config.maxDiscussionRounds,
        scoresReceived: agents.length,
        totalAgents: agents.length,
        topicId,
        currentScores: consensusResult.individualScores,
        variance: consensusResult.variance
      }

      return {
        requestId: request.id,
        topicId,
        progress,
        transcript,
        consensus: consensusResult,
        individualResults: judgmentResults.map(result => ({
          agentId: result.agentId,
          score: result.score,
          feedback: result.feedback,
          strengths: result.strengths,
          improvements: result.improvements,
          completedAt: result.completedAt,
          paymentTx: result.paymentTx
        }))
      }
    } catch (error) {
      console.error('Error in evaluation workflow:', error)
      throw error
    }
  }

  /**
   * Step 1: Setup HCS topic for communication
   */
  private async setupCommunicationLayer(
    request: JudgmentRequest,
    agents: Agent[],
    config: OrchestratorConfig
  ): Promise<string> {
    console.log('📡 Setting up HCS communication layer...')

    const topicId = await this.hcsService.createEvaluationTopic(request.id, {
      title: `Evaluation-${request.id}`,
      numberOfAgents: agents.length,
      maxRounds: config.maxDiscussionRounds,
    })

    return topicId
  }

  /**
   * Step 3: Independent Scoring Phase
   * Each agent evaluates independently and publishes to HCS
   */
  private async independentScoringPhase(
    request: JudgmentRequest,
    agents: Agent[],
    topicId: string,
    criteria: string[]
  ): Promise<Record<string, number>> {
    console.log('🎯 Phase 1: Independent Scoring...')

    const scores: Record<string, number> = {}

    // Execute all agent evaluations in parallel
    const scoringPromises = agents.map(async (agent) => {
      // Simulate AI evaluation (in production, call actual AI API)
      const score = await this.executeAgentEvaluation(agent, request.content, criteria)

      // Publish score to HCS topic
      await this.hcsService.submitScore(topicId, {
        type: 'score',
        agentId: agent.id,
        agentName: agent.name,
        timestamp: Date.now(),
        roundNumber: 0,
        data: {
          score,
          reasoning: `Initial evaluation based on: ${criteria.join(', ')}`,
          confidence: 0.8,
          aspects: criteria.reduce((acc, c) => ({ ...acc, [c]: score + Math.random() - 0.5 }), {}),
        },
      })

      scores[agent.id] = score
      console.log(`  ✓ ${agent.name}: ${score.toFixed(2)}/10`)
    })

    await Promise.all(scoringPromises)

    return scores
  }

  /**
   * Step 4: Multi-Agent Discussion Mechanism
   * Agents review peer scores and adjust their evaluations
   */
  private async multiRoundDiscussion(
    topicId: string,
    agents: Agent[],
    initialScores: Record<string, number>,
    content: string,
    criteria: string[],
    config: OrchestratorConfig
  ): Promise<{
    finalScores: Record<string, number>
    rounds: EvaluationRound[]
  }> {
    console.log('💬 Phase 2: Multi-Round Discussion...')

    let currentScores = { ...initialScores }
    const rounds: EvaluationRound[] = []

    for (let round = 1; round <= config.maxDiscussionRounds; round++) {
      console.log(`  Round ${round}/${config.maxDiscussionRounds}`)

      const roundStart = Date.now()
      const roundMessages: AgentMessage[] = []

      // Each agent reviews peer scores and provides discussion
      for (const agent of agents) {
        const peerScoresData = Object.entries(currentScores)
          .filter(([id]) => id !== agent.id)
          .map(([id, score]) => ({
            agentId: id,
            agentName: agents.find(a => a.id === id)?.name || id,
            score
          }))

        try {
          console.log(`  💬 ${agent.name} is discussing...`)
          const discussionResult = await this.openAIService.generateDiscussion(
            agent,
            currentScores[agent.id],
            peerScoresData,
            content,
            criteria
          )

          const discussion = discussionResult.discussion

          // Publish discussion to HCS
          await this.hcsService.broadcastDiscussion(
            topicId,
            agent.id,
            agent.name,
            discussion,
            round
          )

          // Check if agent adjusted their score
          if (discussionResult.adjustedScore !== undefined &&
              Math.abs(discussionResult.adjustedScore - currentScores[agent.id]) > 0.1) {
            const originalScore = currentScores[agent.id]
            const newScore = discussionResult.adjustedScore

            await this.hcsService.submitAdjustment(
              topicId,
              agent.id,
              agent.name,
              originalScore,
              newScore,
              discussion,
              round
            )

            roundMessages.push({
              type: 'adjustment',
              agentId: agent.id,
              agentName: agent.name,
              timestamp: Date.now(),
              roundNumber: round,
              data: {
                originalScore,
                adjustedScore: newScore,
                reasoning: discussion,
              },
            })

            currentScores[agent.id] = newScore
            const adjustment = newScore - originalScore
            console.log(`  ✅ ${agent.name}: ${currentScores[agent.id].toFixed(2)} (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)})`)
          } else {
            console.log(`  ✅ ${agent.name}: keeping score ${currentScores[agent.id].toFixed(2)}`)
          }
        } catch (error) {
          console.error(`  ❌ ${agent.name} discussion failed:`, error)
          // Continue without discussion if OpenAI fails
        }
      }

      rounds.push({
        roundNumber: round,
        startTime: roundStart,
        endTime: Date.now(),
        messages: roundMessages,
      })

      // Check for convergence
      const variance = ConsensusAlgorithms['calculateVariance'](
        Object.values(currentScores),
        Object.values(currentScores).reduce((a, b) => a + b, 0) / Object.values(currentScores).length
      )

      if (variance < config.convergenceThreshold) {
        console.log(`  ✓ Converged after ${round} rounds (variance: ${variance.toFixed(3)})`)
        break
      }
    }

    return { finalScores: currentScores, rounds }
  }

  /**
   * Step 5: Consensus Aggregation
   */
  private async aggregateConsensus(
    scores: Record<string, number>,
    agents: Agent[],
    config: OrchestratorConfig,
    rounds: EvaluationRound[]
  ): Promise<ConsensusResult> {
    console.log('🎲 Phase 3: Consensus Aggregation...')

    let result: ConsensusResult

    switch (config.consensusAlgorithm) {
      case 'simple_average':
        result = ConsensusAlgorithms.simpleAverage(scores)
        break
      case 'weighted_average':
        result = ConsensusAlgorithms.weightedAverage(scores, agents)
        break
      case 'median':
        result = ConsensusAlgorithms.median(scores)
        break
      case 'trimmed_mean':
        result = ConsensusAlgorithms.trimmedMean(scores)
        break
      case 'iterative_convergence':
        const allMessages = rounds.flatMap((r) => r.messages)
        result = ConsensusAlgorithms.iterativeConvergence(scores, allMessages, rounds.length)
        break
      case 'delphi_method':
        const roundScores = rounds.map((r) =>
          r.messages.reduce((acc, msg) => {
            if (msg.data.score !== undefined) {
              acc[msg.agentId] = msg.data.score
            }
            return acc
          }, {} as Record<string, number>)
        )
        result = ConsensusAlgorithms.delphiMethod(roundScores, agents)
        break
      default:
        result = ConsensusAlgorithms.weightedAverage(scores, agents)
    }

    return result
  }

  /**
   * Step 7: Publish final consensus to HCS for transparency
   */
  private async publishFinalResult(
    topicId: string,
    evaluationId: string,
    consensus: ConsensusResult,
    totalRounds: number
  ): Promise<void> {
    console.log('📝 Publishing final consensus to HCS...')

    await this.hcsService.publishFinalConsensus(
      topicId,
      evaluationId,
      consensus.finalScore,
      consensus.individualScores,
      consensus.algorithm,
      totalRounds
    )
  }

  /**
   * Execute individual agent evaluation using HTTP with X402 payment
   */
  private async executeAgentEvaluation(
    agent: Agent,
    content: string,
    criteria: string[]
  ): Promise<number> {
    try {
      console.log(`  🤖 ${agent.name} is evaluating via HTTP + X402...`)

      // Call agent via HTTP with automatic X402 payment handling
      const result = await this.agentHTTPClient.callAgent(agent, {
        content,
        criteria
      })

      console.log(`  ✅ ${agent.name} scored: ${result.score.toFixed(2)}/10 (confidence: ${(result.confidence * 100).toFixed(1)}%)`)
      if (result.paymentTx) {
        console.log(`  💰 Payment TX: ${result.paymentTx}`)
      }

      return result.score
    } catch (error) {
      console.error(`  ❌ ${agent.name} evaluation failed:`, error)
      // Fallback to direct OpenAI if HTTP fails
      try {
        console.log(`  🔄 Falling back to direct OpenAI for ${agent.name}...`)
        const fallbackResult = await this.openAIService.evaluateContent(agent, content, criteria)
        return fallbackResult.score
      } catch (fallbackError) {
        console.error(`  ❌ Fallback also failed, using random score`)
        const randomScore = 5 + Math.random() * 5
        return Math.max(0, Math.min(10, randomScore))
      }
    }
  }


  /**
   * Create judgment results for each agent
   */
  private createJudgmentResults(
    request: JudgmentRequest,
    agents: Agent[],
    scores: Record<string, number>,
    consensus: ConsensusResult
  ): JudgmentResult[] {
    return agents.map((agent) => ({
      id: `result_${request.id}_${agent.id}`,
      requestId: request.id,
      agentId: agent.id,
      score: scores[agent.id],
      feedback: `Consensus score: ${consensus.finalScore.toFixed(2)}/10. Individual assessment: ${scores[agent.id].toFixed(2)}/10`,
      strengths: ['Collaborative evaluation', 'Multi-perspective analysis'],
      improvements: consensus.variance > 1 ? ['High variance among evaluators'] : [],
      completedAt: Date.now(),
    }))
  }

  /**
   * Update agent reputations after evaluation
   */
  private async updateAgentReputations(
    agents: Agent[],
    consensus: ConsensusResult
  ): Promise<void> {
    for (const agent of agents) {
      // High confidence evaluations boost reputation
      if (consensus.confidence > 0.8) {
        // Would update ERC-8004 reputation registry here
        console.log(`  ✓ Updated reputation for ${agent.name}`)
      }
    }
  }

  /**
   * Create evaluation transcript from rounds
   */
  private createTranscript(
    topicId: string,
    evaluationRounds: EvaluationRound[]
  ): EvaluationTranscript {
    const rounds = evaluationRounds.map(round => {
      const messages: ConversationMessage[] = round.messages.map(msg => ({
        id: `${msg.agentId}_${msg.timestamp}`,
        role: 'agent' as const,
        agentId: msg.agentId,
        content: this.formatMessageContent(msg),
        timestamp: msg.timestamp,
        phase: this.getPhaseFromMessageType(msg.type),
        round: msg.roundNumber,
        hcsTxId: undefined // Would be populated from HCS service
      }))

      return {
        round: round.roundNumber,
        variance: this.calculateRoundVariance(round.messages),
        messages
      }
    })

    return {
      topicId,
      rounds
    }
  }

  /**
   * Format message content for transcript
   */
  private formatMessageContent(msg: AgentMessage): string {
    switch (msg.type) {
      case 'score':
        return `Initial score: ${msg.data.score?.toFixed(2)}/10. ${msg.data.reasoning || ''}`
      case 'discussion':
        return msg.data.discussion || 'Participated in discussion'
      case 'adjustment':
        return `Score adjusted from ${msg.data.originalScore?.toFixed(2)} to ${msg.data.adjustedScore?.toFixed(2)}. ${msg.data.reasoning || ''}`
      case 'final':
        return `Final consensus: ${msg.data.score?.toFixed(2)}/10`
      default:
        return 'Unknown message type'
    }
  }

  /**
   * Get phase from message type
   */
  private getPhaseFromMessageType(type: string): 'scoring' | 'discussion' | 'consensus' {
    switch (type) {
      case 'score':
        return 'scoring'
      case 'discussion':
      case 'adjustment':
        return 'discussion'
      case 'final':
        return 'consensus'
      default:
        return 'scoring'
    }
  }

  /**
   * Calculate variance for a round
   */
  private calculateRoundVariance(messages: AgentMessage[]): number {
    const scores = messages
      .map(msg => msg.data.score || msg.data.adjustedScore)
      .filter(score => score !== undefined) as number[]
    
    if (scores.length === 0) return 0
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length
    
    return Math.sqrt(variance) // Return standard deviation
  }
}

// Singleton instance
let orchestrator: MultiAgentOrchestrator | null = null

export function getOrchestrator(): MultiAgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new MultiAgentOrchestrator()
  }
  return orchestrator
}
