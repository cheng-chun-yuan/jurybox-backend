#!/usr/bin/env bun
/**
 * Check which agents exist on-chain and their details
 */

import { getViemRegistryService } from './lib/erc8004/viem-registry-service.js'

async function checkAgents() {
  console.log('🔍 Checking for existing agents on blockchain...\n')

  const registryService = getViemRegistryService()

  // Check agents from ID 1 to 10
  const agentIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const existingAgents = []

  for (const agentId of agentIds) {
    try {
      console.log(`Checking Agent ID ${agentId}...`)

      // Try to get agent owner (will fail if agent doesn't exist)
      const owner = await registryService.getAgentOwner(BigInt(agentId))
      console.log(`  ✅ Agent ${agentId} exists! Owner: ${owner}`)

      // Try to get metadata
      try {
        const metadata = await registryService.getAgentMetadata(BigInt(agentId))
        console.log(`  📋 Name: ${metadata.name}`)
        console.log(`  📝 Bio: ${metadata.bio}`)
      } catch (e) {
        console.log(`  ⚠️  Metadata not available`)
      }

      // Try to get reputation
      try {
        const reputation = await registryService.getAgentReputation(BigInt(agentId))
        console.log(`  ⭐ Reviews: ${reputation.totalReviews}, Rating: ${reputation.averageRating}`)
      } catch (e) {
        console.log(`  ⚠️  Reputation not available`)
      }

      existingAgents.push({ agentId, owner })
      console.log('')
    } catch (error: any) {
      if (error.message.includes('ERC721NonexistentToken') ||
          error.message.includes('owner query for nonexistent token')) {
        console.log(`  ⊘ Agent ${agentId} does not exist`)
      } else {
        console.log(`  ⚠️  Error: ${error.message.split('\n')[0]}`)
      }
      console.log('')
    }
  }

  console.log('━'.repeat(60))
  if (existingAgents.length > 0) {
    console.log(`\n✅ Found ${existingAgents.length} existing agent(s):\n`)
    existingAgents.forEach(({ agentId, owner }) => {
      console.log(`   Agent ID ${agentId}: ${owner}`)
    })
    console.log(`\n💡 You can submit feedback for these agents!`)
  } else {
    console.log('\n⚠️  No agents found on-chain.')
    console.log('💡 You need to register an agent first before submitting feedback.')
  }

  return existingAgents
}

checkAgents().catch(console.error)
