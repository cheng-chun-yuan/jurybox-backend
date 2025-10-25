/**
 * Hedera Address Utilities
 * Convert between Hedera account IDs and EVM addresses
 */

/**
 * Convert Hedera account ID to EVM address
 * Hedera account IDs (0.0.xxxx) map to EVM addresses
 *
 * Formula: EVM address = 0x + pad(shard, 8) + pad(realm, 16) + pad(num, 16)
 * For testnet: shard=0, realm=0, so we just pad the account number
 *
 * Example: 0.0.1001 -> 0x00000000000000000000000000000000000003e9
 */
export function hederaAccountIdToEvmAddress(accountId: string): string {
  try {
    // Parse Hedera account ID format: shard.realm.num
    const parts = accountId.split('.')

    if (parts.length !== 3) {
      throw new Error(`Invalid Hedera account ID format: ${accountId}`)
    }

    const shard = parseInt(parts[0])
    const realm = parseInt(parts[1])
    const num = parseInt(parts[2])

    if (isNaN(shard) || isNaN(realm) || isNaN(num)) {
      throw new Error(`Invalid Hedera account ID: ${accountId}`)
    }

    // Convert to hex and pad
    // Shard: 8 hex chars (4 bytes)
    // Realm: 16 hex chars (8 bytes)
    // Num: 16 hex chars (8 bytes)
    const shardHex = shard.toString(16).padStart(8, '0')
    const realmHex = realm.toString(16).padStart(16, '0')
    const numHex = num.toString(16).padStart(16, '0')

    return `0x${shardHex}${realmHex}${numHex}`
  } catch (error) {
    console.error(`Failed to convert Hedera account ID to EVM address: ${accountId}`, error)
    throw error
  }
}

/**
 * Convert EVM address to Hedera account ID
 * Reverse of hederaAccountIdToEvmAddress
 */
export function evmAddressToHederaAccountId(evmAddress: string): string {
  try {
    // Remove 0x prefix
    const hex = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress

    if (hex.length !== 40) {
      throw new Error(`Invalid EVM address length: ${evmAddress}`)
    }

    // Extract parts
    const shardHex = hex.slice(0, 8)
    const realmHex = hex.slice(8, 24)
    const numHex = hex.slice(24, 40)

    // Convert to decimal
    const shard = parseInt(shardHex, 16)
    const realm = parseInt(realmHex, 16)
    const num = parseInt(numHex, 16)

    return `${shard}.${realm}.${num}`
  } catch (error) {
    console.error(`Failed to convert EVM address to Hedera account ID: ${evmAddress}`, error)
    throw error
  }
}

/**
 * Check if a string is a Hedera account ID
 */
export function isHederaAccountId(str: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(str)
}

/**
 * Check if a string is an EVM address
 */
export function isEvmAddress(str: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(str)
}

/**
 * Normalize address - if it's a Hedera account ID, convert to EVM address
 * If it's already an EVM address, return as-is
 */
export function normalizeToEvmAddress(address: string): string {
  if (isHederaAccountId(address)) {
    return hederaAccountIdToEvmAddress(address)
  }

  if (isEvmAddress(address)) {
    return address
  }

  throw new Error(`Invalid address format: ${address}`)
}
