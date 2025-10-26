/**
 * Trimmed Mean Consensus Algorithm
 * Remove outliers then average
 */

import type { ConsensusResult, IConsensusAlgorithm } from '../consensus.interface'
import { calculateVariance, calculateConfidence } from '../consensus.util'
import { CONSENSUS_DEFAULTS } from '../../../shared/constants'

export class TrimmedMeanAlgorithm implements IConsensusAlgorithm {
  constructor(private trimPercent: number = CONSENSUS_DEFAULTS.TRIMMED_PERCENTAGE) {}

  calculate(scores: Record<string, number>): ConsensusResult {
    const values = Object.values(scores).sort((a, b) => a - b)
    const trimCount = Math.floor(values.length * this.trimPercent)

    const trimmedValues = values.slice(trimCount, values.length - trimCount)
    const sum = trimmedValues.reduce((a, b) => a + b, 0)
    const finalScore = sum / trimmedValues.length

    const variance = calculateVariance(trimmedValues, finalScore)

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
    return 'trimmed_mean'
  }
}
