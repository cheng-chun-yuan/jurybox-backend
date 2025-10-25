/**
 * Agent HTTP Client Service
 * Handles HTTP requests to agent endpoints with automatic X402 payment handling
 * Uses HEDERA_ACCOUNT_ID_2 for signing payments
 */

import { Wallet } from 'ethers'
import { processPayment, x402Utils, type PaymentPayload, type PaymentRequirements } from 'a2a-x402'
import type { Agent } from '../../types/agent'
import { normalizeToEvmAddress } from '../hedera/address-utils'

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
  private orchestratorEvmAddress: string
  private baseUrl: string

  constructor() {
    this.utils = new x402Utils()

    // Use orchestrator credentials for all coordinator payments
    this.orchestratorPrivateKey = process.env.ORCHESTRATOR_PRIVATE_KEY || ''
    this.orchestratorAccountId = process.env.ORCHESTRATOR_ACCOUNT_ID || ''
    this.orchestratorEvmAddress = process.env.ORCHESTRATOR_EVM_ADDRESS || ''
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:10000'

    if (!this.orchestratorPrivateKey || !this.orchestratorAccountId || !this.orchestratorEvmAddress) {
      throw new Error('ORCHESTRATOR_ACCOUNT_ID, ORCHESTRATOR_PRIVATE_KEY, and ORCHESTRATOR_EVM_ADDRESS must be configured')
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
      // Use EVM addresses from environment variables
      const toEvmAddress = paymentRequired.paymentRequired.payToAddress

      console.log('🔑 Signing payment with ORCHESTRATOR_EVM_ADDRESS...')
      console.log(`   From: ${this.orchestratorAccountId} (${this.orchestratorEvmAddress})`)
      console.log(`   To: ${toEvmAddress}`)
      console.log(`   Amount: ${paymentRequired.paymentRequired.price}`)

      // Create ethers wallet from private key (required by a2a-x402)
      const wallet = new Wallet(this.orchestratorPrivateKey)

      // Convert HBAR amount to tinybars (1 HBAR = 100,000,000 tinybars)
      const hbarAmount = parseFloat(paymentRequired.paymentRequired.maxAmountRequired || '0.025')
      const tinybars = Math.floor(hbarAmount * 100_000_000).toString()

      // Create payment requirements from 402 response (use EVM addresses)
      const paymentRequirements: PaymentRequirements = {
        scheme: 'x402',
        network: (paymentRequired.paymentRequired.network || 'hedera:testnet') as any,
        // For native HBAR, use the Hedera native token contract address
        // In production, this would be the wrapped HBAR ERC-20 token address
        asset: '0x0000000000000000000000000000000000000000', // Native HBAR (zero address represents native token)
        payTo: toEvmAddress, // Recipient EVM address
        maxAmountRequired: tinybars, // Amount in tinybars (smallest unit)
        resource: paymentRequired.paymentRequired.resource,
        description: paymentRequired.paymentRequired.description,
        mimeType: 'application/json',
        maxTimeoutSeconds: 60
      }

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
      evmAddress: this.orchestratorEvmAddress,
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
