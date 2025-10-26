/**
 * Payment Protocol Constants
 */

export const PAYMENT_TOKENS = {
  HBAR: 'HBAR',
} as const

export const PAYMENT_DEFAULTS = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 10000,
  TIMEOUT: 30000, // 30 seconds
} as const

export const X402_CONFIG = {
  PROTOCOL_VERSION: '1.0',
  HEADER_PRICE: 'X-Price',
  HEADER_ACCEPT_PAYMENT: 'X-Accept-Payment',
  HEADER_PAYMENT_TX: 'X-Payment-Tx',
} as const

export const HEDERA_NETWORK = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
} as const

export type HederaNetworkType = typeof HEDERA_NETWORK[keyof typeof HEDERA_NETWORK]
