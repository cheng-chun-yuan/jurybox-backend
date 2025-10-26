/**
 * Status Constants
 * Application-wide status definitions
 */

export const TaskStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus]

export const PaymentStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  SETTLED: 'settled',
  FAILED: 'failed',
} as const

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus]

export const EvaluationStatus = {
  INITIALIZING: 'initializing',
  SCORING: 'scoring',
  DISCUSSING: 'discussing',
  CONVERGING: 'converging',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type EvaluationStatusType = typeof EvaluationStatus[keyof typeof EvaluationStatus]

export const AgentColor = {
  PURPLE: 'purple',
  CYAN: 'cyan',
  GOLD: 'gold',
} as const

export type AgentColorType = typeof AgentColor[keyof typeof AgentColor]
