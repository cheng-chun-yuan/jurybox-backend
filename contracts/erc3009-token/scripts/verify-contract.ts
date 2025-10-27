/**
 * Smart Contract Verification Script
 * Verifies the deployed ERC-3009 token on Hedera HashScan
 */

import fs from 'fs'
import path from 'path'

const CONTRACT_ADDRESS = process.env.ERC3009_TOKEN_ADDRESS || '0x7613F0cdeb862d15aaD18CaF0850767481bFfa64'
const CHAIN_ID = '296' // Hedera Testnet
const VERIFY_API_URL = 'https://server-verify.hashscan.io'

async function verifyContract() {
  console.log('🔍 Verifying contract on Hedera HashScan...')
  console.log(`   Contract: ${CONTRACT_ADDRESS}`)
  console.log(`   Chain ID: ${CHAIN_ID} (Hedera Testnet)`)
  console.log(`   API: ${VERIFY_API_URL}`)

  try {
    // Read the contract source code
    const contractPath = path.join(__dirname, '../contracts/SimpleERC20WithERC3009.sol')
    const sourceCode = fs.readFileSync(contractPath, 'utf8')

    console.log('\n📄 Reading contract source...')
    console.log(`   File: ${contractPath}`)
    console.log(`   Size: ${sourceCode.length} bytes`)

    // Prepare verification payload
    const verificationPayload = {
      address: CONTRACT_ADDRESS,
      chain: CHAIN_ID,
      files: {
        'SimpleERC20WithERC3009.sol': sourceCode
      },
      // Optional: add constructor arguments if needed
      // constructorArguments: '0x...'
    }

    console.log('\n📤 Submitting verification request...')

    // Submit verification
    const response = await fetch(`${VERIFY_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationPayload)
    })

    const result = await response.json()

    if (response.ok) {
      console.log('\n✅ Verification submitted successfully!')
      console.log('   Response:', JSON.stringify(result, null, 2))

      // Check verification status
      await checkVerificationStatus(CONTRACT_ADDRESS, CHAIN_ID)
    } else {
      console.error('\n❌ Verification failed!')
      console.error('   Status:', response.status)
      console.error('   Response:', JSON.stringify(result, null, 2))

      // Try alternative method: using Hardhat verify
      console.log('\n🔄 Trying Hardhat verification method...')
      await verifyWithHardhat()
    }
  } catch (error) {
    console.error('\n❌ Verification error:', error)
    console.log('\n💡 Alternative: Verify manually on HashScan')
    console.log(`   Visit: https://hashscan.io/testnet/contract/${CONTRACT_ADDRESS}`)
    console.log('   Click "Contract" tab -> "Verify Contract"')
  }
}

async function checkVerificationStatus(address: string, chainId: string) {
  console.log('\n🔍 Checking verification status...')

  try {
    const response = await fetch(
      `${VERIFY_API_URL}/check-by-addresses?addresses=${address}&chainIds=${chainId}`
    )

    const result = await response.json()
    console.log('   Status:', JSON.stringify(result, null, 2))

    if (result[0]?.status === 'perfect') {
      console.log('\n✅ Contract is verified!')
      console.log(`   View on HashScan: https://hashscan.io/testnet/contract/${address}`)
    } else {
      console.log('\n⏳ Verification pending or not found')
      console.log('   Status:', result[0]?.status || 'unknown')
    }
  } catch (error) {
    console.error('   Error checking status:', error)
  }
}

async function verifyWithHardhat() {
  console.log('📝 Attempting Hardhat verification...')
  console.log('   This requires hardhat-verify plugin')

  const { spawn } = await import('child_process')

  return new Promise<void>((resolve, reject) => {
    // Get constructor arguments
    const TOKEN_NAME = process.env.TOKEN_NAME || 'JuryBox Payment Token'
    const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || 'JBPT'
    const TOKEN_DECIMALS = process.env.TOKEN_DECIMALS || '18'

    // Build verification command
    const args = [
      'hardhat',
      'verify',
      '--network', 'hederaTestnet',
      CONTRACT_ADDRESS,
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_DECIMALS
    ]

    console.log('   Command:', 'npx', args.join(' '))

    const proc = spawn('npx', args, { stdio: 'inherit' })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Hardhat verification succeeded!')
        resolve()
      } else {
        console.log('❌ Hardhat verification failed with code:', code)
        reject(new Error(`Verification failed with code ${code}`))
      }
    })

    proc.on('error', (error) => {
      console.error('❌ Hardhat verification error:', error)
      reject(error)
    })
  })
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('     Smart Contract Verification on Hedera HashScan')
  console.log('═══════════════════════════════════════════════════════════\n')

  await verifyContract()

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('     Verification Process Complete')
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('📚 Resources:')
  console.log(`   Contract: https://hashscan.io/testnet/contract/${CONTRACT_ADDRESS}`)
  console.log('   Verification API: https://server-verify.hashscan.io')
  console.log('   API Docs: https://docs.hashscan.io/api/smart-contract-verification')
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
