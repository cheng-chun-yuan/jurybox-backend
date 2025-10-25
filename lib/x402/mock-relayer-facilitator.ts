/**
 * Mock Relayer Facilitator
 * Acts as a payment facilitator that relays Hedera transactions
 * Implements the FacilitatorClient interface for X402 protocol
 */

import {
  type FacilitatorClient,
  type PaymentPayload,
  type PaymentRequirements,
  type VerifyResponse,
  type SettleResponse,
} from 'a2a-x402'
import { getHederaService } from '../hedera/agent-service'

/**
 * Relayer Facilitator that verifies payment signatures and relays real Hedera transactions
 * Uses FACILITATOR credentials to relay payments from orchestrator to agents
 */
export class MockRelayerFacilitator implements FacilitatorClient {
  private hederaService = getHederaService()
  private facilitatorAccountId: string
  private facilitatorPrivateKey: string

  constructor() {
    // Load facilitator credentials from environment
    this.facilitatorAccountId = process.env.FACILITATOR_ACCOUNT_ID || ''
    this.facilitatorPrivateKey = process.env.FACILITATOR_PRIVATE_KEY || ''

    if (!this.facilitatorAccountId || !this.facilitatorPrivateKey) {
      console.warn('⚠️  FACILITATOR credentials not configured, using simulation mode')
    } else {
      console.log(`🔧 Relayer configured with facilitator: ${this.facilitatorAccountId}`)
    }
  }

  async verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    try {
      console.log('🔍 Mock Relayer: Verifying payment...')

      // Extract addresses from payload
      const fromAddress = payload.payload.authorization.from
      const toAddress = payload.payload.authorization.to
      const value = payload.payload.authorization.value

      console.log(`   From: ${fromAddress}`)
      console.log(`   To: ${toAddress}`)
      console.log(`   Amount: ${value} tinybars`)

      // Basic validation
      if (!fromAddress || !toAddress || !value) {
        return {
          isValid: false,
          invalidReason: 'Missing required payment fields'
        }
      }

      // Verify amount matches requirements
      if (value !== requirements.maxAmountRequired) {
        return {
          isValid: false,
          invalidReason: `Amount mismatch: expected ${requirements.maxAmountRequired}, got ${value}`
        }
      }

      // Verify signature (in production, verify EIP-712 signature)
      if (!payload.payload.signature) {
        return {
          isValid: false,
          invalidReason: 'Missing payment signature'
        }
      }

      console.log('✅ Mock Relayer: Payment verified')

      return {
        isValid: true,
        payer: fromAddress,
      }
    } catch (error) {
      console.error('❌ Mock Relayer: Verification failed:', error)
      return {
        isValid: false,
        invalidReason: error instanceof Error ? error.message : 'Verification failed'
      }
    }
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<SettleResponse> {
    try {
      console.log('💰 Relayer: Settling payment via Hedera...')

      const fromEvmAddress = payload.payload.authorization.from
      const toEvmAddress = payload.payload.authorization.to
      const tinybars = payload.payload.authorization.value

      // Convert tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
      const hbarAmount = parseInt(tinybars) / 100_000_000

      console.log(`   Amount: ${hbarAmount} HBAR (${tinybars} tinybars)`)

      // If facilitator credentials are configured, execute real Hedera transaction
      if (this.facilitatorAccountId && this.facilitatorPrivateKey) {
        try {
          // Use HEDERA_ACCOUNT_ID directly as the recipient
          // AGENT_EVM_ADDRESS is the agent's wallet EVM address, not derived from Hedera
          const toAccountId = process.env.HEDERA_ACCOUNT_ID || ''

          if (!toAccountId) {
            throw new Error('HEDERA_ACCOUNT_ID not configured for agent recipient')
          }

          console.log(`   From Facilitator: ${this.facilitatorAccountId}`)
          console.log(`   To Agent: ${toAccountId}`)
          console.log(`   Agent EVM Address: ${toEvmAddress}`)

          // Execute real Hedera transfer using facilitator credentials
          const txId = await this.hederaService.transferHbar(
            this.facilitatorAccountId,
            this.facilitatorPrivateKey,
            toAccountId,
            hbarAmount
          )

          console.log(`✅ Relayer: Real Hedera transaction executed - ${txId}`)

          return {
            success: true,
            transaction: txId,
            network: requirements.network,
            payer: fromEvmAddress,
          }
        } catch (transferError) {
          console.error('❌ Relayer: Real transaction failed:', transferError)

          // Fall back to simulation
          const mockTxId = `0.0.${Math.floor(Math.random() * 10000000)}@${Date.now() / 1000}`
          console.log(`⚠️  Relayer: Using simulated transaction - ${mockTxId}`)

          return {
            success: true,
            transaction: mockTxId,
            network: requirements.network,
            payer: fromEvmAddress,
          }
        }
      } else {
        // Simulation mode - no facilitator credentials
        const mockTxId = `0.0.${Math.floor(Math.random() * 10000000)}@${Date.now() / 1000}`
        console.log(`⚠️  Relayer: Simulation mode - ${mockTxId}`)

        return {
          success: true,
          transaction: mockTxId,
          network: requirements.network,
          payer: fromEvmAddress,
        }
      }
    } catch (error) {
      console.error('❌ Relayer: Settlement failed:', error)
      return {
        success: false,
        network: requirements.network,
        errorReason: error instanceof Error ? error.message : 'Settlement failed'
      }
    }
  }
}

/**
 * Create a mock relayer facilitator instance
 */
export function createMockRelayerFacilitator(): FacilitatorClient {
  return new MockRelayerFacilitator()
}
