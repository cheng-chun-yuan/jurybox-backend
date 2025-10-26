/**
 * Crypto Utilities
 * Helper functions for cryptographic operations
 */

import CryptoJS from 'crypto-js'

/**
 * Generate a random ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`
}

/**
 * Hash a string using SHA256
 */
export function hashSHA256(data: string): string {
  return CryptoJS.SHA256(data).toString()
}

/**
 * Encrypt data using AES
 */
export function encryptAES(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString()
}

/**
 * Decrypt data using AES
 */
export function decryptAES(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * Generate a secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString()
}

/**
 * Create a hash-based message authentication code (HMAC)
 */
export function createHMAC(message: string, secret: string): string {
  return CryptoJS.HmacSHA256(message, secret).toString()
}

/**
 * Verify HMAC
 */
export function verifyHMAC(message: string, secret: string, hmac: string): boolean {
  const expectedHMAC = createHMAC(message, secret)
  return expectedHMAC === hmac
}
