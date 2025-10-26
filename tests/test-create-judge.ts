/**
 * Test script for POST /api/judges endpoint
 * Tests the complete judge creation flow with wallet generation
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000'

interface CreateJudgeRequest {
  name: string
  title: string
  tagline: string[]
  description: string
  avatar: string
  themeColor: string
  specialties: string[]
  modelProvider?: string
  modelName?: string
  systemPrompt?: string
  temperature?: number
  price: number
  walletAddress?: string
  ipfsCid?: string
}

interface CreateJudgeResponse {
  success: boolean
  judgeId: number
  walletAddress: string
  evmAddress: string
  price: number
  paymentPageUrl: string
  registryTxHash: string | null
}

async function testCreateJudge() {
  console.log('🧪 Testing POST /api/judges endpoint...\n')

  // Test data matching frontend format
  const judgeData: CreateJudgeRequest = {
    name: "Dr. Academic",
    title: "Research Specialist",
    tagline: ["Academic", "Research"],
    description: "Expert researcher specializing in academic writing and methodology",
    avatar: "https://ipfs.io/ipfs/QmXXX.../avatar.jpg",
    themeColor: "#8B5CF6",
    specialties: ["Research Methodology", "Academic Writing", "Peer Review"],
    modelProvider: "openai",
    modelName: "gpt-4",
    systemPrompt: "You are Dr. Academic, an expert researcher...",
    temperature: 0.7,
    price: 0.05,
  }

  console.log('📤 Request payload:')
  console.log(JSON.stringify(judgeData, null, 2))
  console.log()

  try {
    const response = await fetch(`${BACKEND_URL}/api/judges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(judgeData),
    })

    const result: CreateJudgeResponse = await response.json()

    console.log('📥 Response status:', response.status)
    console.log('📥 Response body:')
    console.log(JSON.stringify(result, null, 2))
    console.log()

    if (result.success) {
      console.log('✅ Judge created successfully!')
      console.log(`   Judge ID: ${result.judgeId}`)
      console.log(`   Hedera Account: ${result.walletAddress}`)
      console.log(`   EVM Address: ${result.evmAddress}`)
      console.log(`   Price: ${result.price} HBAR`)
      console.log(`   Payment URL: ${result.paymentPageUrl}`)
      console.log()

      // Verify the judge was created
      console.log('🔍 Verifying judge was created...')
      const verifyResponse = await fetch(`${BACKEND_URL}/api/judges/${result.judgeId}`)
      const judge = await verifyResponse.json()

      if (judge.success && judge.data) {
        console.log('✅ Judge verification successful!')
        console.log(`   Name: ${judge.data.name}`)
        console.log(`   Title: ${judge.data.title}`)
        console.log(`   Specialties: ${judge.data.specialties.join(', ')}`)
        console.log()
      } else {
        console.log('❌ Judge verification failed')
        console.log(judge)
      }
    } else {
      console.log('❌ Failed to create judge')
      console.log(result)
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testCreateJudge()
