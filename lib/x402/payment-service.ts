/**
 * X402 Payment Service
 * Implements payment functionality for agent services using X402 A2A Payment Protocol Extension
 * Following the a2a-x402 library best practices
 */

import { 
  x402PaymentRequiredException,
  processPayment,
  verifyPayment,
  settlePayment,
  x402Utils,
  DefaultFacilitatorClient,
  type PaymentPayload,
  type PaymentRequirements,
  type VerifyResponse,
  type SettleResponse,
  type FacilitatorClient,
  type x402PaymentRequiredResponse
} from 'a2a-x402'
import { Wallet } from 'ethers'

export interface PaymentRequest {
  amount: number
  currency: string
  recipient: string
  description: string
  metadata?: Record<string, any>
  resource?: string
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
  paymentPayload?: PaymentPayload
}

export interface PaymentVerification {
  isValid: boolean
  payer?: string
  transaction?: string
  network?: string
  error?: string
}

/**
 * Mock Facilitator for Testing
 * Following the example from a2a-x402 documentation
 */
export class MockFacilitatorClient implements FacilitatorClient {
  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse> {
    console.log('Mock: Payment verification always succeeds')
    return {
      isValid: true,
      payer: payload.payload.authorization.from,
    }
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse> {
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
    console.log(`Mock: Generated fake transaction ${mockTxHash}`)

    return {
      success: true,
      transaction: mockTxHash,
      network: requirements.network,
      payer: payload.payload.authorization.from,
    }
  }
}

/**
 * Custom Facilitator Client for JuryBox
 * Implements the FacilitatorClient interface for custom payment processing
 */
export class JuryBoxFacilitatorClient implements FacilitatorClient {
  private apiKey?: string
  private baseUrl: string

  constructor(config?: { url?: string; apiKey?: string }) {
    this.baseUrl = config?.url || 'https://x402.org/facilitator'
    this.apiKey = config?.apiKey
  }

  async verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    try {
      console.log('🔍 Verifying payment with JuryBox facilitator...')
      
      // Validate payment payload structure
      const isValid = this.validatePaymentPayload(payload, requirements)
      
      if (!isValid) {
        return {
          isValid: false,
          invalidReason: 'Invalid payment payload structure'
        }
      }

      // In production, you would verify the signature and check blockchain state
      // For now, we'll do basic validation
      const fromAddress = payload.payload.authorization.from
      const toAddress = payload.payload.authorization.to
      
      if (!fromAddress || !toAddress) {
        return {
          isValid: false,
          invalidReason: 'Missing required addresses'
        }
      }

      return {
        isValid: true,
        payer: fromAddress,
      }
    } catch (error) {
      console.error('Payment verification failed:', error)
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
      console.log('💰 Settling payment with JuryBox facilitator...')
      
      // In production, this would execute actual blockchain transactions
      // For now, we'll simulate settlement with a realistic transaction hash format
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      
      console.log(`✅ Payment settled with transaction: ${mockTxHash}`)

      return {
        success: true,
        transaction: mockTxHash,
        network: requirements.network,
        payer: payload.payload.authorization.from,
      }
    } catch (error) {
      console.error('Payment settlement failed:', error)
      return {
        success: false,
        network: requirements.network,
        errorReason: error instanceof Error ? error.message : 'Settlement failed'
      }
    }
  }

  private validatePaymentPayload(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): boolean {
    // Basic validation logic
    if (!payload?.payload?.authorization?.from) {
      return false
    }
    
    if (!payload?.payload?.authorization?.to) {
      return false
    }

    // Check if the payment amount matches requirements
    const paymentAmount = payload.payload.authorization.value
    const requiredAmount = requirements.maxAmountRequired
    
    // Simple string comparison for now (in production, use proper amount parsing)
    return paymentAmount === requiredAmount
  }
}

/**
 * X402 Payment Service
 * Simplified implementation following a2a-x402 best practices
 */
export class X402PaymentService {
  private facilitator?: FacilitatorClient
  private utils: x402Utils

  constructor(facilitatorConfig?: { url?: string; apiKey?: string; useMock?: boolean }) {
    this.utils = new x402Utils()
    
    if (facilitatorConfig?.useMock) {
      this.facilitator = new MockFacilitatorClient()
    } else if (facilitatorConfig?.url) {
      this.facilitator = new DefaultFacilitatorClient({
        url: facilitatorConfig.url,
        apiKey: facilitatorConfig.apiKey
      })
    } else {
      // Use default facilitator (https://x402.org/facilitator)
      this.facilitator = new DefaultFacilitatorClient()
    }
  }

  /**
   * Request payment for a service using x402 protocol
   * Following the server-side pattern from documentation
   */
  requestPayment(request: PaymentRequest): never {
    const price = `${request.amount} ${request.currency}`
    const resource = request.resource || '/agent-service'
    
    console.log(`💳 Requesting payment: ${price} for ${resource}`)
    
    // Throw x402 payment required exception
    throw x402PaymentRequiredException.forService({
      price,
      payToAddress: request.recipient,
      resource,
      description: request.description
    })
  }

  /**
   * Process payment using x402 protocol
   * Following the client-side pattern from documentation
   */
  async processPayment(
    privateKey: string,
    paymentRequirements: PaymentRequirements
  ): Promise<PaymentResult> {
    try {
      console.log('🔄 Processing x402 payment...')
      
      // Create ethers wallet from private key (required by a2a-x402)
      const wallet = new Wallet(privateKey)
      
      // Process the payment using x402 protocol
      const paymentPayload = await processPayment(
        paymentRequirements,
        wallet
      )

      return {
        success: true,
        paymentPayload,
        transactionId: paymentPayload.payload.authorization.nonce
      }
    } catch (error) {
      console.error('Payment processing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  }

  /**
   * Verify payment using x402 protocol
   * Uses default facilitator automatically if no custom facilitator provided
   */
  async verifyPayment(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<PaymentVerification> {
    try {
      console.log('🔍 Verifying x402 payment...')
      
      const verifyResult = await verifyPayment(
        paymentPayload,
        requirements,
        this.facilitator
      )

      return {
        isValid: verifyResult.isValid,
        payer: verifyResult.payer,
        error: verifyResult.invalidReason
      }
    } catch (error) {
      console.error('Payment verification failed:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      }
    }
  }

  /**
   * Settle payment using x402 protocol
   * Uses default facilitator automatically if no custom facilitator provided
   */
  async settlePayment(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<PaymentResult> {
    try {
      console.log('💰 Settling x402 payment...')
      
      const settleResult = await settlePayment(
        paymentPayload,
        requirements,
        this.facilitator
      )

      if (settleResult.success) {
        return {
          success: true,
          transactionId: settleResult.transaction
        }
      } else {
        return {
          success: false,
          error: settleResult.errorReason || 'Settlement failed'
        }
      }
    } catch (error) {
      console.error('Payment settlement failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Settlement failed'
      }
    }
  }

  /**
   * Get payment requirements from a task or request
   * Following the client-side pattern from documentation
   */
  getPaymentRequirements(task: any): PaymentRequirements | null {
    try {
      const response = this.utils.getPaymentRequirements(task)
      // The utils returns x402PaymentRequiredResponse, we need the first accepts item
      return response?.accepts?.[0] || null
    } catch (error) {
      console.error('Failed to get payment requirements:', error)
      return null
    }
  }

  /**
   * Complete payment workflow: verify and settle
   */
  async completePaymentWorkflow(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<PaymentResult> {
    try {
      // Step 1: Verify payment
      const verification = await this.verifyPayment(paymentPayload, requirements)
      
      if (!verification.isValid) {
        return {
          success: false,
          error: verification.error || 'Payment verification failed'
        }
      }

      // Step 2: Settle payment
      const settlement = await this.settlePayment(paymentPayload, requirements)
      
      return settlement
    } catch (error) {
      console.error('Complete payment workflow failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment workflow failed'
      }
    }
  }
}

// Singleton instance
let paymentService: X402PaymentService | null = null

export function getX402Service(): X402PaymentService {
  if (!paymentService) {
    paymentService = new X402PaymentService()
  }
  return paymentService
}

// Export x402 utilities for direct use
export { x402PaymentRequiredException, x402Utils } from 'a2a-x402'