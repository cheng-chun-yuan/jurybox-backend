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
      avatar: judge.avatar,
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
   * Create a new judge with IPFS upload and database storage
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
        modelProvider,
        modelName,
        systemPrompt,
        temperature,
        price,
        walletAddress,
        hederaAccount,
        capabilities,
        version = '1.0.0'
      } = request.body as {
        name: string
        title?: string
        tagline?: string[]
        description?: string
        avatar?: string
        themeColor?: string
        specialties?: string[]
        modelProvider?: string
        modelName?: string
        systemPrompt?: string
        temperature?: number
        price?: number
        walletAddress?: string
        hederaAccount?: string
        capabilities?: string[]
        version?: string
      }

      // Validate required fields
      if (!name) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required field',
          message: 'Name is required',
        })
      }

      // Import IPFS service
      const { getPinataService } = await import('../../lib/ipfs/pinata-service.js')
      const pinataService = getPinataService()

      // Create agent metadata for IPFS
      const agentMetadata = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name,
        title: title || '',
        description: description || '',
        image: avatar || '',
        capabilities: capabilities || [],
        hederaAccount: hederaAccount || '',
        createdAt: Date.now(),
        version,
        endpoints: [
          {
            name: 'A2A',
            endpoint: `${process.env.BACKEND_URL || 'http://localhost:10000'}/.well-known/agent-card.json`,
            version: '0.3.0'
          },
          {
            name: 'agentWallet',
            endpoint: `eip155:296:${hederaAccount || ''}`
          }
        ],
        registrations: [],
        supportedTrust: ['reputation', 'crypto-economic']
      }

      // Upload to IPFS
      let ipfsUri: string
      try {
        ipfsUri = await pinataService.uploadAgentMetadata(agentMetadata)
        fastify.log.info(`Agent metadata uploaded to IPFS: ${ipfsUri}`)
      } catch (ipfsError) {
        fastify.log.error('IPFS upload failed:', ipfsError)
        return reply.code(500).send({
          success: false,
          error: 'IPFS upload failed',
          message: 'Failed to upload agent metadata to IPFS',
        })
      }

      // Extract IPFS hash for database storage
      const ipfsHash = ipfsUri.replace('ipfs://', '')

      // Create judge in database
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
        },
      })

      // Generate payment page URL
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000'
      const paymentPageUrl = `${backendUrl}/api/pay/judge/${judge.id}`

      // Update judge with payment URL and wallet address
      await prisma.judge.update({
        where: { id: judge.id },
        data: {
          // Add wallet address to bio or create a separate field if needed
          bio: `${description || ''}\n\nWallet: ${walletAddress || ''}`,
        },
      })

      // Log the creation event
      fastify.log.info(`Judge created successfully: ${judge.id}`)

      return reply.code(201).send({
        success: true,
        data: {
          judgeId: judge.id,
          ipfsUri,
          ipfsHash,
          paymentPageUrl,
          registryTxHash: null, // TODO: Add Hedera transaction hash if needed
        },
        message: 'Judge created successfully',
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

