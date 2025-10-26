/**
 * Format Utilities
 * Helper functions for formatting data
 */

/**
 * Format a number as HBAR with proper decimals
 */
export function formatHBAR(amount: number, decimals: number = 2): string {
  return amount.toFixed(decimals)
}

/**
 * Format a timestamp to ISO string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Format a Hedera account ID
 */
export function formatAccountId(accountId: string): string {
  // Ensure format is x.y.z
  const parts = accountId.split('.')
  if (parts.length !== 3) {
    throw new Error(`Invalid account ID format: ${accountId}`)
  }
  return accountId
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Convert object to JSON string safely
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj)
  } catch (error) {
    return '[Unable to stringify]'
  }
}

/**
 * Parse JSON string safely
 */
export function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    return fallback
  }
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number, decimals: number = 2): number {
  if (total === 0) return 0
  return Number(((value / total) * 100).toFixed(decimals))
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
