/**
 * X402 Payment Service
 * Implements payment functionality for agent services using X402 A2A Payment Protocol Extension
 */

import { 
  x402PaymentRequiredException,
  processPayment,
  verifyPayment,
  settlePayment,
  x402Utils,
  type PaymentPayload,
  type PaymentRequirements,
  type VerifyResponse,
  type SettleResponse,
  type FacilitatorClient
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
      
      // In production, this would make actual API calls to verify the payment
      // For now, we'll implement basic validation
      const isValid = this.validatePaymentPayload(payload, requirements)
      
      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid payment payload or requirements'
        }
      }

      return {
        isValid: true,
        payer: payload.payload.authorization.from,
      }
    } catch (error) {
      console.error('Payment verification failed:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
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
      // For now, we'll simulate settlement
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`
      
      console.log(`✅ Payment settled with transaction: ${mockTxHash}`)

      return {
        success: true,
        transaction: mockTxHash,
        network: requirements.network || 'ethereum',
        payer: payload.payload.authorization.from,
      }
    } catch (error) {
      console.error('Payment settlement failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Settlement failed'
      }
    }
  }

  private validatePaymentPayload(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): boolean {
    // Basic validation logic
    if (!payload.payload.authorization.from) {
      return false
    }
    
    if (!payload.payload.authorization.to) {
      return false
    }

    // Check if the payment amount matches requirements
    const paymentAmount = payload.payload.amount
    const requiredAmount = requirements.price
    
    // Simple string comparison for now (in production, use proper amount parsing)
    return paymentAmount === requiredAmount
  }
}

export class X402PaymentService {
  private facilitator: JuryBoxFacilitatorClient
  private utils: x402Utils

  constructor(facilitatorConfig?: { url?: string; apiKey?: string }) {
    this.facilitator = new JuryBoxFacilitatorClient(facilitatorConfig)
    this.utils = new x402Utils()
  }

  /**
   * Request payment for a service using x402 protocol
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
      description: request.description,
      metadata: request.metadata
    })
  }

  /**
   * Process payment using x402 protocol
   */
  async processPayment(
    privateKey: string,
    paymentRequirements: PaymentRequirements
  ): Promise<PaymentResult> {
    try {
      console.log('🔄 Processing x402 payment...')
      
      const wallet = new Wallet(privateKey)
      
      // Process the payment using x402 protocol
      const paymentPayload = await processPayment(
        paymentRequirements.accepts[0],
        wallet
      )

      return {
        success: true,
        paymentPayload,
        transactionId: paymentPayload.payload.transaction
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
        error: verifyResult.error
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
          error: settleResult.error || 'Settlement failed'
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
   */
  getPaymentRequirements(task: any): PaymentRequirements | null {
    try {
      return this.utils.getPaymentRequirements(task)
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
