/**
 * Evaluation DTOs
 * Data Transfer Objects for evaluation operations with Zod validation
 */

import { z } from 'zod'
import { ConsensusAlgorithm } from '../../shared/constants'

// Request DTOs
export const ExecuteEvaluationInputSchema = z.object({
  request: z.object({
    id: z.string().min(1),
    content: z.string().min(1),
    criteria: z.array(z.string()).optional(),
    selectedAgents: z.array(z.any()), // Will be validated separately
    requestedBy: z.string(),
  }),
  config: z.object({
    maxDiscussionRounds: z.number().min(1).max(10),
    roundTimeout: z.number().min(10000).max(300000).optional(),
    consensusAlgorithm: z.enum([
      ConsensusAlgorithm.SIMPLE_AVERAGE,
      ConsensusAlgorithm.WEIGHTED_AVERAGE,
      ConsensusAlgorithm.MEDIAN,
      ConsensusAlgorithm.TRIMMED_MEAN,
      ConsensusAlgorithm.ITERATIVE_CONVERGENCE,
      ConsensusAlgorithm.DELPHI_METHOD,
    ] as const),
    enableDiscussion: z.boolean().optional(),
    convergenceThreshold: z.number().min(0).max(1).optional(),
    outlierDetection: z.boolean().optional(),
  }),
})

export type ExecuteEvaluationInput = z.infer<typeof ExecuteEvaluationInputSchema>

// Response DTOs
export interface ExecuteEvaluationOutput {
  evaluationId: string
  status: 'started' | 'completed' | 'failed'
  topicId?: string
  message: string
}

export interface GetProgressOutput {
  evaluationId: string
  progress: {
    status: string
    currentRound: number
    totalRounds: number
    scoresReceived: number
    totalAgents: number
    topicId?: string
    currentScores?: Record<string, number>
    variance?: number
  }
  isComplete: boolean
  result?: any
}

export interface GetResultOutput {
  requestId: string
  topicId: string
  consensus: {
    finalScore: number
    algorithm: string
    individualScores: Record<string, number>
    confidence: number
    variance: number
  }
  individualResults: Array<{
    agentId: string
    score: number
    feedback: string
    strengths: string[]
    improvements: string[]
  }>
}
