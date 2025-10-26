#!/usr/bin/env bun
/**
 * Submit feedback for an existing agent and get transaction hash
 */

import { getViemRegistryService } from './lib/erc8004/viem-registry-service.js'
import { getFeedbackAuthService } from './lib/feedback/feedback-auth.service.js'

async function submitFeedbackWithAuth() {
  console.log('🎯 Submitting Feedback with Auth\n')
  console.log('━'.repeat(60))

  const registryService = getViemRegistryService()
  const feedbackAuthService = getFeedbackAuthService()

  // Test with existing agent (Agent ID 1, 2, or 3 exist from the check)
  const agentId = 1
  const clientAddress = '0x3acfa47617c313Fae5F27D7e7128578fCEf5ED94' // Use the operator's address
  const rating = 90
  const comment = 'Excellent agent! Great performance and reliability.'

  try {
    // Step 1: Generate FeedbackAuth
    console.log('📝 Step 1: Generating FeedbackAuth...')
    const feedbackAuth = await feedbackAuthService.generateFeedbackAuth({
      agentId,
      clientAddress,
      indexLimit: 100,
      expiryHours: 1,
    })

    console.log(`✅ FeedbackAuth generated`)
    console.log(`   Agent ID: ${agentId}`)
    console.log(`   Client: ${clientAddress}`)
    console.log(`   Signature: ${feedbackAuth.signature.slice(0, 20)}...`)
    console.log('')

    // Step 2: Submit feedback to blockchain
    console.log('💬 Step 2: Submitting feedback to blockchain...')
    console.log(`   Rating: ${rating}/100 ⭐`)
    console.log(`   Comment: "${comment}"`)
    console.log('')

    const txHash = await registryService.submitFeedback(
      BigInt(agentId),
      rating,
      comment,
      feedbackAuth.feedbackAuth as `0x${string}`
    )

    console.log('━'.repeat(60))
    console.log('✅ SUCCESS! Feedback submitted to blockchain!\n')
    console.log(`📤 Transaction Hash: ${txHash}`)
    console.log(`🔗 View on Hashscan: https://hashscan.io/testnet/transaction/${txHash}`)
    console.log('')
    console.log('📊 This transaction:')
    console.log(`   • Submitted rating of ${rating}/100`)
    console.log(`   • Added review comment to blockchain`)
    console.log(`   • Updated agent ${agentId}'s reputation`)
    console.log(`   • All data is immutably stored on Hedera`)
    console.log('━'.repeat(60))

    return txHash
  } catch (error: any) {
    console.error('\n❌ Error:', error.message.split('\n')[0])
    console.error('\nFull error details:')
    console.error(error)
    process.exit(1)
  }
}

// Run the submission
submitFeedbackWithAuth().catch(console.error)
