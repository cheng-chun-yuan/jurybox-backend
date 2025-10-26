/**
 * Consensus Utilities
 * Shared helper functions for consensus algorithms
 */

import type { ERC8004Reputation } from '../../domain/types'

/**
 * Calculate variance of scores
 */
export function calculateVariance(values: number[], mean: number): number {
  if (values.length === 0) return 0
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate confidence based on variance (low variance = high confidence)
 */
export function calculateConfidence(variance: number): number {
  // Confidence decreases as variance increases
  // Max confidence (1.0) when variance is 0
  // Min confidence (0.0) when variance is very high
  return Math.max(0, 1 - variance / 10)
}

/**
 * Calculate agent weight based on reputation
 */
export function calculateAgentWeight(reputation: ERC8004Reputation): number {
  // Weight formula: (avgRating / 10) * (1 + log(completedJudgments + 1)) * successRate
  const ratingWeight = reputation.averageRating / 10
  const experienceWeight = 1 + Math.log(reputation.completedJudgments + 1) / 5
  const successWeight = reputation.successRate || 1

  return ratingWeight * experienceWeight * successWeight
}

/**
 * Detect and handle outlier scores using z-score
 */
export function detectOutliers(
  scores: Record<string, number>,
  zScoreThreshold: number = 2
): {
  outliers: string[]
  cleanScores: Record<string, number>
} {
  const values = Object.values(scores)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = calculateVariance(values, mean)
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
export function calculateConvergence(
  initialScores: Record<string, number>,
  finalScores: Record<string, number>
): number {
  const initialVariance = calculateVariance(
    Object.values(initialScores),
    Object.values(initialScores).reduce((a, b) => a + b, 0) /
      Object.values(initialScores).length
  )

  const finalVariance = calculateVariance(
    Object.values(finalScores),
    Object.values(finalScores).reduce((a, b) => a + b, 0) /
      Object.values(finalScores).length
  )

  if (initialVariance === 0) return 1

  return Math.max(0, (initialVariance - finalVariance) / initialVariance)
}
