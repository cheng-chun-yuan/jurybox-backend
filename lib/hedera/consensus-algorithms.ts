/**
 * Consensus Algorithms for Multi-Agent Score Aggregation
 * Implements various methods to reach consensus from multiple agent scores
 */

import type { Agent, ERC8004Reputation } from '../../types/agent'
import type { AgentMessage } from './hcs-communication'

export interface ConsensusResult {
  finalScore: number
  algorithm: string
  individualScores: Record<string, number>
  weights?: Record<string, number>
  confidence: number
  variance: number
  convergenceRounds: number
}

export class ConsensusAlgorithms {
  /**
   * Simple Average - Equal weight for all agents
   */
  static simpleAverage(scores: Record<string, number>): ConsensusResult {
    const values = Object.values(scores)
    const sum = values.reduce((a, b) => a + b, 0)
    const finalScore = sum / values.length

    const variance = this.calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: 'simple_average',
      individualScores: scores,
      confidence: this.calculateConfidence(variance),
      variance,
      convergenceRounds: 1,
    }
  }

  /**
   * Weighted Average - Based on agent reputation
   */
  static weightedAverage(
    scores: Record<string, number>,
    agents: Agent[]
  ): ConsensusResult {
    const weights: Record<string, number> = {}
    let totalWeight = 0
    let weightedSum = 0

    // Calculate weights based on reputation
    agents.forEach((agent) => {
      const weight = this.calculateAgentWeight(agent.reputation)
      weights[agent.id] = weight
      totalWeight += weight
      weightedSum += (scores[agent.id] || 0) * weight
    })

    const finalScore = weightedSum / totalWeight
    const values = Object.values(scores)
    const variance = this.calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: 'weighted_average',
      individualScores: scores,
      weights,
      confidence: this.calculateConfidence(variance),
      variance,
      convergenceRounds: 1,
    }
  }

  /**
   * Median - Robust to outliers
   */
  static median(scores: Record<string, number>): ConsensusResult {
    const values = Object.values(scores).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)

    const finalScore =
      values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid]

    const variance = this.calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: 'median',
      individualScores: scores,
      confidence: this.calculateConfidence(variance),
      variance,
      convergenceRounds: 1,
    }
  }

  /**
   * Trimmed Mean - Remove outliers then average
   */
  static trimmedMean(
    scores: Record<string, number>,
    trimPercent: number = 0.2
  ): ConsensusResult {
    const values = Object.values(scores).sort((a, b) => a - b)
    const trimCount = Math.floor(values.length * trimPercent)

    const trimmedValues = values.slice(trimCount, values.length - trimCount)
    const sum = trimmedValues.reduce((a, b) => a + b, 0)
    const finalScore = sum / trimmedValues.length

    const variance = this.calculateVariance(trimmedValues, finalScore)

    return {
      finalScore,
      algorithm: 'trimmed_mean',
      individualScores: scores,
      confidence: this.calculateConfidence(variance),
      variance,
      convergenceRounds: 1,
    }
  }

  /**
   * Iterative Convergence - Agents adjust scores based on peer feedback
   */
  static iterativeConvergence(
    initialScores: Record<string, number>,
    discussionMessages: AgentMessage[],
    maxRounds: number
  ): ConsensusResult {
    let currentScores = { ...initialScores }
    let round = 0

    // Track score changes across rounds
    for (round = 1; round <= maxRounds; round++) {
      const roundMessages = discussionMessages.filter(
        (m) => m.roundNumber === round && m.type === 'adjustment'
      )

      if (roundMessages.length === 0) break

      // Update scores based on adjustments
      roundMessages.forEach((msg) => {
        if (msg.data.adjustedScore !== undefined) {
          currentScores[msg.agentId] = msg.data.adjustedScore
        }
      })

      // Check for convergence
      const values = Object.values(currentScores)
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = this.calculateVariance(values, mean)

      // If variance is low, we've converged
      if (variance < 0.5) break
    }

    const values = Object.values(currentScores)
    const finalScore = values.reduce((a, b) => a + b, 0) / values.length
    const variance = this.calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: 'iterative_convergence',
      individualScores: currentScores,
      confidence: this.calculateConfidence(variance),
      variance,
      convergenceRounds: round,
    }
  }

  /**
   * Majority Voting - For categorical decisions
   */
  static majorityVoting(
    scores: Record<string, number>,
    threshold: number = 5
  ): ConsensusResult {
    // Convert scores to binary (above/below threshold)
    const votes = Object.entries(scores).reduce(
      (acc, [agentId, score]) => {
        const vote = score >= threshold ? 'pass' : 'fail'
        acc[vote] = (acc[vote] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const finalScore = (votes.pass || 0) > (votes.fail || 0) ? threshold + 2 : threshold - 2
    const values = Object.values(scores)
    const variance = this.calculateVariance(values, finalScore)

    return {
      finalScore,
      algorithm: 'majority_voting',
      individualScores: scores,
      confidence: Math.max(votes.pass || 0, votes.fail || 0) / Object.values(scores).length,
      variance,
      convergenceRounds: 1,
    }
  }

  /**
   * Delphi Method - Iterative with anonymous feedback
   */
  static delphiMethod(
    rounds: Array<Record<string, number>>,
    agents: Agent[]
  ): ConsensusResult {
    // Use the final round scores with weighted average
    const finalRoundScores = rounds[rounds.length - 1]
    const result = this.weightedAverage(finalRoundScores, agents)

    return {
      ...result,
      algorithm: 'delphi_method',
      convergenceRounds: rounds.length,
    }
  }

  /**
   * Calculate agent weight based on reputation
   */
  private static calculateAgentWeight(reputation: ERC8004Reputation): number {
    // Weight formula: (avgRating / 10) * (1 + log(completedJudgments + 1)) * successRate
    const ratingWeight = reputation.averageRating / 10
    const experienceWeight = 1 + Math.log(reputation.completedJudgments + 1) / 5
    const successWeight = reputation.successRate || 1

    return ratingWeight * experienceWeight * successWeight
  }

  /**
   * Calculate variance of scores
   */
  private static calculateVariance(
    values: number[],
    mean: number
  ): number {
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  }

  /**
   * Calculate confidence based on variance (low variance = high confidence)
   */
  private static calculateConfidence(variance: number): number {
    // Confidence decreases as variance increases
    // Max confidence (1.0) when variance is 0
    // Min confidence (0.0) when variance is very high
    return Math.max(0, 1 - variance / 10)
  }

  /**
   * Detect and handle outlier scores
   */
  static detectOutliers(
    scores: Record<string, number>,
    zScoreThreshold: number = 2
  ): {
    outliers: string[]
    cleanScores: Record<string, number>
  } {
    const values = Object.values(scores)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = this.calculateVariance(values, mean)
    const stdDev = Math.sqrt(variance)

    const outliers: string[] = []
    const cleanScores: Record<string, number> = {}

    Object.entries(scores).forEach(([agentId, score]) => {
      const zScore = Math.abs((score - mean) / stdDev)
      if (zScore > zScoreThreshold) {
        outliers.push(agentId)
      } else {
        cleanScores[agentId] = score
      }
    })

    return { outliers, cleanScores }
  }

  /**
   * Calculate score convergence metric
   * Returns 0-1 value indicating how much scores converged
   */
  static calculateConvergence(
    initialScores: Record<string, number>,
    finalScores: Record<string, number>
  ): number {
    const initialVariance = this.calculateVariance(
      Object.values(initialScores),
      Object.values(initialScores).reduce((a, b) => a + b, 0) /
        Object.values(initialScores).length
    )

    const finalVariance = this.calculateVariance(
      Object.values(finalScores),
      Object.values(finalScores).reduce((a, b) => a + b, 0) /
        Object.values(finalScores).length
    )

    if (initialVariance === 0) return 1

    return Math.max(0, (initialVariance - finalVariance) / initialVariance)
  }
}
