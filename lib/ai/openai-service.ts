/**
 * OpenAI Service
 * Handles AI evaluation and discussion generation using OpenAI API
 */

import { ChatOpenAI } from '@langchain/openai'
import type { Agent } from '../../types/agent'

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

export class OpenAIService {
  private model: ChatOpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      openAIApiKey: apiKey,
    })
  }

  /**
   * Execute agent evaluation using OpenAI
   */
  async evaluateContent(
    agent: Agent,
    content: string,
    criteria: string[]
  ): Promise<EvaluationResult> {
    const systemPrompt = `You are ${agent.name}, ${agent.bio || 'an expert evaluator'}.
Your specialties include: ${agent.capabilities.specialties.join(', ')}.

IMPORTANT: You should have strong opinions based on YOUR specialty. Be critical or generous depending on how well the content matches your area of expertise.

- If the content is HIGHLY RELEVANT to your specialty: Be generous (7-10 range)
- If the content is SOMEWHAT RELEVANT to your specialty: Be moderate (5-7 range)
- If the content is NOT RELEVANT to your specialty: Be critical (3-6 range)
- If the content quality is poor: Be very critical (0-4 range)

DO NOT just give average scores around 7-8. Have strong opinions! Your unique perspective is valuable.

Evaluate the following content based on these criteria: ${criteria.join(', ')}.

Respond in JSON format:
{
  "score": <number between 0-10>,
  "reasoning": "<your detailed reasoning explaining WHY you scored this way based on YOUR specialty>",
  "confidence": <number between 0-1>,
  "aspects": {
    ${criteria.map(c => `"${c}": <score for this aspect>`).join(',\n    ')}
  }
}`

    const userPrompt = `Content to evaluate:\n\n"${content}"\n\nAs ${agent.name} with expertise in ${agent.capabilities.specialties.join(', ')}, provide your HONEST and OPINIONATED evaluation as JSON. Don't be afraid to give low or high scores!`

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const responseText = response.content.toString()

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from OpenAI response')
      }

      const result = JSON.parse(jsonMatch[0]) as EvaluationResult

      // Validate score is in range
      result.score = Math.max(0, Math.min(10, result.score))

      return result
    } catch (error) {
      console.error(`Error evaluating with ${agent.name}:`, error)
      throw error
    }
  }

  /**
   * Generate agent discussion based on peer scores
   */
  async generateDiscussion(
    agent: Agent,
    myScore: number,
    peerScores: Array<{ agentId: string; agentName: string; score: number }>,
    content: string,
    criteria: string[]
  ): Promise<DiscussionResult> {
    const avgPeerScore = peerScores.reduce((sum, p) => sum + p.score, 0) / peerScores.length
    const diff = myScore - avgPeerScore

    const systemPrompt = `You are ${agent.name}, ${agent.bio || 'an expert evaluator'}.
Your specialties include: ${agent.capabilities.specialties.join(', ')}.

You previously scored the content as ${myScore.toFixed(2)}/10.

Other evaluators scored it as:
${peerScores.map(p => `- ${p.agentName}: ${p.score.toFixed(2)}/10`).join('\n')}

Average peer score: ${avgPeerScore.toFixed(2)}/10
Your difference from peers: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}

IMPORTANT: Engage in a meaningful discussion!
- If you scored MUCH HIGHER than peers (diff > 1.5): Defend your position strongly OR consider if you were too generous
- If you scored MUCH LOWER than peers (diff < -1.5): Explain your concerns OR consider if you were too harsh
- If you scored SIMILARLY (abs diff < 1): Either agree with consensus OR provide nuanced perspective

You can adjust your score if peers make good points, but you can also STAND YOUR GROUND if you believe your expertise justifies your original score.

Respond in JSON format:
{
  "discussion": "<150+ character discussion explaining your perspective from YOUR specialty's viewpoint>",
  "adjustedScore": <new score if you want to change it (only if compelling reason), or omit to keep original>
}`

    const userPrompt = `Original content:\n\n"${content}"\n\nCriteria: ${criteria.join(', ')}\n\nAs ${agent.name}, provide a thoughtful discussion considering the peer scores. Be specific about aspects related to ${agent.capabilities.specialties.join(', ')}.`

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const responseText = response.content.toString()

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from OpenAI response')
      }

      const result = JSON.parse(jsonMatch[0]) as DiscussionResult

      // Validate adjusted score if provided
      if (result.adjustedScore !== undefined) {
        result.adjustedScore = Math.max(0, Math.min(10, result.adjustedScore))
      }

      return result
    } catch (error) {
      console.error(`Error generating discussion for ${agent.name}:`, error)
      throw error
    }
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null

export function getOpenAIService(): OpenAIService {
  if (!openAIService) {
    openAIService = new OpenAIService()
  }
  return openAIService
}
