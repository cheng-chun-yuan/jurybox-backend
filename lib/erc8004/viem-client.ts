/**
 * Viem Client Configuration for Hedera Smart Contract Service
 * Provides type-safe contract interactions using viem
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem'
import { defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Define Hedera Testnet chain
export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
    public: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: { name: 'HashScan', url: 'https://hashscan.io/testnet' },
  },
  testnet: true,
})

// Define Hedera Mainnet chain
export const hederaMainnet = defineChain({
  id: 295,
  name: 'Hedera Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.hashio.io/api'],
    },
    public: {
      http: ['https://mainnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: { name: 'HashScan', url: 'https://hashscan.io/mainnet' },
  },
})

/**
 * Get the current Hedera chain based on environment
 */
export function getHederaChain() {
  const network = process.env.HEDERA_NETWORK || 'testnet'
  return network === 'mainnet' ? hederaMainnet : hederaTestnet
}

/**
 * Create a public client for reading contract data
 */
export function createHederaPublicClient() {
  const chain = getHederaChain()

  return createPublicClient({
    chain,
    transport: http(),
  })
}

/**
 * Create a wallet client for writing to contracts
 */
export function createHederaWalletClient() {
  const chain = getHederaChain()
  const privateKey = process.env.HEDERA_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('HEDERA_PRIVATE_KEY must be set in environment variables')
  }

  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const account = privateKeyToAccount(formattedKey as `0x${string}`)

  return createWalletClient({
    account,
    chain,
    transport: http(),
  })
}

/**
 * Helper to get both clients
 */
export function getHederaClients() {
  return {
    public: createHederaPublicClient(),
    wallet: createHederaWalletClient(),
  }
}

/**
 * Convert Hedera account ID (0.0.xxxxx) to EVM address if needed
 * Note: For smart contracts, you typically use the EVM address directly
 */
export function hederaAccountIdToAddress(accountId: string): Address {
  // This is a placeholder - in reality you'd need to query the Mirror Node API
  // or use the Hedera SDK to convert account ID to EVM address
  // For now, we assume you're already using EVM addresses
  if (accountId.startsWith('0x')) {
    return accountId as Address
  }
  throw new Error('Account ID to address conversion requires Mirror Node API integration')
}
