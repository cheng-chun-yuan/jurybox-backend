/**
 * Payment-related Errors
 */

import { AppError } from './app.error'

export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, 'PAYMENT_REQUIRED', details)
  }
}

export class PaymentFailedError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'PAYMENT_FAILED', details)
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(required: number, available: number) {
    super(`Insufficient funds: required ${required}, available ${available}`, {
      required,
      available,
    })
  }
}

export class PaymentTimeoutError extends AppError {
  constructor(timeout: number) {
    super(`Payment timeout after ${timeout}ms`, 408, 'PAYMENT_TIMEOUT', { timeout })
  }
}
