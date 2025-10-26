/**
 * AI Service Interface
 * Abstraction for different AI providers (OpenAI, Anthropic, etc.)
 */

import type { Agent } from '../../domain/types'

export interface EvaluationResult {
  score: number
  reasoning: string
  confidence: number
  aspects: Record<string, number>
}

export interface DiscussionResult {
  discussion: string
  adjustedScore?: number
}

export interface PeerScore {
  agentId: string
  agentName: string
  score: number
}

export interface IAIService {
  /**
   * Evaluate content using AI
   */
  evaluateContent(agent: Agent, content: string, criteria: string[]): Promise<EvaluationResult>

  /**
   * Generate discussion based on peer scores
   */
  generateDiscussion(
    agent: Agent,
    myScore: number,
    peerScores: PeerScore[],
    content: string,
    criteria: string[]
  ): Promise<DiscussionResult>
}
