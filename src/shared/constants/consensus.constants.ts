/**
 * Consensus Algorithm Constants
 */

export const ConsensusAlgorithm = {
  SIMPLE_AVERAGE: 'simple_average',
  WEIGHTED_AVERAGE: 'weighted_average',
  MEDIAN: 'median',
  TRIMMED_MEAN: 'trimmed_mean',
  ITERATIVE_CONVERGENCE: 'iterative_convergence',
  DELPHI_METHOD: 'delphi_method',
} as const

export type ConsensusAlgorithmType = typeof ConsensusAlgorithm[keyof typeof ConsensusAlgorithm]

export const CONSENSUS_DEFAULTS = {
  MAX_DISCUSSION_ROUNDS: 3,
  ROUND_TIMEOUT: 60000, // 60 seconds
  CONVERGENCE_THRESHOLD: 0.5,
  OUTLIER_DETECTION: true,
  ENABLE_DISCUSSION: true,
  MIN_CONFIDENCE: 0.7,
  TRIMMED_PERCENTAGE: 0.1, // 10% trimmed from each end
} as const

export const EVALUATION_CRITERIA = {
  DEFAULT: ['Accuracy', 'Clarity', 'Completeness', 'Relevance'],
  MIN_CRITERIA: 1,
  MAX_CRITERIA: 10,
} as const

export const SCORE_BOUNDS = {
  MIN: 0,
  MAX: 10,
  DEFAULT: 5,
} as const
