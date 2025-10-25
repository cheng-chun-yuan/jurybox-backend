/**
 * Agent HTTP Client Service
 * Handles HTTP requests to agent endpoints with automatic X402 payment handling
 * Uses HEDERA_ACCOUNT_ID_2 for signing payments
 */

import { Wallet } from 'ethers'
import { processPayment, x402Utils, type PaymentPayload, type PaymentRequirements } from 'a2a-x402'
import type { Agent } from '../../types/agent'

export interface AgentHTTPRequest {
  content: string
  criteria?: string[]
  metadata?: Record<string, any>
}

export interface AgentHTTPResponse {
  score: number
  reasoning: string
  confidence: number
  aspects?: Record<string, number>
  paymentTx?: string
}

export interface X402PaymentRequired {
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

export class AgentHTTPClient {
  private utils: x402Utils
  private orchestratorPrivateKey: string
  private orchestratorAccountId: string
  private baseUrl: string

  constructor() {
    this.utils = new x402Utils()

    // Use HEDERA_ACCOUNT_ID_2 for all orchestrator payments
    this.orchestratorPrivateKey = process.env.HEDERA_PRIVATE_KEY_2 || ''
    this.orchestratorAccountId = process.env.HEDERA_ACCOUNT_ID_2 || ''
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:10000'

    if (!this.orchestratorPrivateKey || !this.orchestratorAccountId) {
      throw new Error('HEDERA_ACCOUNT_ID_2 and HEDERA_PRIVATE_KEY_2 must be configured')
    }
  }

  /**
   * Call agent with automatic X402 payment handling
   * Follows the client-side pattern from a2a-x402
   */
  async callAgent(
    agent: Agent,
    request: AgentHTTPRequest
  ): Promise<AgentHTTPResponse> {
    const agentUrl = `${this.baseUrl}/api/agents/${agent.id}/chat`

    console.log(`🤖 Calling agent ${agent.name} at ${agentUrl}`)

    // Step 1: Try request without payment
    try {
      const response = await this.makeRequest(agentUrl, request)

      // If successful without payment, return response
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Agent ${agent.name} responded (no payment required)`)
        return data
      }

      // Handle 402 Payment Required
      if (response.status === 402) {
        console.log(`💳 Payment required for agent ${agent.name}`)
        const paymentRequiredData: X402PaymentRequired = await response.json()

        // Step 2: Process payment using x402 protocol
        const paymentPayload = await this.processX402Payment(paymentRequiredData)

        // Step 3: Retry request with payment
        console.log(`🔄 Retrying request with payment...`)
        const paidResponse = await this.makeRequest(agentUrl, request, paymentPayload)

        if (paidResponse.ok) {
          const data = await paidResponse.json()
          console.log(`✅ Agent ${agent.name} responded after payment`)
          return data
        } else {
          const errorText = await paidResponse.text()
          throw new Error(`Agent request failed after payment: ${paidResponse.status} - ${errorText}`)
        }
      }

      // Handle other errors
      const errorText = await response.text()
      throw new Error(`Agent request failed: ${response.status} - ${errorText}`)

    } catch (error) {
      console.error(`❌ Agent ${agent.name} call failed:`, error)
      throw error
    }
  }

  /**
   * Process X402 payment following the client-side pattern
   */
  private async processX402Payment(
    paymentRequired: X402PaymentRequired
  ): Promise<PaymentPayload> {
    try {
      console.log('🔑 Signing payment with HEDERA_ACCOUNT_ID_2...')
      console.log(`   From: ${this.orchestratorAccountId}`)
      console.log(`   To: ${paymentRequired.paymentRequired.payToAddress}`)
      console.log(`   Amount: ${paymentRequired.paymentRequired.price}`)

      // Create ethers wallet from private key (required by a2a-x402)
      const wallet = new Wallet(this.orchestratorPrivateKey)

      // Create payment requirements from 402 response
      const paymentRequirements: PaymentRequirements = {
        network: paymentRequired.paymentRequired.network || 'hedera:testnet',
        maxAmountRequired: paymentRequired.paymentRequired.maxAmountRequired || '0.025',
        recipient: paymentRequired.paymentRequired.payToAddress,
        paymentMethods: ['hedera'],
        currency: 'HBAR',
        resource: paymentRequired.paymentRequired.resource,
        description: paymentRequired.paymentRequired.description
      } as PaymentRequirements

      // Sign the payment using x402 protocol
      const paymentPayload = await processPayment(
        paymentRequirements,
        wallet
      )

      console.log('✅ Payment signed successfully')
      console.log(`   Nonce: ${paymentPayload.payload.authorization.nonce}`)

      return paymentPayload

    } catch (error) {
      console.error('❌ Payment processing failed:', error)
      throw new Error(`Failed to process X402 payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Make HTTP request to agent endpoint
   */
  private async makeRequest(
    url: string,
    request: AgentHTTPRequest,
    paymentPayload?: PaymentPayload
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Include payment payload in header if provided
    if (paymentPayload) {
      headers['X-Payment-Payload'] = JSON.stringify(paymentPayload)
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    })
  }

  /**
   * Get payment requirements from a 402 response
   * Uses x402Utils.getPaymentRequirements pattern
   */
  getPaymentRequirements(task: any): PaymentRequirements | null {
    try {
      const response = this.utils.getPaymentRequirements(task)
      return response?.accepts?.[0] || null
    } catch (error) {
      console.error('Failed to get payment requirements:', error)
      return null
    }
  }

  /**
   * Batch call multiple agents in parallel
   */
  async callAgents(
    agents: Agent[],
    requests: AgentHTTPRequest[]
  ): Promise<AgentHTTPResponse[]> {
    if (agents.length !== requests.length) {
      throw new Error('Number of agents must match number of requests')
    }

    console.log(`🚀 Calling ${agents.length} agents in parallel...`)

    const calls = agents.map((agent, index) =>
      this.callAgent(agent, requests[index])
        .catch(error => {
          console.error(`Agent ${agent.name} failed:`, error)
          // Return a default response for failed agents
          return {
            score: 0,
            reasoning: `Agent call failed: ${error.message}`,
            confidence: 0,
            error: error.message
          } as AgentHTTPResponse
        })
    )

    const responses = await Promise.all(calls)
    console.log(`✅ Received ${responses.length} agent responses`)

    return responses
  }

  /**
   * Get orchestrator account info
   */
  getOrchestratorInfo() {
    return {
      accountId: this.orchestratorAccountId,
      // Don't expose private key in logs
      hasPrivateKey: !!this.orchestratorPrivateKey
    }
  }
}

// Singleton instance
let agentHTTPClient: AgentHTTPClient | null = null

export function getAgentHTTPClient(): AgentHTTPClient {
  if (!agentHTTPClient) {
    agentHTTPClient = new AgentHTTPClient()
  }
  return agentHTTPClient
}
