/**
 * Payment Domain Types
 * Types related to payments and X402 protocol
 */

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
