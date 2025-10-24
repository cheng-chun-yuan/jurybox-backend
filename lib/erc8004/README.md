# ERC-8004 Registry Service with Viem

Type-safe agent registration system using **viem** for blockchain interactions and **Pinata** for IPFS storage.

## Overview

This implementation provides a complete agent registration workflow:

1. **Create metadata** - Define agent capabilities and information
2. **Upload to IPFS** - Store metadata on Pinata
3. **Register on-chain** - Store IPFS URI in smart contract
4. **Retrieve data** - Fetch metadata from IPFS using on-chain URI

## Architecture

```
┌─────────────────┐
│  Agent Metadata │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Pinata Service  │────▶│  IPFS Network    │
└────────┬────────┘     └──────────────────┘
         │                        │
         │ IPFS URI               │ ipfs://Qm...
         ▼                        │
┌─────────────────┐               │
│ Viem Registry   │               │
│    Service      │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ Smart Contract  │               │
│ (Hedera EVM)    │◀──────────────┘
└─────────────────┘
   - IdentityRegistry
   - ReputationRegistry
   - ValidationRegistry
```

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy .env.example to .env
cp .env.example .env
```

Edit `.env`:

```bash
# Hedera
HEDERA_PRIVATE_KEY=0x... # Your private key with 0x prefix
HEDERA_NETWORK=testnet

# Pinata (get from https://www.pinata.cloud/)
PINATA_API_KEY=your-api-key
PINATA_API_SECRET=your-api-secret
```

### 2. Run the Demo

```bash
bun run scripts/demo-agent-registration.ts
```

This will:
- ✅ Create sample agent metadata
- ✅ Upload to IPFS via Pinata
- ✅ Register on Hedera blockchain
- ✅ Extract agent ID from transaction
- ✅ Verify by fetching metadata

## Usage Examples

### Register an Agent

```typescript
import { getViemRegistryService } from '@/lib/erc8004/viem-registry-service'
import type { AgentMetadata } from '@/lib/ipfs/pinata-service'

const registryService = getViemRegistryService()

// Create metadata
const metadata: AgentMetadata = {
  name: 'CodeReviewer',
  title: 'Senior Code Review Agent',
  description: 'Expert in code analysis',
  capabilities: ['code-review', 'security-audit'],
  createdAt: Date.now(),
}

// Register (uploads to IPFS + registers on-chain)
const result = await registryService.registerAgent(metadata)

console.log('Agent ID:', result.agentId)
console.log('IPFS URI:', result.ipfsUri)
console.log('TX Hash:', result.txHash)
```

### Get Agent Metadata

```typescript
const agentId = 1n // Agent ID from registration

// Fetch metadata from IPFS
const metadata = await registryService.getAgentMetadata(agentId)
console.log(metadata)
```

### Submit Feedback

```typescript
const agentId = 1n
const rating = 95 // 0-100
const comment = 'Excellent code review!'

const txHash = await registryService.submitFeedback(agentId, rating, comment)
console.log('Feedback submitted:', txHash)
```

### Get Reputation

```typescript
const agentId = 1n

const reputation = await registryService.getAgentReputation(agentId)
console.log('Total Reviews:', reputation.totalReviews)
console.log('Average Rating:', reputation.averageRating)
console.log('Completed Tasks:', reputation.completedTasks)
```

## Contract Addresses

The proxy contract addresses are defined in [contract-addresses.ts](./contract-addresses.ts):

- **IdentityRegistry**: `0xce7ffd7892e7d7b3aa653be72b3e32ba88edbd57`
- **ReputationRegistry**: `0x4425d2d2e315854410ffb6d4281805ac20ff40a8`
- **ValidationRegistry**: `0x354bb45099efc3bb31682a14a9ff74cabf40bb8a`

These addresses point to upgradeable proxy contracts deployed on Hedera testnet.

## Files

- **viem-client.ts** - Hedera chain configuration and client setup
- **viem-registry-service.ts** - Main service for contract interactions
- **contract-addresses.ts** - Proxy contract addresses
- **../ipfs/pinata-service.ts** - IPFS upload/download via Pinata

## Why Viem?

✅ **Type Safety** - Full TypeScript support with ABIs
✅ **Modern** - Better DX than ethers.js
✅ **Lightweight** - Smaller bundle size
✅ **Performance** - Optimized for speed
✅ **Better Error Handling** - Clear error messages

## IPFS Flow

1. **Upload**: `metadata → Pinata → IPFS → ipfs://Qm...`
2. **Register**: `ipfs://Qm... → Smart Contract`
3. **Retrieve**: `Smart Contract → ipfs://Qm... → IPFS Gateway → metadata`

## Hedera Integration

This service uses **Hedera Smart Contract Service** which is EVM-compatible:

- **Network**: Hedera Testnet (Chain ID: 296)
- **RPC**: https://testnet.hashio.io/api
- **Currency**: HBAR (much cheaper than ETH gas)
- **Explorer**: https://hashscan.io/testnet

## Migration from Ethers

If you're migrating from the old ethers-based service:

| Ethers | Viem |
|--------|------|
| `ethers.Contract` | `publicClient.readContract` / `walletClient.writeContract` |
| `contract.functionName()` | `client.readContract({ functionName })` |
| `contract.connect(signer).functionName()` | `walletClient.writeContract({ functionName })` |
| `ethers.keccak256()` | `keccak256()` from viem |
| `ethers.toUtf8Bytes()` | `new TextEncoder().encode()` |

## Contract Source

The smart contract source code is maintained in a separate repository:
`/Users/chengchunyuan/project/hackathon/erc-8004-contracts`

## Support

- **Viem Docs**: https://viem.sh
- **Pinata Docs**: https://docs.pinata.cloud
- **Hedera Docs**: https://docs.hedera.com
