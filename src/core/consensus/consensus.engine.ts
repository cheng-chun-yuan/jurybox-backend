/**
 * Consensus Engine
 * Factory for selecting and executing consensus algorithms
 */

import type { Agent } from '../../domain/types'
import type { ConsensusResult } from './consensus.interface'
import { ConsensusAlgorithm, type ConsensusAlgorithmType } from '../../shared/constants'
import {
  SimpleAverageAlgorithm,
  WeightedAverageAlgorithm,
  MedianAlgorithm,
  TrimmedMeanAlgorithm,
} from './algorithms'

export class ConsensusEngine {
  /**
   * Calculate consensus using specified algorithm
   */
  static calculate(
    algorithm: ConsensusAlgorithmType,
    scores: Record<string, number>,
    agents?: Agent[]
  ): ConsensusResult {
    switch (algorithm) {
      case ConsensusAlgorithm.SIMPLE_AVERAGE:
        return new SimpleAverageAlgorithm().calculate(scores)

      case ConsensusAlgorithm.WEIGHTED_AVERAGE:
        if (!agents) {
          throw new Error('Agents required for weighted average algorithm')
        }
        return new WeightedAverageAlgorithm().calculate(scores, agents)

      case ConsensusAlgorithm.MEDIAN:
        return new MedianAlgorithm().calculate(scores)

      case ConsensusAlgorithm.TRIMMED_MEAN:
        return new TrimmedMeanAlgorithm().calculate(scores)

      default:
        // Default to simple average
        return new SimpleAverageAlgorithm().calculate(scores)
    }
  }

  /**
   * Get available algorithms
   */
  static getAvailableAlgorithms(): ConsensusAlgorithmType[] {
    return [
      ConsensusAlgorithm.SIMPLE_AVERAGE,
      ConsensusAlgorithm.WEIGHTED_AVERAGE,
      ConsensusAlgorithm.MEDIAN,
      ConsensusAlgorithm.TRIMMED_MEAN,
    ]
  }
}
