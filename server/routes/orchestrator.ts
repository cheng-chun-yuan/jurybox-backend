import { FastifyPluginAsync } from 'fastify'
import { getOrchestrator, type OrchestratorConfig } from '../../lib/hedera/multi-agent-orchestrator'
import type { Agent } from '../../types/agent'

const orchestratorRoutes: FastifyPluginAsync = async (fastify) => {
  // Schema definitions for validation
  const createOrchestratorSchema = {
    body: {
      type: 'object',
      required: ['agents', 'systemName', 'criteria', 'budget', 'ownerAddress'],
      properties: {
        agents: {
          type: 'array',
          items: { type: 'object' },
          minItems: 1,
        },
        systemName: { type: 'string' },
        criteria: { type: 'string' },
        budget: { type: 'number', minimum: 0.01 },
        ownerAddress: { type: 'string' },
      },
    },
  }

  /**
   * Create orchestrator system
   * POST /api/orchestrator/create
   */
  fastify.post(
    '/create',
    { schema: createOrchestratorSchema },
    async (request, reply) => {
      try {
        const { agents, systemName, criteria, budget, ownerAddress } = request.body as any

        if (!agents || agents.length === 0) {
          return reply.code(400).send({
            error: 'No agents provided',
          })
        }

        // Create orchestrator configuration
        const config: OrchestratorConfig = {
          maxDiscussionRounds: 3,
          roundTimeout: 60000, // 60 seconds
          consensusAlgorithm: 'weighted_average',
          enableDiscussion: agents.length > 1,
          convergenceThreshold: 0.5,
          outlierDetection: true,
        }

        // Get orchestrator instance
        const orchestrator = getOrchestrator()

        // Create orchestrator system ID
        const systemId = `system-${Date.now()}-${Math.random().toString(36).substring(7)}`

        // Calculate total cost
        const totalCost = agents.reduce((sum: number, agent: any) =>
          sum + (agent.paymentConfig?.pricePerJudgment || 0), 0
        )

        // Verify budget is sufficient
        if (budget < totalCost) {
          return reply.code(400).send({
            error: 'Insufficient budget',
            required: totalCost,
            provided: budget,
          })
        }

        // Return orchestrator system details
        // In production, this would:
        // 1. Create HCS topic for communication
        // 2. Fund the orchestrator with budget
        // 3. Set ownership to ownerAddress
        // 4. Store system configuration in database/IPFS

        return reply.code(200).send({
          success: true,
          system: {
            id: systemId,
            name: systemName,
            criteria,
            agents: agents.map((a: any) => ({
              id: a.id,
              name: a.name,
              price: a.paymentConfig?.pricePerJudgment || 0,
            })),
            config,
            budget: {
              total: budget,
              costPerEvaluation: totalCost,
              remainingEvaluations: Math.floor(budget / totalCost),
            },
            owner: ownerAddress,
            createdAt: Date.now(),
            status: 'active',
          },
          message: 'Orchestrator system created successfully',
        })
      } catch (error: any) {
        fastify.log.error('Error creating orchestrator:', error)
        return reply.code(500).send({
          error: 'Failed to create orchestrator system',
          message: error.message,
        })
      }
    }
  )

  /**
   * Test orchestrator endpoint
   * GET /api/orchestrator/test
   */
  fastify.get('/test', async (request, reply) => {
    return reply.code(200).send({
      success: true,
      message: 'Orchestrator service is running',
      timestamp: Date.now(),
    })
  })
}

export default orchestratorRoutes
