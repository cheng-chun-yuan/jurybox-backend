/**
 * Consensus Interface
 * Defines the contract for consensus algorithms
 */

export interface ConsensusResult {
  finalScore: number
  algorithm: string
  individualScores: Record<string, number>
  weights?: Record<string, number>
  confidence: number
  variance: number
  convergenceRounds: number
}

export interface IConsensusAlgorithm {
  /**
   * Calculate consensus from scores
   */
  calculate(scores: Record<string, number>, metadata?: any): ConsensusResult

  /**
   * Get algorithm name
   */
  getName(): string
}
