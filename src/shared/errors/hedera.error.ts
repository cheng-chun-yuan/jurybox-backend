/**
 * Hedera Blockchain Errors
 */

import { AppError } from './app.error'

export class HederaError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'HEDERA_ERROR', details)
  }
}

export class HCSTopicError extends HederaError {
  constructor(message: string, topicId?: string) {
    super(`HCS Topic Error: ${message}`, { topicId })
  }
}

export class HederaTransactionError extends HederaError {
  constructor(message: string, txId?: string) {
    super(`Hedera Transaction Error: ${message}`, { txId })
  }
}

export class AccountNotFoundError extends HederaError {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`, { accountId })
  }
}
