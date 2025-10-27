/**
 * Simple Contract Verification using cURL
 * This script generates a cURL command you can run to verify the contract
 */

const CONTRACT_ADDRESS = process.env.ERC3009_TOKEN_ADDRESS || '0x7613F0cdeb862d15aaD18CaF0850767481bFfa64'
const TOKEN_NAME = process.env.TOKEN_NAME || 'JuryBox Payment Token'
const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || 'JBPT'
const TOKEN_DECIMALS = process.env.TOKEN_DECIMALS || '18'

console.log('═══════════════════════════════════════════════════════════')
console.log('     Contract Verification - Manual Method')
console.log('═══════════════════════════════════════════════════════════\n')

console.log('📍 Contract Details:')
console.log(`   Address: ${CONTRACT_ADDRESS}`)
console.log(`   Name: ${TOKEN_NAME}`)
console.log(`   Symbol: ${TOKEN_SYMBOL}`)
console.log(`   Decimals: ${TOKEN_DECIMALS}`)
console.log(`   Network: Hedera Testnet (Chain ID: 296)`)

console.log('\n✨ Option 1: Verify via HashScan UI (Recommended)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('1. Visit: https://hashscan.io/testnet/contract/' + CONTRACT_ADDRESS)
console.log('2. Click the "Contract" tab')
console.log('3. Click "Verify & Publish"')
console.log('4. Select "Solidity (Single file)"')
console.log('5. Fill in the details:')
console.log('   - Compiler Version: v0.8.20+commit.a1b79de6')
console.log('   - Optimization: Yes (200 runs)')
console.log('   - Contract Source Code: Copy from contracts/SimpleERC20WithERC3009.sol')
console.log('   - Constructor Arguments (ABI-encoded):')

// Encode constructor arguments
const ethers = require('ethers')
const abiCoder = ethers.AbiCoder.defaultAbiCoder()
const constructorArgs = abiCoder.encode(
  ['string', 'string', 'uint8'],
  [TOKEN_NAME, TOKEN_SYMBOL, parseInt(TOKEN_DECIMALS)]
)

console.log('   ' + constructorArgs)

console.log('\n✨ Option 2: Check Current Verification Status')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Run this command to check if already verified:')
console.log('')
console.log(`curl "https://server-verify.hashscan.io/check-by-addresses?addresses=${CONTRACT_ADDRESS}&chainIds=296"`)

console.log('\n✨ Option 3: Verify via API')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Note: API verification requires metadata.json from Hardhat compilation')
console.log('For now, use Option 1 (HashScan UI) as it\'s the most reliable method.')

console.log('\n📚 Resources:')
console.log('   Contract Source: contracts/erc3009-token/contracts/SimpleERC20WithERC3009.sol')
console.log('   HashScan: https://hashscan.io/testnet/contract/' + CONTRACT_ADDRESS)
console.log('   Verification API: https://server-verify.hashscan.io')
console.log('')

console.log('═══════════════════════════════════════════════════════════\n')

// Also check current status
async function checkStatus() {
  try {
    const response = await fetch(
      `https://server-verify.hashscan.io/check-by-addresses?addresses=${CONTRACT_ADDRESS}&chainIds=296`
    )
    const result = await response.json()

    console.log('🔍 Current Verification Status:')
    if (result && result.length > 0) {
      console.log('   Status:', result[0].status || 'unknown')
      if (result[0].status === 'perfect') {
        console.log('   ✅ Contract is already verified!')
      } else if (result[0].status === 'partial') {
        console.log('   ⚠️  Contract is partially verified')
      } else {
        console.log('   ❌ Contract is not verified yet')
      }
    } else {
      console.log('   ❌ Contract verification not found')
      console.log('   Please verify using one of the methods above.')
    }
  } catch (error) {
    console.log('   ⚠️  Could not check verification status')
  }
}

checkStatus()
