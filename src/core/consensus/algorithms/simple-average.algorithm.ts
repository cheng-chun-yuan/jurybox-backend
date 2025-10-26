/**
 * Simple Average Consensus Algorithm
 * Equal weight for all agents
 */

import type { ConsensusResult, IConsensusAlgorithm } from '../consensus.interface'
import { calculateVariance, calculateConfidence } from '../consensus.util'

export class SimpleAverageAlgorithm implements IConsensusAlgorithm {
  calculate(scores: Record<string, number>): ConsensusResult {
    const values = Object.values(scores)
    const sum = values.reduce((a, b) => a + b, 0)
    const finalScore = sum / values.length

    const variance = calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: this.getName(),
      individualScores: scores,
      confidence: calculateConfidence(variance),
      variance,
      convergenceRounds: 1,
    }
  }

  getName(): string {
    return 'simple_average'
  }
}
