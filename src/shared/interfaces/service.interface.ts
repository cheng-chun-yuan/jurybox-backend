/**
 * Service Base Interface
 * Common patterns for services
 */

export interface IService {
  /**
   * Initialize the service (connect to external resources, etc.)
   */
  initialize?(): Promise<void>

  /**
   * Cleanup resources
   */
  cleanup?(): Promise<void>
}

export interface IHealthCheck {
  /**
   * Check if the service is healthy
   */
  healthCheck(): Promise<boolean>

  /**
   * Get detailed status information
   */
  getStatus(): Promise<{
    healthy: boolean
    details?: Record<string, any>
  }>
}
