/**
 * Business Logic Errors
 */

import { AppError } from './app.error'

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string | number) {
    super(`${resource} not found: ${identifier}`, 404, 'NOT_FOUND', {
      resource,
      identifier,
    })
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details)
  }
}

export class EvaluationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'EVALUATION_ERROR', details)
  }
}

export class ConsensusError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'CONSENSUS_ERROR', details)
  }
}

export class QuotaExceededError extends AppError {
  constructor(limit: number, current: number) {
    super(`Quota exceeded: ${current}/${limit}`, 429, 'QUOTA_EXCEEDED', {
      limit,
      current,
    })
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}
