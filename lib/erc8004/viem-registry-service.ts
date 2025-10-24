/**
 * ERC-8004 Registry Service using Viem
 * Type-safe contract interactions for agent registration with IPFS metadata
 */

import { type Address, type Hash, parseEventLogs } from 'viem'
import { getHederaClients } from './viem-client'
import { CONTRACT_ADDRESSES } from './contract-addresses'
import { getPinataService, type AgentMetadata } from '../ipfs/pinata-service'

// ERC-8004 Identity Registry ABI
const identityRegistryAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event',
    name: 'AgentRegistered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'tokenURI', type: 'string', indexed: false },
    ],
  },
] as const

// ERC-8004 Reputation Registry ABI
const reputationRegistryAbi = [
  {
    type: 'function',
    name: 'submitFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'rating', type: 'uint256' },
      { name: 'comment', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getReputation',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'totalReviews', type: 'uint256' },
      { name: 'averageRating', type: 'uint256' },
      { name: 'completedTasks', type: 'uint256' },
    ],
  },
] as const

// ERC-8004 Validation Registry ABI
const validationRegistryAbi = [
  {
    type: 'function',
    name: 'submitValidation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'taskId', type: 'string' },
      { name: 'proof', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

export interface AgentRegistrationResult {
  agentId: bigint
  txHash: Hash
  ipfsUri: string
  owner: Address
}

export class ViemRegistryService {
  private publicClient
  private walletClient
  private pinataService

  constructor() {
    const clients = getHederaClients()
    this.publicClient = clients.public
    this.walletClient = clients.wallet
    this.pinataService = getPinataService()
  }

  /**
   * Register a new agent with IPFS metadata
   * 1. Upload metadata to IPFS via Pinata
   * 2. Register agent on-chain with IPFS URI
   * 3. Extract agentId from transaction receipt
   */
  async registerAgent(metadata: AgentMetadata): Promise<AgentRegistrationResult> {
    try {
      console.log('🚀 Starting agent registration process...')

      // Step 1: Upload metadata to IPFS
      const ipfsUri = await this.pinataService.uploadAgentMetadata(metadata)

      // Step 2: Register on-chain
      console.log('📝 Registering agent on-chain...')
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as Address,
        abi: identityRegistryAbi,
        functionName: 'register',
        args: [ipfsUri],
        account: this.walletClient.account,
      })

      const txHash = await this.walletClient.writeContract(request)
      console.log(`📤 Transaction sent: ${txHash}`)

      // Step 3: Wait for transaction confirmation
      console.log('⏳ Waiting for transaction confirmation...')
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash })

      // Step 4: Extract agentId from event logs
      const agentId = await this.getAgentIdFromReceipt(receipt.logs)

      console.log('✅ Agent registered successfully!')
      console.log(`🆔 Agent ID: ${agentId}`)
      console.log(`📍 IPFS URI: ${ipfsUri}`)
      console.log(`👤 Owner: ${this.walletClient.account.address}`)

      return {
        agentId,
        txHash,
        ipfsUri,
        owner: this.walletClient.account.address,
      }
    } catch (error) {
      console.error('❌ Error registering agent:', error)
      throw error
    }
  }

  /**
   * Extract agent ID from transaction receipt events
   * Falls back to parsing Transfer event (ERC721 mint)
   */
  private async getAgentIdFromReceipt(logs: any[]): Promise<bigint> {
    console.log(`📋 Parsing ${logs.length} transaction logs...`)

    // Try to parse AgentRegistered event
    const agentRegisteredLogs = parseEventLogs({
      abi: identityRegistryAbi,
      logs,
      eventName: 'AgentRegistered',
    })

    if (agentRegisteredLogs.length > 0) {
      console.log('✅ Found AgentRegistered event')
      return agentRegisteredLogs[0].args.agentId
    }

    // Fallback: Parse Transfer event (ERC721 minting)
    // Transfer(address(0), owner, tokenId) where tokenId is the agentId
    const transferEventAbi = [
      {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true },
          { name: 'to', type: 'address', indexed: true },
          { name: 'tokenId', type: 'uint256', indexed: true },
        ],
      },
    ] as const

    try {
      const transferLogs = parseEventLogs({
        abi: transferEventAbi,
        logs,
        eventName: 'Transfer',
      })

      if (transferLogs.length > 0) {
        const mintEvent = transferLogs.find(
          log => log.args.from === '0x0000000000000000000000000000000000000000'
        )

        if (mintEvent) {
          console.log('✅ Found Transfer (mint) event')
          return mintEvent.args.tokenId
        }
      }
    } catch (e) {
      console.log('⚠️  Could not parse Transfer event')
    }

    throw new Error('Could not extract agentId from transaction receipt')
  }

  /**
   * Get agent metadata from IPFS using on-chain tokenURI
   */
  async getAgentMetadata(agentId: bigint): Promise<AgentMetadata> {
    try {
      console.log(`📥 Fetching agent metadata for ID: ${agentId}`)

      // Get IPFS URI from contract
      const tokenURI = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as Address,
        abi: identityRegistryAbi,
        functionName: 'tokenURI',
        args: [agentId],
      })

      console.log(`📍 Token URI: ${tokenURI}`)

      // Fetch metadata from IPFS
      const metadata = await this.pinataService.getAgentMetadata(tokenURI)
      return metadata
    } catch (error) {
      console.error('❌ Error fetching agent metadata:', error)
      throw error
    }
  }

  /**
   * Get agent owner address
   */
  async getAgentOwner(agentId: bigint): Promise<Address> {
    try {
      const owner = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.IdentityRegistry as Address,
        abi: identityRegistryAbi,
        functionName: 'ownerOf',
        args: [agentId],
      })
      return owner
    } catch (error) {
      console.error('❌ Error fetching agent owner:', error)
      throw error
    }
  }

  /**
   * Submit feedback to reputation registry
   */
  async submitFeedback(
    agentId: bigint,
    rating: number,
    comment: string
  ): Promise<Hash> {
    try {
      console.log(`💬 Submitting feedback for agent ${agentId}`)
      console.log(`⭐ Rating: ${rating}/100`)

      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.ReputationRegistry as Address,
        abi: reputationRegistryAbi,
        functionName: 'submitFeedback',
        args: [agentId, BigInt(rating), comment],
        account: this.walletClient.account,
      })

      const txHash = await this.walletClient.writeContract(request)
      console.log(`📤 Feedback submitted: ${txHash}`)

      await this.publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log('✅ Feedback confirmed on-chain')

      return txHash
    } catch (error) {
      console.error('❌ Error submitting feedback:', error)
      throw error
    }
  }

  /**
   * Get agent reputation
   */
  async getAgentReputation(agentId: bigint): Promise<{
    totalReviews: bigint
    averageRating: bigint
    completedTasks: bigint
  }> {
    try {
      const result = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.ReputationRegistry as Address,
        abi: reputationRegistryAbi,
        functionName: 'getReputation',
        args: [agentId],
      })

      return {
        totalReviews: result[0],
        averageRating: result[1],
        completedTasks: result[2],
      }
    } catch (error) {
      console.error('❌ Error fetching reputation:', error)
      throw error
    }
  }

  /**
   * Submit validation proof
   */
  async submitValidation(
    agentId: bigint,
    taskId: string,
    proof: string
  ): Promise<Hash> {
    try {
      console.log(`✅ Submitting validation for agent ${agentId}, task ${taskId}`)

      // Convert proof string to hex bytes
      const proofBytes = `0x${Buffer.from(proof).toString('hex')}` as `0x${string}`

      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.ValidationRegistry as Address,
        abi: validationRegistryAbi,
        functionName: 'submitValidation',
        args: [agentId, taskId, proofBytes],
        account: this.walletClient.account,
      })

      const txHash = await this.walletClient.writeContract(request)
      console.log(`📤 Validation submitted: ${txHash}`)

      await this.publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log('✅ Validation confirmed on-chain')

      return txHash
    } catch (error) {
      console.error('❌ Error submitting validation:', error)
      throw error
    }
  }
}

// Singleton instance
let viemRegistryService: ViemRegistryService | null = null

export function getViemRegistryService(): ViemRegistryService {
  if (!viemRegistryService) {
    viemRegistryService = new ViemRegistryService()
  }
  return viemRegistryService
}
