/**
 * X402 Facilitator Routes
 * Acts as a facilitator service to verify and settle X402 payments
 */

import { FastifyPluginAsync } from 'fastify'
import { PrivateKey, Client, TransferTransaction, Hbar, AccountId } from '@hashgraph/sdk'
import { config } from '../config'

const facilitatorRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize Hedera client with facilitator credentials
  const facilitatorAccountId = AccountId.fromString(
    process.env.FACILITATOR_ACCOUNT_ID || config.hedera.accountId
  )
  const facilitatorPrivateKey = PrivateKey.fromString(
    (process.env.FACILITATOR_PRIVATE_KEY || config.hedera.privateKey).replace(/^0x/, '')
  )
  const client = Client.forName(config.hedera.network).setOperator(
    facilitatorAccountId,
    facilitatorPrivateKey
  )

  fastify.log.info('Facilitator service initialized', {
    accountId: facilitatorAccountId.toString(),
    network: config.hedera.network,
  })

  /**
   * POST /api/facilitator/verify
   * Verify X402 payment payload
   */
  fastify.post('/verify', async (request, reply) => {
    try {
      const { paymentPayload, requirements } = request.body as {
        paymentPayload: any
        requirements: any
      }

      fastify.log.debug('Verifying payment', { paymentPayload, requirements })

      // Extract payment details from payload
      const { from, to, amount, transactionId } = paymentPayload

      // Validate payment requirements
      const isValid =
        to === requirements.payTo &&
        amount >= requirements.maxAmountRequired

      if (!isValid) {
        return reply.code(400).send({
          success: false,
          isValid: false,
          error: 'Payment does not meet requirements',
        })
      }

      // Query Hedera to verify transaction exists
      let verified = false
      try {
        // In production, query Hedera mirror node or consensus node to verify transaction
        // For now, we'll accept the payload as valid if it meets requirements
        verified = true
      } catch (error) {
        fastify.log.error('Failed to verify transaction on Hedera', error)
        verified = false
      }

      return reply.code(200).send({
        success: true,
        isValid: verified,
        payer: from,
        transactionId,
      })
    } catch (error: any) {
      fastify.log.error('Payment verification error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment verification failed',
        message: error.message,
      })
    }
  })

  /**
   * POST /api/facilitator/settle
   * Settle verified X402 payment by transferring funds from facilitator to merchant
   */
  fastify.post('/settle', async (request, reply) => {
    try {
      const { paymentPayload, requirements } = request.body as {
        paymentPayload: any
        requirements: any
      }

      fastify.log.debug('Settling payment', { paymentPayload, requirements })

      // Verify payment first
      const { from, to, amount, transactionId } = paymentPayload
      const isValid =
        to === requirements.payTo &&
        amount >= requirements.maxAmountRequired

      if (!isValid) {
        return reply.code(400).send({
          success: false,
          error: 'Payment verification failed',
        })
      }

      // Create settlement transaction from facilitator to merchant (judge)
      const settlementTx = new TransferTransaction()
        .addHbarTransfer(facilitatorAccountId, new Hbar(-amount / 100000000)) // Convert tinybar to HBAR
        .addHbarTransfer(AccountId.fromString(to), new Hbar(amount / 100000000))

      const response = await settlementTx.execute(client)
      const receipt = await response.getReceipt(client)

      const settlementTxId = response.transactionId.toString()

      fastify.log.info('Payment settled', {
        from: facilitatorAccountId.toString(),
        to,
        amount,
        settlementTxId,
      })

      return reply.code(200).send({
        success: true,
        transactionId: settlementTxId,
        status: receipt.status.toString(),
      })
    } catch (error: any) {
      fastify.log.error('Payment settlement error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment settlement failed',
        message: error.message,
      })
    }
  })

  /**
   * POST /api/facilitator/complete
   * Complete payment workflow (verify + settle in one call)
   */
  fastify.post('/complete', async (request, reply) => {
    try {
      const { paymentPayload, requirements } = request.body as {
        paymentPayload: any
        requirements: any
      }

      fastify.log.debug('Completing payment workflow', { paymentPayload, requirements })

      // Step 1: Verify
      const { from, to, amount, transactionId } = paymentPayload
      const isValid =
        to === requirements.payTo &&
        amount >= requirements.maxAmountRequired

      if (!isValid) {
        return reply.code(400).send({
          success: false,
          error: 'Payment verification failed',
        })
      }

      // Step 2: Settle
      const settlementTx = new TransferTransaction()
        .addHbarTransfer(facilitatorAccountId, new Hbar(-amount / 100000000))
        .addHbarTransfer(AccountId.fromString(to), new Hbar(amount / 100000000))

      const response = await settlementTx.execute(client)
      const receipt = await response.getReceipt(client)

      const settlementTxId = response.transactionId.toString()

      fastify.log.info('Payment workflow completed', {
        verifiedTxId: transactionId,
        settlementTxId,
        payer: from,
        merchant: to,
        amount,
      })

      return reply.code(200).send({
        success: true,
        verified: true,
        settled: true,
        transactionId: settlementTxId,
        status: receipt.status.toString(),
      })
    } catch (error: any) {
      fastify.log.error('Complete payment workflow error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment workflow failed',
        message: error.message,
      })
    }
  })

  /**
   * GET /api/facilitator/info
   * Get facilitator service information
   */
  fastify.get('/info', async (request, reply) => {
    return reply.code(200).send({
      success: true,
      facilitator: {
        accountId: facilitatorAccountId.toString(),
        evmAddress: process.env.FACILITATOR_EVM_ADDRESS,
        network: config.hedera.network,
        version: '1.0.0',
      },
    })
  })
}

export default facilitatorRoutes
