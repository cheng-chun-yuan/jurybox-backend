/**
 * Validation Error
 * Thrown when input validation fails
 */

import { AppError } from './app.error'

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class InvalidInputError extends ValidationError {
  constructor(field: string, reason: string) {
    super(`Invalid input for field '${field}': ${reason}`, { field, reason })
  }
}

export class MissingRequiredFieldError extends ValidationError {
  constructor(field: string) {
    super(`Missing required field: ${field}`, { field })
  }
}
