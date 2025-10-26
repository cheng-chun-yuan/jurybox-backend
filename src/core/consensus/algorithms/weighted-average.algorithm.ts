/**
 * Weighted Average Consensus Algorithm
 * Based on agent reputation
 */

import type { Agent } from '../../../domain/types'
import type { ConsensusResult, IConsensusAlgorithm } from '../consensus.interface'
import { calculateVariance, calculateConfidence, calculateAgentWeight } from '../consensus.util'

export class WeightedAverageAlgorithm implements IConsensusAlgorithm {
  calculate(scores: Record<string, number>, agents: Agent[]): ConsensusResult {
    const weights: Record<string, number> = {}
    let totalWeight = 0
    let weightedSum = 0

    // Calculate weights based on reputation
    agents.forEach((agent) => {
      const weight = calculateAgentWeight(agent.reputation)
      weights[agent.id] = weight
      totalWeight += weight
      weightedSum += (scores[agent.id] || 0) * weight
    })

    const finalScore = weightedSum / totalWeight
    const values = Object.values(scores)
    const variance = calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: this.getName(),
      individualScores: scores,
      weights,
      confidence: calculateConfidence(variance),
      variance,
      convergenceRounds: 1,
    }
  }

  getName(): string {
    return 'weighted_average'
  }
}
