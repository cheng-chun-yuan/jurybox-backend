/**
 * Hedera Address Utilities
 * Helper functions for working with Hedera addresses and account IDs
 */

import { AccountId, PublicKey } from '@hashgraph/sdk'
import { getLogger } from '../../../shared/utils'
import { ValidationError } from '../../../shared/errors'

const logger = getLogger()

/**
 * Validate Hedera account ID format (x.y.z)
 */
export function isValidAccountId(accountId: string): boolean {
  try {
    AccountId.fromString(accountId)
    return true
  } catch {
    return false
  }
}

/**
 * Validate public key format
 */
export function isValidPublicKey(publicKey: string): boolean {
  try {
    PublicKey.fromString(publicKey)
    return true
  } catch {
    return false
  }
}

/**
 * Format account ID to standard format
 */
export function formatAccountId(accountId: string): string {
  try {
    const account = AccountId.fromString(accountId)
    return account.toString()
  } catch (error) {
    throw new ValidationError(`Invalid account ID format: ${accountId}`)
  }
}

/**
 * Extract account parts (shard, realm, num)
 */
export function parseAccountId(accountId: string): {
  shard: number
  realm: number
  num: number
} {
  try {
    const account = AccountId.fromString(accountId)
    return {
      shard: Number(account.shard),
      realm: Number(account.realm),
      num: Number(account.num),
    }
  } catch (error) {
    throw new ValidationError(`Invalid account ID: ${accountId}`)
  }
}

/**
 * Convert EVM address to Hedera account ID (for auto-account creation)
 */
export function evmAddressToAccountId(
  evmAddress: string,
  shard: number = 0,
  realm: number = 0
): string {
  try {
    // Remove 0x prefix if present
    const address = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress

    // Convert hex address to account number
    const accountNum = BigInt('0x' + address.slice(-40))

    return `${shard}.${realm}.${accountNum}`
  } catch (error) {
    logger.error('Failed to convert EVM address to account ID', error, { evmAddress })
    throw new ValidationError(`Invalid EVM address: ${evmAddress}`)
  }
}

/**
 * Convert Hedera account ID to EVM address format
 */
export function accountIdToEvmAddress(accountId: string): string {
  try {
    const { num } = parseAccountId(accountId)
    // Convert account number to hex and pad to 40 characters (20 bytes)
    const hex = num.toString(16).padStart(40, '0')
    return '0x' + hex
  } catch (error) {
    throw new ValidationError(`Invalid account ID: ${accountId}`)
  }
}

/**
 * Check if account ID is in testnet range
 */
export function isTestnetAccount(accountId: string): boolean {
  try {
    const { shard, realm } = parseAccountId(accountId)
    return shard === 0 && realm === 0
  } catch {
    return false
  }
}

/**
 * Generate account alias from public key
 */
export function publicKeyToAlias(publicKey: string): string {
  try {
    const key = PublicKey.fromString(publicKey)
    return key.toStringRaw()
  } catch (error) {
    throw new ValidationError(`Invalid public key: ${publicKey}`)
  }
}

/**
 * Validate and normalize account ID or alias
 */
export function normalizeAccount(account: string): string {
  // Try as account ID first
  if (isValidAccountId(account)) {
    return formatAccountId(account)
  }

  // Try as public key/alias
  if (isValidPublicKey(account)) {
    return publicKeyToAlias(account)
  }

  throw new ValidationError(`Invalid account ID or alias: ${account}`)
}
