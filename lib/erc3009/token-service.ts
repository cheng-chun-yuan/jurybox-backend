/**
 * ERC-3009 Token Service
 * Wrapper for interacting with the deployed ERC-3009 token contract
 * Supports gasless transfers via receiveWithAuthorization
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Address, type Hash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { defineChain } from 'viem/utils'

// Define Hedera chains
export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
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
})

export const hederaMainnet = defineChain({
  id: 295,
  name: 'Hedera Mainnet',
  network: 'hedera-mainnet',
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

// ERC-3009 Token ABI (only the functions we need)
const ERC3009_ABI = [
  // ERC-20 views
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ERC-3009 views
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    name: 'authorizationState',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ERC-20 functions
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ERC-3009 functions
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'receiveWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export interface TokenInfo {
  address: Address
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
}

export interface TransferAuthorization {
  from: Address
  to: Address
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: `0x${string}`
  v: number
  r: `0x${string}`
  s: `0x${string}`
}

export class ERC3009TokenService {
  private publicClient
  private walletClient
  private tokenAddress: Address
  private chain

  constructor(privateKey?: `0x${string}`) {
    const network = process.env.HEDERA_NETWORK || 'testnet'
    this.chain = network === 'mainnet' ? hederaMainnet : hederaTestnet

    const rpcUrl = process.env.HEDERA_JSON_RPC_URL || this.chain.rpcUrls.default.http[0]
    this.tokenAddress = (process.env.ERC3009_TOKEN_ADDRESS as Address) || '0xDab9Cf7aAC0dD94Fd353832Ea101069fEfD79CbD'

    // Create public client for reading
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    })

    // Create wallet client for writing (if private key provided)
    if (privateKey) {
      const account = privateKeyToAccount(privateKey)
      this.walletClient = createWalletClient({
        account,
        chain: this.chain,
        transport: http(rpcUrl),
      })
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(): Promise<TokenInfo> {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      this.publicClient.readContract({
        address: this.tokenAddress,
        abi: ERC3009_ABI,
        functionName: 'name',
      }),
      this.publicClient.readContract({
        address: this.tokenAddress,
        abi: ERC3009_ABI,
        functionName: 'symbol',
      }),
      this.publicClient.readContract({
        address: this.tokenAddress,
        abi: ERC3009_ABI,
        functionName: 'decimals',
      }),
      this.publicClient.readContract({
        address: this.tokenAddress,
        abi: ERC3009_ABI,
        functionName: 'totalSupply',
      }),
    ])

    return {
      address: this.tokenAddress,
      name,
      symbol,
      decimals,
      totalSupply,
    }
  }

  /**
   * Get balance of an address
   */
  async balanceOf(address: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'balanceOf',
      args: [address],
    })
  }

  /**
   * Get formatted balance (as string with decimals)
   */
  async getFormattedBalance(address: Address): Promise<string> {
    const balance = await this.balanceOf(address)
    const info = await this.getTokenInfo()
    return formatUnits(balance, info.decimals)
  }

  /**
   * Check if an authorization has been used
   */
  async authorizationState(authorizer: Address, nonce: `0x${string}`): Promise<boolean> {
    return await this.publicClient.readContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'authorizationState',
      args: [authorizer, nonce],
    })
  }

  /**
   * Execute receiveWithAuthorization (gasless transfer)
   * The recipient (to) must be the caller for security
   */
  async receiveWithAuthorization(auth: TransferAuthorization): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Provide private key in constructor.')
    }

    // Ensure caller is the recipient (security requirement)
    if (this.walletClient.account.address.toLowerCase() !== auth.to.toLowerCase()) {
      throw new Error('Caller must be the recipient (to address) for receiveWithAuthorization')
    }

    const hash = await this.walletClient.writeContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'receiveWithAuthorization',
      args: [
        auth.from,
        auth.to,
        auth.value,
        auth.validAfter,
        auth.validBefore,
        auth.nonce,
        auth.v,
        auth.r,
        auth.s,
      ],
    })

    return hash
  }

  /**
   * Execute transferWithAuthorization (gasless transfer, any relayer)
   */
  async transferWithAuthorization(auth: TransferAuthorization): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Provide private key in constructor.')
    }

    const hash = await this.walletClient.writeContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        auth.from,
        auth.to,
        auth.value,
        auth.validAfter,
        auth.validBefore,
        auth.nonce,
        auth.v,
        auth.r,
        auth.s,
      ],
    })

    return hash
  }

  /**
   * Regular ERC-20 transfer (requires gas from sender)
   */
  async transfer(to: Address, amount: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Provide private key in constructor.')
    }

    const hash = await this.walletClient.writeContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'transfer',
      args: [to, amount],
    })

    return hash
  }

  /**
   * Mint tokens (only works if caller has minting permissions)
   */
  async mint(to: Address, amount: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Provide private key in constructor.')
    }

    const hash = await this.walletClient.writeContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'mint',
      args: [to, amount],
    })

    return hash
  }

  /**
   * Parse amount from human-readable format (e.g., "100" -> wei amount)
   */
  async parseAmount(amount: string): Promise<bigint> {
    const info = await this.getTokenInfo()
    return parseUnits(amount, info.decimals)
  }

  /**
   * Format amount to human-readable format (e.g., wei amount -> "100")
   */
  async formatAmount(amount: bigint): Promise<string> {
    const info = await this.getTokenInfo()
    return formatUnits(amount, info.decimals)
  }

  /**
   * Get domain separator for EIP-712 signing
   */
  async getDomainSeparator(): Promise<`0x${string}`> {
    return await this.publicClient.readContract({
      address: this.tokenAddress,
      abi: ERC3009_ABI,
      functionName: 'DOMAIN_SEPARATOR',
    })
  }
}

// Singleton instance
let tokenService: ERC3009TokenService | null = null

export function getTokenService(privateKey?: `0x${string}`): ERC3009TokenService {
  if (!tokenService) {
    tokenService = new ERC3009TokenService(privateKey)
  }
  return tokenService
}
