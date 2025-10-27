/**
 * Orchestrator Test Script
 * Tests the complete orchestrator flow with ERC-3009 token payments
 */

import { getDatabase } from './lib/database'
import { getTokenService } from './lib/erc3009/token-service'
import { getX402Service } from './lib/x402/payment-service'
import type { Address } from 'viem'

async function main() {
  console.log('🧪 Starting Orchestrator Test Suite\n')

  // Test 1: Check ERC-3009 Token
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 Test 1: ERC-3009 Token Service')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const privateKey = process.env.HEDERA_PRIVATE_KEY as `0x${string}`
    const tokenService = getTokenService(privateKey)

    // Get token info
    const tokenInfo = await tokenService.getTokenInfo()
    console.log('✅ Token Info:')
    console.log(`   Name: ${tokenInfo.name}`)
    console.log(`   Symbol: ${tokenInfo.symbol}`)
    console.log(`   Address: ${tokenInfo.address}`)
    console.log(`   Decimals: ${tokenInfo.decimals}`)
    console.log(`   Total Supply: ${await tokenService.formatAmount(tokenInfo.totalSupply)} ${tokenInfo.symbol}`)

    // Check balance
    const myAddress = process.env.AGENT_EVM_ADDRESS as Address
    const balance = await tokenService.balanceOf(myAddress)
    const formattedBalance = await tokenService.formatAmount(balance)
    console.log(`\n   My Balance: ${formattedBalance} ${tokenInfo.symbol}`)
    console.log(`   My Address: ${myAddress}`)

    if (balance === 0n) {
      console.log('\n⚠️  Warning: Balance is 0. You may need to mint tokens first.')
      console.log('   Run: cd contracts/erc3009-token && MINT_RECIPIENT=' + myAddress + ' MINT_AMOUNT=1000 bun run scripts/mint.ts --network hederaTestnet')
    }
  } catch (error) {
    console.error('❌ Token service test failed:', error)
  }

  // Test 2: Check X402 Payment Service
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 Test 2: X402 Payment Service')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const paymentService = getX402Service()
    console.log('✅ X402 Payment Service initialized')
    console.log(`   Facilitator Mode: ${process.env.X402_FACILITATOR_MODE || 'hedera'}`)
    console.log(`   Facilitator Account: ${process.env.FACILITATOR_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID}`)
    console.log(`   Token Contract: ${process.env.ERC3009_TOKEN_ADDRESS}`)
  } catch (error) {
    console.error('❌ Payment service initialization failed:', error)
  }

  // Test 3: Check Database Connection
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 Test 3: Database Connection')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const db = getDatabase()

    // Count agents
    const agentCount = await db.agent.count()
    console.log(`✅ Database connected`)
    console.log(`   Agents registered: ${agentCount}`)

    // Count orchestrators
    const orchestratorCount = await db.orchestrator.count()
    console.log(`   Orchestrators: ${orchestratorCount}`)

    // List some agents
    if (agentCount > 0) {
      const agents = await db.agent.findMany({ take: 3 })
      console.log('\n   Sample Agents:')
      agents.forEach(agent => {
        console.log(`   - ${agent.name} (ID: ${agent.id})`)
        console.log(`     Account: ${agent.hederaAccountId}`)
        console.log(`     EVM: ${agent.evmAddress}`)
      })
    }
  } catch (error) {
    console.error('❌ Database test failed:', error)
  }

  // Test 4: Environment Variables Check
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 Test 4: Environment Configuration')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const requiredVars = [
    'HEDERA_ACCOUNT_ID',
    'HEDERA_PRIVATE_KEY',
    'HEDERA_NETWORK',
    'HEDERA_JSON_RPC_URL',
    'ERC3009_TOKEN_ADDRESS',
    'AGENT_EVM_ADDRESS',
  ]

  const optionalVars = [
    'FACILITATOR_ACCOUNT_ID',
    'FACILITATOR_PRIVATE_KEY',
    'FACILITATOR_EVM_ADDRESS',
    'X402_FACILITATOR_MODE',
    'OPENAI_API_KEY',
  ]

  console.log('Required Variables:')
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      const display = varName.includes('PRIVATE_KEY')
        ? value.substring(0, 10) + '...'
        : value.length > 50
          ? value.substring(0, 47) + '...'
          : value
      console.log(`   ✅ ${varName}: ${display}`)
    } else {
      console.log(`   ❌ ${varName}: NOT SET`)
    }
  })

  console.log('\nOptional Variables:')
  optionalVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      const display = varName.includes('PRIVATE_KEY') || varName.includes('API_KEY')
        ? value.substring(0, 10) + '...'
        : value.length > 50
          ? value.substring(0, 47) + '...'
          : value
      console.log(`   ✅ ${varName}: ${display}`)
    } else {
      console.log(`   ⚠️  ${varName}: not set (using defaults)`)
    }
  })

  // Test 5: Token Service Operations
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 Test 5: Token Service Operations')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const privateKey = process.env.HEDERA_PRIVATE_KEY as `0x${string}`
    const tokenService = getTokenService(privateKey)

    // Test domain separator
    const domainSeparator = await tokenService.getDomainSeparator()
    console.log('✅ Domain Separator:', domainSeparator)

    // Test amount parsing
    const parsedAmount = await tokenService.parseAmount('100')
    console.log(`✅ Parse Amount: "100" -> ${parsedAmount.toString()} wei`)

    // Test amount formatting
    const formattedAmount = await tokenService.formatAmount(parsedAmount)
    console.log(`✅ Format Amount: ${parsedAmount.toString()} wei -> "${formattedAmount}"`)

    // Test authorization state (random nonce, should be false)
    const testAddress = process.env.AGENT_EVM_ADDRESS as Address
    const randomNonce = `0x${Buffer.from(Math.random().toString()).toString('hex').padStart(64, '0')}` as `0x${string}`
    const isUsed = await tokenService.authorizationState(testAddress, randomNonce)
    console.log(`✅ Authorization State: nonce ${randomNonce.substring(0, 10)}... is ${isUsed ? 'used' : 'unused'}`)

  } catch (error) {
    console.error('❌ Token operations test failed:', error)
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Test Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ All tests completed!')
  console.log('\n🎯 Next Steps:')
  console.log('   1. Start the server: bun run dev')
  console.log('   2. Test orchestrator API endpoints')
  console.log('   3. Create a test orchestrator via API')
  console.log('   4. Execute payment flows with ERC-3009 tokens')
  console.log('\n📚 API Endpoints:')
  console.log('   POST /api/orchestrator/create - Create orchestrator')
  console.log('   GET  /api/orchestrator/:id - Get orchestrator info')
  console.log('   POST /api/orchestrator/:id/fund - Fund orchestrator wallet')
  console.log('   GET  /api/orchestrator/:id/balance - Check wallet balance')
  console.log('\n🔗 Resources:')
  console.log('   Token Contract: https://hashscan.io/testnet/contract/' + process.env.ERC3009_TOKEN_ADDRESS)
  console.log('   Account: https://hashscan.io/testnet/account/' + process.env.HEDERA_ACCOUNT_ID)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
  })
