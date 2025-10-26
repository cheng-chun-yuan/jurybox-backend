/**
 * Agent Domain Types
 * Core agent-related type definitions
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

export interface Judge {
  id: number
  name: string
  title: string
  tagline: string
  rating: number
  reviews: number
  price: number  // HBAR per judgment
  specialties: string[]
  color: 'purple' | 'cyan' | 'gold'
  avatar: string  // URL to avatar image
  trending?: boolean
  bio: string
  expertise: string[]
  achievements: string[]
  sampleReviews: Array<{
    rating: number
    comment: string
    author: string
    date: string
  }>
}

// Agent HTTP chat types for X402 payment protocol
export interface AgentChatRequest {
  content: string
  criteria?: string[]
  metadata?: Record<string, any>
}

export interface AgentChatResponse {
  score: number
  reasoning: string
  confidence: number
  aspects?: Record<string, number>
  paymentTx?: string // X402 payment transaction ID
}
