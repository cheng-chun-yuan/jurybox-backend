import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'
import type { Judge } from '../../types/agent'

const prisma = new PrismaClient()

const judgesRoutes: FastifyPluginAsync = async (fastify) => {
  // Schema definitions for validation
  const getJudgesSchema = {
    querystring: {
      type: 'object',
      properties: {
        specialty: { type: 'string' },
        trending: { type: 'boolean' },
        search: { type: 'string' },
      },
    },
  }

  const getJudgeByIdSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
  }

  const getJudgesBatchSchema = {
    querystring: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: { type: 'string' },
      },
    },
  }

  /**
   * Helper function to transform database judge to API response format
   */
  function transformJudge(judge: any): Judge {
    return {
      id: judge.id,
      name: judge.name,
      title: judge.title,
      tagline: judge.tagline,
      rating: judge.rating,
      reviews: judge.reviews,
      price: judge.price,
      specialties: JSON.parse(judge.specialties),
      color: judge.color as 'purple' | 'cyan' | 'gold',
      avatar: judge.avatar || '',
      trending: judge.trending,
      bio: judge.bio,
      expertise: JSON.parse(judge.expertise),
      achievements: JSON.parse(judge.achievements),
      sampleReviews: JSON.parse(judge.sampleReviews),
    }
  }

  /**
   * GET /api/judges
   * Get all judges with optional filtering
   */
  fastify.get('/', { schema: getJudgesSchema }, async (request, reply) => {
    try {
      const { specialty, trending, search } = request.query as {
        specialty?: string
        trending?: boolean
        search?: string
      }

      let whereClause: any = {}

      // Filter by specialty
      if (specialty) {
        whereClause.specialties = {
          contains: specialty,
        }
      }

      // Filter by trending
      if (trending !== undefined) {
        whereClause.trending = trending
      }

      // Search by name, title, or specialties
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { specialties: { contains: search, mode: 'insensitive' } },
        ]
      }

      const judges = await prisma.judge.findMany({
        where: whereClause,
        orderBy: [
          { trending: 'desc' },
          { rating: 'desc' },
        ],
      })

      const transformedJudges = judges.map(transformJudge)

      return reply.code(200).send({
        success: true,
        data: transformedJudges,
      })
    } catch (error: any) {
      fastify.log.error('Get judges error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch judges',
        message: error.message,
      })
    }
  })

  /**
   * GET /api/judges/:id
   * Get single judge by ID
   */
  fastify.get('/:id', { schema: getJudgeByIdSchema }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const judgeId = parseInt(id, 10)

      if (isNaN(judgeId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid judge ID',
          message: 'Judge ID must be a valid number',
        })
      }

      const judge = await prisma.judge.findUnique({
        where: { id: judgeId },
      })

      if (!judge) {
        return reply.code(404).send({
          success: false,
          error: 'Judge not found',
          message: `Judge with ID ${judgeId} does not exist`,
        })
      }

      const transformedJudge = transformJudge(judge)

      return reply.code(200).send({
        success: true,
        data: transformedJudge,
      })
    } catch (error: any) {
      fastify.log.error('Get judge by ID error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch judge',
        message: error.message,
      })
    }
  })

  /**
   * GET /api/judges/batch
   * Get multiple judges by IDs (used in submit page)
   */
  fastify.get('/batch', { schema: getJudgesBatchSchema }, async (request, reply) => {
    try {
      const { ids } = request.query as { ids: string }

      if (!ids) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required parameter',
          message: 'ids parameter is required (comma-separated judge IDs)',
        })
      }

      // Parse comma-separated IDs
      const judgeIds = ids
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id))

      if (judgeIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid judge IDs',
          message: 'No valid judge IDs provided',
        })
      }

      const judges = await prisma.judge.findMany({
        where: {
          id: {
            in: judgeIds,
          },
        },
        orderBy: [
          { trending: 'desc' },
          { rating: 'desc' },
        ],
      })

      const transformedJudges = judges.map(transformJudge)

      return reply.code(200).send({
        success: true,
        data: transformedJudges,
      })
    } catch (error: any) {
      fastify.log.error('Get judges batch error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch judges',
        message: error.message,
      })
    }
  })

  /**
   * POST /api/judges
   * Create a new judge with Hedera wallet and database storage
   */
  fastify.post('/', async (request, reply) => {
    try {
      const {
        name,
        title,
        tagline,
        description,
        avatar,
        themeColor,
        specialties,
        price,
        initialBalance = 0,
      } = request.body as {
        name: string
        title?: string
        tagline?: string[]
        description?: string
        avatar?: string
        themeColor?: string
        specialties?: string[]
        price?: number
        initialBalance?: number
      }

      // Validate required fields
      if (!name) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required field',
          message: 'Name is required',
        })
      }

      // Create Hedera wallet for the judge
      const { getJudgeWalletService } = await import('../../lib/hedera/judge-wallet.service.js')
      const walletService = getJudgeWalletService()

      let walletInfo
      try {
        walletInfo = await walletService.createJudgeWallet(initialBalance)
        fastify.log.info({
          accountId: walletInfo.accountId,
          evmAddress: walletInfo.evmAddress,
        },'Judge wallet created')
      } catch (walletError: any) {
        fastify.log.error('Wallet creation failed:', walletError)
        return reply.code(500).send({
          success: false,
          error: 'Wallet creation failed',
          message: walletError.message || 'Failed to create Hedera wallet for judge',
        })
      }

      // Register judge to ERC-8004 on-chain registry
      let registryTxHash: string | null = null
      let registryAgentId: bigint | null = null

      try {
        const { getViemRegistryService } = await import('../../lib/erc8004/viem-registry-service.js')
        const { CONTRACT_ADDRESSES } = await import('../../lib/erc8004/contract-addresses.js')
        const registryService = getViemRegistryService()

        // Prepare EIP-8004 compliant metadata for IPFS
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'

        const metadata = {
          type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
          name,
          description: description || `${title || 'AI Judge'} - ${tagline?.[0] || 'Providing expert judgment services'}`,
          image: avatar || '',
          endpoints: [
            {
              name: 'A2A',
              endpoint: `${backendUrl}/api/judges/:id/interact`,
              version: '0.3.0',
            },
            {
              name: 'agentWallet',
              endpoint: `eip155:296:${walletInfo.evmAddress}`, // Hedera testnet chain ID is 296
            },
          ],
          registrations: [
            {
              agentId: 0, // Will be updated after registration
              agentRegistry: `eip155:296:${CONTRACT_ADDRESSES.IdentityRegistry}`,
            },
          ],
          supportedTrust: ['crypto-economic'],
        }

        fastify.log.info('Registering judge to ERC-8004 registry...')
        const registrationResult = await registryService.registerAgent(metadata)

        registryTxHash = registrationResult.txHash
        registryAgentId = registrationResult.agentId

        fastify.log.info({
          agentId: registryAgentId.toString(),
          txHash: registryTxHash,
          ipfsUri: registrationResult.ipfsUri,
        }, 'Judge registered to ERC-8004 registry')
      } catch (registryError: any) {
        fastify.log.warn('ERC-8004 registration failed (continuing anyway):', registryError.message)
        // Don't fail the entire judge creation if registry fails
      }

      // Create judge in database with wallet info
      const judge = await prisma.judge.create({
        data: {
          name,
          title: title || '',
          tagline: JSON.stringify(tagline || []),
          rating: 0,
          reviews: 0,
          price: price || 0.05,
          specialties: JSON.stringify(specialties || []),
          color: themeColor || 'purple',
          avatar: avatar || '',
          trending: false,
          bio: description || '',
          expertise: JSON.stringify(specialties || []),
          achievements: JSON.stringify([]),
          sampleReviews: JSON.stringify([]),
          // Wallet fields
          walletAccountId: walletInfo.accountId,
          walletEvmAddress: walletInfo.evmAddress,
          walletPublicKey: walletInfo.publicKey,
          walletPrivateKeyEnc: walletInfo.privateKeyEncrypted,
        },
      })

      // Generate payment page URL (facilitator complete endpoint)
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
      const paymentPageUrl = `${backendUrl}/api/facilitator/complete`

      // Log the creation event
      fastify.log.info(`Judge created successfully: ${judge.id}`)

      return reply.code(201).send({
        success: true,
        judgeId: judge.id,
        walletAddress: walletInfo.accountId,
        evmAddress: walletInfo.evmAddress,
        price: price || 0.05,
        paymentPageUrl,
        registryTxHash,
        registryAgentId: registryAgentId?.toString() || null,
      })
    } catch (error: any) {
      fastify.log.error('Create judge error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to create judge',
        message: error.message,
      })
    }
  })

  /**
   * PATCH /api/judges/:id
   * Update a judge
   */
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const judgeId = parseInt(id, 10)

      if (isNaN(judgeId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid judge ID',
          message: 'Judge ID must be a valid number',
        })
      }

      const updates = request.body as Partial<{
        name: string
        title: string
        tagline: string[]
        description: string
        avatar: string
        themeColor: string
        specialties: string[]
        price: number
        rating: number
        trending: boolean
      }>

      // Prepare update data
      const updateData: any = {}
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.tagline !== undefined) updateData.tagline = JSON.stringify(updates.tagline)
      if (updates.description !== undefined) updateData.bio = updates.description
      if (updates.avatar !== undefined) updateData.avatar = updates.avatar
      if (updates.themeColor !== undefined) updateData.color = updates.themeColor
      if (updates.specialties !== undefined) {
        updateData.specialties = JSON.stringify(updates.specialties)
        updateData.expertise = JSON.stringify(updates.specialties)
      }
      if (updates.price !== undefined) updateData.price = updates.price
      if (updates.rating !== undefined) updateData.rating = updates.rating
      if (updates.trending !== undefined) updateData.trending = updates.trending

      const updatedJudge = await prisma.judge.update({
        where: { id: judgeId },
        data: updateData,
      })

      if (!updatedJudge) {
        return reply.code(404).send({
          success: false,
          error: 'Judge not found',
          message: `Judge with ID ${judgeId} does not exist`,
        })
      }

      return reply.code(200).send({
        success: true,
        data: transformJudge(updatedJudge),
        message: 'Judge updated successfully',
      })
    } catch (error: any) {
      fastify.log.error('Update judge error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to update judge',
        message: error.message,
      })
    }
  })
}

export default judgesRoutes

