/**
 * Agent types for the Jury Box platform
 * Integrating Hedera Agent Kit, X402 payments, and ERC-8004 registry
 */

export interface HederaAccountInfo {
  accountId: string
  publicKey: string
  privateKey?: string // Only stored securely on creator's side
  balance: number
}

export interface X402PaymentConfig {
  enabled: boolean
  acceptedTokens: string[] // Token IDs that the agent accepts
  pricePerJudgment: number
  paymentAddress: string
  minimumPayment?: number
}

export interface ERC8004Identity {
  registryId: string
  agentId: string
  chainId?: number
  verified: boolean
  registeredAt: number
}

export interface ERC8004Reputation {
  totalReviews: number
  averageRating: number
  completedJudgments: number
  successRate: number
  lastUpdated: number
}

export interface AgentCapabilities {
  specialties: string[]
  languages: string[]
  modelProvider: 'openai' | 'anthropic' | 'groq' | 'ollama'
  modelName: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface Agent {
  id: string
  name: string
  title: string
  tagline: string
  bio: string
  avatar: string
  color: 'purple' | 'cyan' | 'gold'

  // Hedera integration
  hederaAccount: HederaAccountInfo

  // Payment integration (X402)
  paymentConfig: X402PaymentConfig

  // ERC-8004 identity and reputation
  identity: ERC8004Identity
  reputation: ERC8004Reputation

  // Agent capabilities
  capabilities: AgentCapabilities

  // Metadata
  createdBy: string
  createdAt: number
  updatedAt: number
  isActive: boolean
  trending?: boolean
  featured?: boolean
}

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

export interface PaymentRequest {
  amount: number
  token: string
  from: string
  to: string
  agentId: string
  judgmentRequestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  txHash?: string
  createdAt: number
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
