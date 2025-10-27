/**
 * API Verification with Metadata
 * Uses the extracted metadata.json from Hardhat compilation
 */

import fs from 'fs'
import path from 'path'

const CONTRACT_ADDRESS = process.env.ERC3009_TOKEN_ADDRESS || '0x7613F0cdeb862d15aaD18CaF0850767481bFfa64'
const CHAIN_ID = '296' // Hedera Testnet
const VERIFY_API_URL = 'https://server-verify.hashscan.io'

async function verifyWithMetadata() {
  console.log('🚀 Starting API verification with metadata...\n')
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`)
  console.log(`🔗 Network: Hedera Testnet (${CHAIN_ID})`)
  console.log(`🌐 API: ${VERIFY_API_URL}\n`)

  try {
    // Read source code
    const sourceCode = fs.readFileSync(
      path.join(__dirname, 'contracts/SimpleERC20WithERC3009.sol'),
      'utf8'
    )

    // Read metadata
    const metadataPath = path.join(__dirname, 'metadata.json')
    if (!fs.existsSync(metadataPath)) {
      console.log('❌ metadata.json not found!')
      console.log('   Metadata should be at:', metadataPath)
      console.log('   Please extract it from artifacts/build-info first')
      return
    }

    const metadata = fs.readFileSync(metadataPath, 'utf8')

    console.log('✅ Files loaded:')
    console.log(`   Source: ${sourceCode.length} bytes`)
    console.log(`   Metadata: ${metadata.length} bytes\n`)

    // Prepare verification payload
    const payload = {
      address: CONTRACT_ADDRESS,
      chain: CHAIN_ID,
      files: {
        'SimpleERC20WithERC3009.sol': sourceCode,
        'metadata.json': metadata
      }
    }

    console.log('📤 Submitting verification to HashScan API...\n')

    const response = await fetch(`${VERIFY_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const contentType = response.headers.get('content-type')
    let result

    if (contentType && contentType.includes('application/json')) {
      result = await response.json()
    } else {
      const text = await response.text()
      result = { rawResponse: text }
    }

    console.log(`📊 Response Status: ${response.status}\n`)

    if (response.ok) {
      console.log('✅ Verification submitted successfully!')
      console.log('\n📝 Response:')
      console.log(JSON.stringify(result, null, 2))

      // Wait and check status
      console.log('\n⏳ Waiting 5 seconds to check verification status...')
      await new Promise(resolve => setTimeout(resolve, 5000))

      await checkStatus()
    } else {
      console.log('⚠️  Verification response:')
      console.log(JSON.stringify(result, null, 2))

      if (result.error) {
        console.log('\n💡 Error details:')
        console.log('   ', result.error)

        if (result.message) {
          console.log('   ', result.message)
        }
      }
    }
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

async function checkStatus() {
  console.log('\n🔍 Checking verification status...\n')

  try {
    const response = await fetch(
      `${VERIFY_API_URL}/check-by-addresses?addresses=${CONTRACT_ADDRESS}&chainIds=${CHAIN_ID}`
    )

    const result = await response.json()

    if (result && result.length > 0) {
      const status = result[0].status
      console.log(`   Status: ${status}`)

      if (status === 'perfect' || status === true) {
        console.log('\n🎉 CONTRACT IS VERIFIED!')
        console.log(`\n   View at: https://hashscan.io/testnet/contract/${CONTRACT_ADDRESS}`)
        console.log('   ✅ Source code is now public')
        console.log('   ✅ ABI is available')
        console.log('   ✅ Contract has green checkmark')
      } else if (status === 'partial') {
        console.log('\n⚠️  Contract is partially verified')
      } else {
        console.log('\n❌ Contract is not verified yet')
        console.log('   This might take a few moments. Check again in 30 seconds.')
      }

      console.log('\n   Full response:', JSON.stringify(result, null, 2))
    } else {
      console.log('   No verification data found')
    }
  } catch (error) {
    console.error('   Error checking status:', error)
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('     API Verification with Metadata')
  console.log('═══════════════════════════════════════════════════════════\n')

  await verifyWithMetadata()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('     Verification Complete')
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('🔗 Resources:')
  console.log(`   Contract: https://hashscan.io/testnet/contract/${CONTRACT_ADDRESS}`)
  console.log('   API: https://server-verify.hashscan.io')
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
