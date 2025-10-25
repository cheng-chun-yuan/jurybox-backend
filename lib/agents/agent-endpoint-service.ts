/**
 * Agent Endpoint Service
 * Handles agent chat requests with X402 payment requirements
 * Processes evaluations when valid payment is received
 */

import { getOpenAIService } from '../ai/openai-service'
import { getX402Service, type PaymentRequest } from '../x402/payment-service'
import type { Agent } from '../../types/agent'
import type { PaymentPayload, PaymentRequirements } from 'a2a-x402'

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
  paymentTx?: string
}

export interface PaymentRequiredError {
  error: string
  paymentRequired: {
    price: string
    payToAddress: string
    resource: string
    description: string
    network?: string
    maxAmountRequired?: string
  }
}

export class AgentEndpointService {
  private openAIService = getOpenAIService()
  private x402Service = getX402Service()

  /**
   * Handle agent chat request with X402 payment requirement
   * Returns 402 if no payment provided, or evaluation result if payment valid
   */
  async handleChatRequest(
    agent: Agent,
    request: AgentChatRequest,
    paymentPayload?: PaymentPayload
  ): Promise<AgentChatResponse | PaymentRequiredError> {
    // If no payment provided, return 402 Payment Required
    if (!paymentPayload) {
      return this.requirePayment(agent)
    }

    // Verify payment
    const paymentRequirements = this.createPaymentRequirements(agent)
    const verification = await this.x402Service.verifyPayment(
      paymentPayload,
      paymentRequirements
    )

    if (!verification.isValid) {
      throw new Error(`Payment verification failed: ${verification.error}`)
    }

    // Settle payment
    const settlement = await this.x402Service.settlePayment(
      paymentPayload,
      paymentRequirements
    )

    if (!settlement.success) {
      throw new Error(`Payment settlement failed: ${settlement.error}`)
    }

    // Process evaluation
    const evaluation = await this.openAIService.evaluateContent(
      agent,
      request.content,
      request.criteria || ['Quality', 'Accuracy', 'Completeness']
    )

    return {
      score: evaluation.score,
      reasoning: evaluation.reasoning,
      confidence: evaluation.confidence,
      aspects: evaluation.aspects,
      paymentTx: settlement.transactionId
    }
  }

  /**
   * Create X402 payment requirement response
   */
  private requirePayment(agent: Agent): PaymentRequiredError {
    const price = `${agent.paymentConfig.pricePerJudgment} HBAR`
    // Use AGENT_EVM_ADDRESS as the payment recipient
    const payToAddress = process.env.AGENT_EVM_ADDRESS || agent.paymentConfig.paymentAddress
    const resource = `/api/agents/${agent.id}/chat`
    const description = `Agent evaluation service - ${agent.name}`

    return {
      error: 'Payment Required',
      paymentRequired: {
        price,
        payToAddress,
        resource,
        description,
        network: 'hedera:testnet',
        maxAmountRequired: agent.paymentConfig.pricePerJudgment.toString()
      }
    }
  }

  /**
   * Create payment requirements for agent
   */
  private createPaymentRequirements(agent: Agent): PaymentRequirements {
    // Convert HBAR to tinybars (1 HBAR = 100,000,000 tinybars)
    const tinybars = Math.floor(agent.paymentConfig.pricePerJudgment * 100_000_000).toString()

    // Use AGENT_EVM_ADDRESS as the payment recipient
    const payToAddress = process.env.AGENT_EVM_ADDRESS || agent.paymentConfig.paymentAddress

    return {
      scheme: 'x402',
      network: 'hedera:testnet' as any,
      // For native HBAR, use zero address (represents native token in EVM)
      asset: '0x0000000000000000000000000000000000000000',
      payTo: payToAddress, // Recipient EVM address from env
      maxAmountRequired: tinybars, // Amount in tinybars (smallest unit)
      resource: `/api/agents/${agent.id}/chat`,
      description: `Agent evaluation service - ${agent.name}`,
      mimeType: 'application/json',
      maxTimeoutSeconds: 60
    }
  }

  /**
   * Validate agent chat request
   */
  validateRequest(request: AgentChatRequest): { valid: boolean; error?: string } {
    if (!request.content || request.content.trim().length === 0) {
      return { valid: false, error: 'Content is required' }
    }

    if (request.content.length > 50000) {
      return { valid: false, error: 'Content too long (max 50000 characters)' }
    }

    return { valid: true }
  }
}

// Singleton instance
let agentEndpointService: AgentEndpointService | null = null

export function getAgentEndpointService(): AgentEndpointService {
  if (!agentEndpointService) {
    agentEndpointService = new AgentEndpointService()
  }
  return agentEndpointService
}
