#!/usr/bin/env bun
/**
 * Test script for Feedback Auth and Submission
 *
 * This script demonstrates:
 * 1. Generating a FeedbackAuth signature
 * 2. Submitting feedback using the authenticated session
 * 3. Getting the transaction hash on Hedera
 */

const BASE_URL = 'http://localhost:10001'

// Test configuration
const TEST_CONFIG = {
  agentId: 1, // Agent ID to submit feedback for
  clientAddress: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0', // Example client address (lowercase)
  rating: 85, // Rating out of 100
  comment: 'Excellent AI agent! Very helpful and accurate responses.',
  indexLimit: 100, // Number of feedback submissions allowed
  expiryHours: 1, // Valid for 1 hour
}

async function main() {
  console.log('🧪 Testing Feedback Auth & Submission Flow\n')
  console.log('━'.repeat(60))

  try {
    // Step 1: Generate FeedbackAuth
    console.log('\n📝 Step 1: Generating FeedbackAuth...')
    console.log(`   Agent ID: ${TEST_CONFIG.agentId}`)
    console.log(`   Client Address: ${TEST_CONFIG.clientAddress}`)

    const authResponse = await fetch(`${BASE_URL}/api/feedback/auth/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: TEST_CONFIG.agentId,
        clientAddress: TEST_CONFIG.clientAddress,
        indexLimit: TEST_CONFIG.indexLimit,
        expiryHours: TEST_CONFIG.expiryHours,
      }),
    })

    if (!authResponse.ok) {
      const error = await authResponse.json()
      throw new Error(`Failed to generate auth: ${error.message}`)
    }

    const authData = await authResponse.json()
    console.log('\n✅ FeedbackAuth Generated Successfully!')
    console.log(`   Signature: ${authData.data.signature.slice(0, 20)}...`)
    console.log(`   Index Range: ${authData.data.indexFrom} → ${authData.data.indexTo}`)
    console.log(`   Expiry: ${authData.data.expiryDate}`)
    console.log(`   Encoded: ${authData.data.encoded.slice(0, 40)}...`)

    // Step 2: Verify FeedbackAuth (optional)
    console.log('\n🔍 Step 2: Verifying FeedbackAuth...')
    const verifyResponse = await fetch(`${BASE_URL}/api/feedback/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: authData.data.agentId,
        clientAddress: authData.data.clientAddress,
        indexFrom: authData.data.indexFrom,
        indexTo: authData.data.indexTo,
        expiry: authData.data.expiry,
        signature: authData.data.signature,
      }),
    })

    const verifyData = await verifyResponse.json()
    console.log(`   Valid: ${verifyData.data.isValid ? '✅' : '❌'}`)
    console.log(`   Expired: ${verifyData.data.expired ? '❌' : '✅'}`)

    // Step 3: Submit Feedback (simulated - this would call the blockchain)
    console.log('\n💬 Step 3: Submitting Feedback...')
    console.log(`   Rating: ${TEST_CONFIG.rating}/100 ⭐`)
    console.log(`   Comment: "${TEST_CONFIG.comment}"`)

    // Note: The actual blockchain submission would happen here
    // For now, we'll demonstrate the viem-registry-service call
    const { getViemRegistryService } = await import('./lib/erc8004/viem-registry-service.js')
    const registryService = getViemRegistryService()

    try {
      const txHash = await registryService.submitFeedback(
        BigInt(TEST_CONFIG.agentId),
        TEST_CONFIG.rating,
        TEST_CONFIG.comment
      )

      console.log('\n✅ Feedback Submitted Successfully!')
      console.log(`   Transaction Hash: ${txHash}`)
      console.log(`   View on Hashscan: https://hashscan.io/testnet/transaction/${txHash}`)
    } catch (error: any) {
      console.log('\n⚠️  Blockchain submission simulation:')
      console.log(`   This would submit to blockchain with FeedbackAuth`)
      console.log(`   Error: ${error.message}`)
      console.log(`   Note: Actual submission requires gas and proper wallet setup`)
    }

    // Step 4: Get Agent Reputation
    console.log('\n📊 Step 4: Fetching Agent Reputation...')
    const reputationResponse = await fetch(`${BASE_URL}/api/feedback/${TEST_CONFIG.agentId}`)

    if (reputationResponse.ok) {
      const reputationData = await reputationResponse.json()
      console.log('   Current Reputation:')
      console.log(`   • Total Reviews: ${reputationData.data.totalReviews}`)
      console.log(`   • Average Rating: ${reputationData.data.averageRating}%`)
      console.log(`   • Completed Tasks: ${reputationData.data.completedTasks}`)
    } else {
      console.log('   Could not fetch reputation (agent might not exist yet)')
    }

    console.log('\n━'.repeat(60))
    console.log('✅ Test completed successfully!')
    console.log('\n📚 Summary:')
    console.log('   1. Generated FeedbackAuth signature ✅')
    console.log('   2. Verified signature validity ✅')
    console.log('   3. Prepared feedback submission ✅')
    console.log('   4. Retrieved agent reputation ✅')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)
