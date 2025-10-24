/**
 * Contract Address Registry
 *
 * ERC-8004 Proxy Contract Addresses
 * These addresses point to the upgradeable proxy contracts.
 * Contract source: /Users/chengchunyuan/project/hackathon/erc-8004-contracts
 */

/**
 * Proxy contract addresses for ERC-8004 registries
 * Use these addresses for all contract interactions
 * Deployed on Hedera Testnet
 */
export const CONTRACT_ADDRESSES = {
  IdentityRegistry: '0x4e79162582ec945aa0d5266009edef0f42b407e5',
  ReputationRegistry: '0xa9ed2f34b8342ac1b60bf4469cd704231af26021',
  ValidationRegistry: '0xa00c82e8c4096f10e5ea49798cf7fb047c2241ce',
} as const

/**
 * Get contract addresses for current network
 */
export function getContractAddresses() {
  return {
    identityRegistry: CONTRACT_ADDRESSES.IdentityRegistry,
    reputationRegistry: CONTRACT_ADDRESSES.ReputationRegistry,
    validationRegistry: CONTRACT_ADDRESSES.ValidationRegistry,
  }
}

/**
 * Check if contracts are deployed
 */
export function areContractsDeployed(): boolean {
  return !!(
    CONTRACT_ADDRESSES.IdentityRegistry &&
    CONTRACT_ADDRESSES.ReputationRegistry &&
    CONTRACT_ADDRESSES.ValidationRegistry
  )
}

/**
 * Get a specific contract address
 */
export function getContractAddress(
  contractName: 'IdentityRegistry' | 'ReputationRegistry' | 'ValidationRegistry'
): string {
  return CONTRACT_ADDRESSES[contractName]
}
