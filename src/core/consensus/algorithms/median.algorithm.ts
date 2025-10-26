/**
 * Median Consensus Algorithm
 * Robust to outliers
 */

import type { ConsensusResult, IConsensusAlgorithm } from '../consensus.interface'
import { calculateVariance, calculateConfidence } from '../consensus.util'

export class MedianAlgorithm implements IConsensusAlgorithm {
  calculate(scores: Record<string, number>): ConsensusResult {
    const values = Object.values(scores).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)

    const finalScore =
      values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]

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
    return 'median'
  }
}
