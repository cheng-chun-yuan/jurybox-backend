/**
 * Feedback Auth Service
 * Generates FeedbackAuth signatures for clients to submit feedback
 * Based on ERC-8004 FeedbackAuth pattern
 */

import { ethers } from 'ethers'
import { config } from '../../server/config'

export interface FeedbackAuth {
  agentId: bigint
  clientAddress: string
  indexFrom: bigint
  indexTo: bigint
  expiry: bigint
  chainId: bigint
  identityRegistry: string
  signerAddress: string
  signature: string
  feedbackAuth: string // Encoded bytes for on-chain submission
}

export interface GenerateFeedbackAuthParams {
  agentId: number
  clientAddress: string
  indexLimit?: number
  expirySeconds?: number // Changed to seconds for consistency
}

export class FeedbackAuthService {
  private wallet: ethers.Wallet

  constructor() {
    // Use operator private key for signing
    const privateKey = process.env.OPERATOR_PRIVATE_KEY || config.hedera.privateKey
    this.wallet = new ethers.Wallet(privateKey.replace(/^0x/, ''))
  }

  /**
   * Generate FeedbackAuth signature for a client
   * This allows the client to submit feedback on-chain
   */
  async generateFeedbackAuth(params: GenerateFeedbackAuthParams): Promise<FeedbackAuth> {
    const {
      agentId,
      clientAddress,
      indexLimit = 100, // Allow up to 100 feedback submissions
      expirySeconds = 3600, // Valid for 1 hour by default
    } = params

    // Import contract addresses
    const { CONTRACT_ADDRESSES } = await import('../erc8004/contract-addresses.js')

    // Calculate expiry timestamp
    const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds)

    // Index range (from current to limit)
    const indexFrom = BigInt(0)
    const indexTo = BigInt(indexLimit)

    // Chain ID for Hedera testnet
    const chainId = BigInt(296)

    // Identity Registry address
    const identityRegistry = CONTRACT_ADDRESSES.IdentityRegistry

    // Signer address (agent owner's address)
    const signerAddress = this.wallet.address

    // Create message hash according to ERC-8004 FeedbackAuth format
    // Hash of: agentId, clientAddress, indexFrom, indexTo, expiry, chainId, identityRegistry
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
      [agentId, clientAddress, indexFrom, indexTo, expiry, chainId, identityRegistry]
    )

    // Sign the message hash
    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash))

    // Encode feedbackAuth struct for on-chain submission
    const feedbackAuth = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'address', 'address', 'bytes'],
      [agentId, clientAddress, indexFrom, indexTo, expiry, chainId, identityRegistry, signerAddress, signature]
    )

    console.log('📝 Generated FeedbackAuth:', {
      agentId,
      clientAddress,
      indexFrom: indexFrom.toString(),
      indexTo: indexTo.toString(),
      expiry: new Date(Number(expiry) * 1000).toISOString(),
      chainId: chainId.toString(),
      identityRegistry,
      signerAddress,
      signature,
    })

    return {
      agentId: BigInt(agentId),
      clientAddress,
      indexFrom,
      indexTo,
      expiry,
      chainId,
      identityRegistry,
      signerAddress,
      signature,
      feedbackAuth,
    }
  }

  /**
   * Verify a FeedbackAuth signature
   */
  async verifyFeedbackAuth(auth: FeedbackAuth): Promise<boolean> {
    try {
      // Recreate message hash
      const messageHash = ethers.solidityPackedKeccak256(
        ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
        [auth.agentId, auth.clientAddress, auth.indexFrom, auth.indexTo, auth.expiry]
      )

      // Recover signer from signature
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), auth.signature)

      // Check if signer matches wallet address
      const isValid = recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase()

      // Check if not expired
      const currentTime = BigInt(Math.floor(Date.now() / 1000))
      const notExpired = auth.expiry > currentTime

      return isValid && notExpired
    } catch (error) {
      console.error('❌ FeedbackAuth verification failed:', error)
      return false
    }
  }

  /**
   * Encode FeedbackAuth to bytes for on-chain submission
   * Returns 289 bytes: 224 params + 65 signature
   */
  encodeFeedbackAuth(auth: FeedbackAuth): string {
    // Encode parameters (224 bytes)
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [auth.agentId, auth.clientAddress, auth.indexFrom, auth.indexTo, auth.expiry]
    )

    // Combine params + signature
    const encoded = ethers.concat([params, auth.signature])

    return encoded
  }

  /**
   * Decode FeedbackAuth from bytes
   */
  decodeFeedbackAuth(encoded: string): FeedbackAuth {
    // Split params (224 bytes) and signature (65 bytes)
    const params = encoded.slice(0, 224 * 2 + 2) // +2 for 0x
    const signature = '0x' + encoded.slice(224 * 2 + 2)

    // Decode parameters
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
      params
    )

    return {
      agentId: decoded[0],
      clientAddress: decoded[1],
      indexFrom: decoded[2],
      indexTo: decoded[3],
      expiry: decoded[4],
      signature,
    }
  }
}

// Singleton instance
let feedbackAuthService: FeedbackAuthService | null = null

export function getFeedbackAuthService(): FeedbackAuthService {
  if (!feedbackAuthService) {
    feedbackAuthService = new FeedbackAuthService()
  }
  return feedbackAuthService
}
