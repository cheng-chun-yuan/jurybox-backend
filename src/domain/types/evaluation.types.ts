/**
 * Evaluation Domain Types
 * Types related to evaluation, consensus, and orchestration
 */

import type { Agent } from './agent.types'

export interface JudgmentRequest {
  id: string
  content: string
  criteria?: string[]
  selectedAgents: Agent[]
  requestedBy: string
  createdAt: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface JudgmentResult {
  id: string
  requestId: string
  agentId: string
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  completedAt: number
  paymentTx?: string // Hedera transaction ID
}

export interface OrchestratorConfig {
  maxDiscussionRounds: number
  roundTimeout: number
  consensusAlgorithm: 'simple_average' | 'weighted_average' | 'median' | 'trimmed_mean' | 'iterative_convergence' | 'delphi_method'
  enableDiscussion: boolean
  convergenceThreshold: number
  outlierDetection: boolean
}

export interface EvaluationProgress {
  status: 'initializing' | 'scoring' | 'discussing' | 'converging' | 'completed' | 'failed'
  currentRound: number
  totalRounds: number
  scoresReceived: number
  totalAgents: number
  topicId?: string
  currentScores?: Record<string, number>
  variance?: number
}

export interface ConsensusResult {
  finalScore: number
  algorithm: string
  individualScores: Record<string, number>
  weights?: Record<string, number>
  confidence: number
  variance: number
  convergenceRounds: number
}

// Conversation transcript types for transparency
export interface ConversationMessage {
  id: string
  role: 'system' | 'agent' | 'orchestrator'
  agentId?: string
  content: string
  timestamp: number
  phase: 'scoring' | 'discussion' | 'consensus'
  round?: number
  hcsTxId?: string // Hedera Consensus Service message transaction id
}

export interface EvaluationTranscript {
  topicId: string // HCS topic id
  rounds: Array<{
    round: number
    variance?: number
    messages: ConversationMessage[]
  }>
}

// Orchestrator output structure
export interface OrchestratorOutput {
  requestId: string
  topicId: string
  progress: EvaluationProgress
  transcript: EvaluationTranscript
  consensus: ConsensusResult
  individualResults: Array<{
    agentId: string
    score: number
    feedback: string
    strengths: string[]
    improvements: string[]
    completedAt: number
    paymentTx?: string
  }>
}

export interface MultiAgentSystem {
  id: string
  name: string
  description: string
  agents: Agent[]
  workflow: 'parallel' | 'sequential' | 'hierarchical'
  totalCost: number
  createdBy: string
  createdAt: number
}
