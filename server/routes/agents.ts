import { FastifyPluginAsync } from 'fastify'
import { getViemRegistryService } from '../../lib/erc8004/viem-registry-service'
import { getHederaService } from '../../lib/hedera/agent-service'
import { getAgentEndpointService, type AgentChatRequest } from '../../lib/agents/agent-endpoint-service'
import { getDatabase } from '../../lib/database'
import type { AgentMetadata } from '../../lib/ipfs/pinata-service'
import { CONTRACT_ADDRESSES } from '../../lib/erc8004/contract-addresses'
import type { PaymentPayload } from 'a2a-x402'

const agentsRoutes: FastifyPluginAsync = async (fastify) => {
  // Schema definitions for validation
  const registerAgentSchema = {
    body: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        image: { type: 'string' },
        specialties: { type: 'array', items: { type: 'string' } },
        hederaAccount: { type: 'string' },
        modelProvider: { type: 'string' },
        modelName: { type: 'string' },
        systemPrompt: { type: 'string' },
        temperature: { type: 'number' },
        pricePerJudgment: { type: 'number' },
      },
    },
  }

  const getAgentSchema = {
    querystring: {
      type: 'object',
      required: ['agentId'],
      properties: {
        agentId: { type: 'string' },
      },
    },
  }

  /**
   * ERC-8004 compliant agent registration endpoint
   * POST /api/agents/register
   */
  fastify.post(
    '/register',
    { schema: registerAgentSchema },
    async (request, reply) => {
      try {
        const body = request.body as any

        // Step 1: Create Hedera account for the agent (optional)
        let hederaAccountId = body.hederaAccount
        if (!hederaAccountId) {
          const hederaService = getHederaService()
          const accountInfo = await hederaService.createAgentAccount(10) // 10 HBAR initial balance
          hederaAccountId = accountInfo.accountId
        }

        // Step 2: Prepare ERC-8004 compliant metadata
        const metadata: AgentMetadata = {
          // Core ERC-8004 fields
          type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
          name: body.name,
          description: body.description,
          image: body.image,
          // ERC-8004 endpoints - A2A for agent-to-agent interaction
          endpoints: [
            {
              name: 'A2A',
              endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/.well-known/agent-card.json`,
              version: '0.3.0',
            },
            {
              name: 'agentWallet',
              endpoint: `eip155:296:${hederaAccountId}`,
            },
          ],
          registrations: [
            {
              agentId: Number(result.agentId),
              agentRegistry: `eip155:296:${CONTRACT_ADDRESSES.IdentityRegistry}`
            },
          ],
          // Trust mechanisms (for JuryBox)
          supportedTrust: ['crypto-economic'],
        }

        // Step 3: Register agent on-chain via ERC-8004 Identity Registry
        const registryService = getViemRegistryService()
        const result = await registryService.registerAgent(metadata)

        // Step 4: Update registrations field with on-chain ID
        metadata.registrations = [
          {
            agentId: Number(result.agentId),
            agentRegistry: `eip155:296:${process.env.HEDERA_NETWORK || 'testnet'}`, // Hedera chainId 296
          },
        ]

        // Return ERC-8004 compliant response
        return reply.code(200).send({
          success: true,
          agent: {
            ...metadata,
            agentId: result.agentId.toString(),
            ipfsUri: result.ipfsUri,
            txHash: result.txHash,
            owner: result.owner,
            modelProvider: body.modelProvider,
            modelName: body.modelName,
            systemPrompt: body.systemPrompt,
            temperature: body.temperature,
            pricePerJudgment: body.pricePerJudgment,
          },
        })
      } catch (error: any) {
        fastify.log.error('Agent registration error:', error)
        return reply.code(500).send({
          error: 'Failed to register agent',
          message: error.message,
        })
      }
    }
  )

  /**
   * Get agent by ID
   * GET /api/agents/register?agentId=123
   */
  fastify.get('/register', { schema: getAgentSchema }, async (request, reply) => {
    try {
      const { agentId } = request.query as { agentId: string }

      const registryService = getViemRegistryService()
      const metadata = await registryService.getAgentMetadata(BigInt(agentId))

      return reply.code(200).send({
        success: true,
        agent: metadata,
      })
    } catch (error: any) {
      fastify.log.error('Get agent error:', error)
      return reply.code(500).send({
        error: 'Failed to get agent',
        message: error.message,
      })
    }
  })

  /**
   * Agent chat endpoint with X402 payment support
   * POST /api/agents/:agentId/chat
   *
   * Returns 402 if no payment provided
   * Returns evaluation result if valid payment received
   */
  fastify.post<{
    Params: { agentId: string }
    Body: AgentChatRequest
  }>('/:agentId/chat', async (request, reply) => {
    try {
      const { agentId } = request.params
      const chatRequest = request.body

      // Get agent from database
      const db = getDatabase()
      const dbAgent = await db.agent.findUnique({
        where: { id: parseInt(agentId) }
      })

      if (!dbAgent) {
        return reply.status(404).send({
          error: 'Agent not found',
          message: `Agent with ID ${agentId} does not exist`
        })
      }

      // Map database agent to Agent type
      const agent = {
        id: dbAgent.id.toString(),
        name: dbAgent.name,
        title: dbAgent.name,
        tagline: dbAgent.bio || '',
        bio: dbAgent.bio || '',
        avatar: dbAgent.avatar || '',
        color: (dbAgent.color || 'purple') as 'purple' | 'cyan' | 'gold',
        hederaAccount: {
          accountId: dbAgent.accountId,
          publicKey: '',
          balance: 0
        },
        paymentConfig: {
          enabled: true,
          acceptedTokens: ['HBAR'],
          pricePerJudgment: dbAgent.fee,
          paymentAddress: dbAgent.payToAddress || '0x3acfa47617c313Fae5F27D7e7128578fCEf5ED94',
          minimumPayment: dbAgent.fee
        },
        identity: {
          registryId: '',
          agentId: dbAgent.id.toString(),
          verified: false,
          registeredAt: dbAgent.createdAt.getTime()
        },
        reputation: {
          totalReviews: 0,
          averageRating: dbAgent.reputation,
          completedJudgments: 0,
          successRate: 1.0,
          lastUpdated: Date.now()
        },
        capabilities: {
          specialties: JSON.parse(dbAgent.specialties || '[]'),
          languages: ['en'],
          modelProvider: 'openai' as const,
          modelName: 'gpt-4',
          systemPrompt: dbAgent.bio || '',
          temperature: 0.7,
          maxTokens: 2000
        },
        createdBy: '',
        createdAt: dbAgent.createdAt.getTime(),
        updatedAt: dbAgent.updatedAt.getTime(),
        isActive: true,
        trending: dbAgent.trending || false
      }

      // Check for payment payload in header
      const paymentPayloadHeader = request.headers['x-payment-payload']
      let paymentPayload: PaymentPayload | undefined

      if (paymentPayloadHeader) {
        try {
          paymentPayload = typeof paymentPayloadHeader === 'string'
            ? JSON.parse(paymentPayloadHeader)
            : paymentPayloadHeader
          console.log('📦 Received payment payload from header')
        } catch (error) {
          return reply.status(400).send({
            error: 'Invalid payment payload',
            message: 'Failed to parse X-Payment-Payload header'
          })
        }
      }

      // Validate request
      const agentEndpointService = getAgentEndpointService()
      const validation = agentEndpointService.validateRequest(chatRequest)
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid request',
          message: validation.error
        })
      }

      // Handle chat request with X402 payment
      const result = await agentEndpointService.handleChatRequest(
        agent,
        chatRequest,
        paymentPayload
      )

      // Check if result is payment required error
      if ('paymentRequired' in result) {
        return reply.status(402).send(result)
      }

      // Return successful evaluation
      return reply.status(200).send(result)

    } catch (error: any) {
      fastify.log.error('Agent chat error:', error)
      return reply.status(500).send({
        error: 'Agent chat failed',
        message: error.message
      })
    }
  })
}

export default agentsRoutes
