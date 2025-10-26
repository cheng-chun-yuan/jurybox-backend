/**
 * Feedback API Routes
 * Handles feedback submission and retrieval for judges
 */

import { FastifyPluginAsync } from 'fastify'
import { getFeedbackAuthService } from '../../lib/feedback/feedback-auth.service.js'
import { getViemRegistryService } from '../../lib/erc8004/viem-registry-service.js'

const feedbackRoutes: FastifyPluginAsync = async (fastify) => {
  const feedbackAuthService = getFeedbackAuthService()
  const registryService = getViemRegistryService()

  /**
   * POST /api/feedback/auth/generate
   * Generate FeedbackAuth signature for a client
   */
  fastify.post('/auth/generate', async (request, reply) => {
    try {
      const { agentId, clientAddress, indexLimit, expiryHours } = request.body as {
        agentId: number
        clientAddress: string
        indexLimit?: number
        expiryHours?: number
      }

      // Validate required fields
      if (!agentId || !clientAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields',
          message: 'agentId and clientAddress are required',
        })
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(clientAddress)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid address',
          message: 'clientAddress must be a valid Ethereum address',
        })
      }

      // Generate FeedbackAuth
      const feedbackAuth = await feedbackAuthService.generateFeedbackAuth({
        agentId,
        clientAddress,
        indexLimit,
        expiryHours,
      })

      return reply.code(200).send({
        success: true,
        data: {
          agentId: feedbackAuth.agentId.toString(),
          clientAddress: feedbackAuth.clientAddress,
          indexFrom: feedbackAuth.indexFrom.toString(),
          indexTo: feedbackAuth.indexTo.toString(),
          expiry: feedbackAuth.expiry.toString(),
          expiryDate: new Date(Number(feedbackAuth.expiry) * 1000).toISOString(),
          signature: feedbackAuth.signature,
          encoded: feedbackAuthService.encodeFeedbackAuth(feedbackAuth),
        },
      })
    } catch (error: any) {
      fastify.log.error('Generate FeedbackAuth error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate FeedbackAuth',
        message: error.message,
      })
    }
  })

  /**
   * GET /api/feedback/:agentId
   * Get feedback/reputation for an agent
   */
  fastify.get('/:agentId', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string }

      if (!agentId || isNaN(parseInt(agentId))) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid agentId',
          message: 'agentId must be a valid number',
        })
      }

      // Get reputation from blockchain
      fastify.log.info(`Fetching reputation for agent ${agentId}`)
      const reputation = await registryService.getAgentReputation(BigInt(agentId))

      return reply.code(200).send({
        success: true,
        data: {
          agentId,
          totalReviews: reputation.totalReviews.toString(),
          averageRating: reputation.averageRating.toString(),
          completedTasks: reputation.completedTasks.toString(),
          // Convert averageRating to percentage (assuming it's stored as 0-100)
          averageRatingPercent: Number(reputation.averageRating),
        },
      })
    } catch (error: any) {
      fastify.log.error('Get feedback error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get feedback',
        message: error.message,
      })
    }
  })

  /**
   * POST /api/feedback/verify
   * Verify a FeedbackAuth signature
   */
  fastify.post('/verify', async (request, reply) => {
    try {
      const { agentId, clientAddress, indexFrom, indexTo, expiry, signature } = request.body as {
        agentId: string
        clientAddress: string
        indexFrom: string
        indexTo: string
        expiry: string
        signature: string
      }

      // Validate required fields
      if (!agentId || !clientAddress || !indexFrom || !indexTo || !expiry || !signature) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields',
        })
      }

      // Verify FeedbackAuth
      const isValid = await feedbackAuthService.verifyFeedbackAuth({
        agentId: BigInt(agentId),
        clientAddress,
        indexFrom: BigInt(indexFrom),
        indexTo: BigInt(indexTo),
        expiry: BigInt(expiry),
        signature,
      })

      return reply.code(200).send({
        success: true,
        data: {
          isValid,
          expired: BigInt(expiry) <= BigInt(Math.floor(Date.now() / 1000)),
        },
      })
    } catch (error: any) {
      fastify.log.error('Verify FeedbackAuth error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to verify FeedbackAuth',
        message: error.message,
      })
    }
  })
}

export default feedbackRoutes
