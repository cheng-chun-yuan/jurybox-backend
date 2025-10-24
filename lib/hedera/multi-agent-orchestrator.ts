/**
 * Multi-Agent Orchestrator
 * Coordinates the evaluation workflow with HCS-based communication
 * Implements the complete multi-agent evaluation system on Hedera
 */

import type { Agent, JudgmentRequest, JudgmentResult } from '../../types/agent'
import { getHCSService, type AgentMessage, type EvaluationRound } from './hcs-communication'
import { ConsensusAlgorithms, type ConsensusResult } from './consensus-algorithms'
import { getX402Service } from '../x402/payment-service'
import { getViemRegistryService } from '../erc8004/viem-registry-service'

export interface OrchestratorConfig {
  maxDiscussionRounds: number
  roundTimeout: number // milliseconds
  consensusAlgorithm: 'simple_average' | 'weighted_average' | 'median' | 'trimmed_mean' | 'iterative_convergence' | 'delphi_method'
  enableDiscussion: boolean
  convergenceThreshold: number
  outlierDetection: boolean
}

export interface EvaluationProgress {
  status: 'initializing' | 'scoring' | 'discussing' | 'converging' | 'completed' | 'failed'
  currentRound: number
  totalRounds: number
  scoresReceived: number
  totalAgents: number
  topicId?: string
  messages: AgentMessage[]
}

export class MultiAgentOrchestrator {
  private hcsService = getHCSService()
  private x402Service = getX402Service()
  private registryService = getViemRegistryService()

  /**
   * Execute complete multi-agent evaluation workflow
   * Following the 7-step process described in the documentation
   */
  async executeEvaluation(
    request: JudgmentRequest,
    agents: Agent[],
    config: OrchestratorConfig
  ): Promise<{
    consensusResult: ConsensusResult
    judgmentResults: JudgmentResult[]
    evaluationRounds: EvaluationRound[]
    topicId: string
  }> {
    console.log('🚀 Starting Multi-Agent Evaluation Orchestrator')
    console.log(`Agents: ${agents.map((a) => a.name).join(', ')}`)
    console.log(`Algorithm: ${config.consensusAlgorithm}`)

    // Step 1: Setup Environment and Communication Layer
    const topicId = await this.setupCommunicationLayer(request, agents, config)

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

      return {
        consensusResult,
        judgmentResults,
        evaluationRounds,
        topicId,
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
        const peerScores = Object.entries(currentScores).filter(
          ([id]) => id !== agent.id
        )

        const discussion = this.generateAgentDiscussion(
          agent,
          currentScores[agent.id],
          peerScores,
          content
        )

        // Publish discussion to HCS
        await this.hcsService.broadcastDiscussion(
          topicId,
          agent.id,
          agent.name,
          discussion,
          round
        )

        // Agent may adjust score based on peer feedback
        const adjustment = this.calculateScoreAdjustment(
          currentScores[agent.id],
          peerScores.map(([_, score]) => score),
          config.convergenceThreshold
        )

        if (Math.abs(adjustment) > 0.1) {
          const newScore = Math.max(0, Math.min(10, currentScores[agent.id] + adjustment))

          await this.hcsService.submitAdjustment(
            topicId,
            agent.id,
            agent.name,
            currentScores[agent.id],
            newScore,
            `Adjusted after considering peer evaluations`,
            round
          )

          roundMessages.push({
            type: 'adjustment',
            agentId: agent.id,
            agentName: agent.name,
            timestamp: Date.now(),
            roundNumber: round,
            data: {
              originalScore: currentScores[agent.id],
              adjustedScore: newScore,
              reasoning: discussion,
            },
          })

          currentScores[agent.id] = newScore
          console.log(`    ${agent.name}: ${currentScores[agent.id].toFixed(2)} (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)})`)
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
   * Execute individual agent evaluation using AI
   */
  private async executeAgentEvaluation(
    agent: Agent,
    content: string,
    criteria: string[]
  ): Promise<number> {
    // In production, this would call the actual AI model via API
    // For now, simulate evaluation with realistic variance
    const baseScore = 5 + Math.random() * 5 // 5-10 range
    const agentBias = agent.reputation.averageRating / 10 // Slight bias based on reputation
    const randomVariance = (Math.random() - 0.5) * 2 // -1 to +1

    return Math.max(0, Math.min(10, baseScore + agentBias + randomVariance))
  }

  /**
   * Generate agent discussion based on peer scores
   */
  private generateAgentDiscussion(
    agent: Agent,
    myScore: number,
    peerScores: [string, number][],
    content: string
  ): string {
    const avgPeerScore = peerScores.reduce((sum, [_, score]) => sum + score, 0) / peerScores.length
    const diff = myScore - avgPeerScore

    if (Math.abs(diff) < 0.5) {
      return `I agree with the consensus. The evaluation appears well-balanced.`
    } else if (diff > 0) {
      return `I rated this higher than peers. I believe the ${agent.capabilities.specialties[0]} aspects deserve more recognition.`
    } else {
      return `I have concerns that peers may have overlooked. The ${agent.capabilities.specialties[0]} could be improved.`
    }
  }

  /**
   * Calculate score adjustment based on peer feedback
   */
  private calculateScoreAdjustment(
    myScore: number,
    peerScores: number[],
    convergenceThreshold: number
  ): number {
    const avgPeerScore = peerScores.reduce((a, b) => a + b, 0) / peerScores.length
    const diff = avgPeerScore - myScore

    // Move towards peer average, but not all the way
    return diff * 0.3 // Adjust by 30% of the difference
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
}

// Singleton instance
let orchestrator: MultiAgentOrchestrator | null = null

export function getOrchestrator(): MultiAgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new MultiAgentOrchestrator()
  }
  return orchestrator
}
