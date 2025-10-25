/**
 * Orchestrator API Routes
 * Handles multi-agent evaluation requests and provides real-time progress updates
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getOrchestrator } from '../../lib/hedera/multi-agent-orchestrator'
import { getAAWalletService } from '../../lib/hedera/aa-wallet-service'
import { getOrchestratorService } from '../../lib/hedera/orchestrator-service'
import { getDatabase } from '../../lib/database'
import type {
  JudgmentRequest,
  OrchestratorConfig,
  OrchestratorOutput,
  EvaluationProgress
} from '../../types/agent'

// In-memory storage for active evaluations (in production, use Redis or database)
const activeEvaluations = new Map<string, {
  progress: EvaluationProgress
  output?: OrchestratorOutput
  startTime: number
}>()

interface EvaluationRequest {
  request: JudgmentRequest
  config: OrchestratorConfig
}

interface EvaluationResponse {
  evaluationId: string
  status: 'started' | 'completed' | 'failed'
  topicId?: string
  message: string
}

interface ProgressResponse {
  evaluationId: string
  progress: EvaluationProgress
  isComplete: boolean
  result?: OrchestratorOutput
}

export default async function orchestratorRoutes(fastify: FastifyInstance) {
  const orchestrator = getOrchestrator()

  /**
   * POST /orchestrator/evaluate
   * Start a new multi-agent evaluation
   */
  fastify.post<{
    Body: EvaluationRequest
    Reply: EvaluationResponse
  }>('/evaluate', async (request: FastifyRequest<{ Body: EvaluationRequest }>, reply: FastifyReply) => {
    try {
      const { request: judgmentRequest, config } = request.body

      // Validate request
      if (!judgmentRequest.id || !judgmentRequest.content || !judgmentRequest.selectedAgents?.length) {
        return reply.status(400).send({
          evaluationId: '',
          status: 'failed',
          message: 'Invalid request: missing required fields (id, content, selectedAgents)'
        })
      }

      // Validate config
      if (!config.maxDiscussionRounds || !config.consensusAlgorithm) {
        return reply.status(400).send({
          evaluationId: '',
          status: 'failed',
          message: 'Invalid config: missing required fields (maxDiscussionRounds, consensusAlgorithm)'
        })
      }

      // Set default config values
      const finalConfig: OrchestratorConfig = {
        maxDiscussionRounds: config.maxDiscussionRounds,
        roundTimeout: config.roundTimeout || 60000,
        consensusAlgorithm: config.consensusAlgorithm,
        enableDiscussion: config.enableDiscussion ?? true,
        convergenceThreshold: config.convergenceThreshold || 0.5,
        outlierDetection: config.outlierDetection ?? true
      }

      // Initialize progress tracking
      const progress: EvaluationProgress = {
        status: 'initializing',
        currentRound: 0,
        totalRounds: finalConfig.maxDiscussionRounds,
        scoresReceived: 0,
        totalAgents: judgmentRequest.selectedAgents.length,
        topicId: undefined,
        currentScores: undefined,
        variance: undefined
      }

      activeEvaluations.set(judgmentRequest.id, {
        progress,
        startTime: Date.now()
      })

      // Start evaluation asynchronously
      orchestrator.executeEvaluation(judgmentRequest, finalConfig)
        .then((result) => {
          const evaluation = activeEvaluations.get(judgmentRequest.id)
          if (evaluation) {
            evaluation.output = result
            evaluation.progress = result.progress
            activeEvaluations.set(judgmentRequest.id, evaluation)
          }
        })
        .catch((error) => {
          console.error('Evaluation failed:', error)
          const evaluation = activeEvaluations.get(judgmentRequest.id)
          if (evaluation) {
            evaluation.progress.status = 'failed'
            activeEvaluations.set(judgmentRequest.id, evaluation)
          }
        })

      return reply.status(202).send({
        evaluationId: judgmentRequest.id,
        status: 'started',
        topicId: undefined, // Will be set when evaluation starts
        message: 'Evaluation started successfully'
      })

    } catch (error) {
      console.error('Error starting evaluation:', error)
      return reply.status(500).send({
        evaluationId: '',
        status: 'failed',
        message: 'Internal server error'
      })
    }
  })

  /**
   * GET /orchestrator/progress/:evaluationId
   * Get real-time progress of an evaluation
   */
  fastify.get<{
    Params: { evaluationId: string }
    Reply: ProgressResponse
  }>('/progress/:evaluationId', async (request: FastifyRequest<{ Params: { evaluationId: string } }>, reply: FastifyReply) => {
    try {
      const { evaluationId } = request.params
      const evaluation = activeEvaluations.get(evaluationId)

      if (!evaluation) {
        return reply.status(404).send({
          evaluationId,
          progress: {
            status: 'failed',
            currentRound: 0,
            totalRounds: 0,
            scoresReceived: 0,
            totalAgents: 0
          },
          isComplete: false,
          message: 'Evaluation not found'
        })
      }

      const isComplete = evaluation.output !== undefined || evaluation.progress.status === 'failed'

      return reply.send({
        evaluationId,
        progress: evaluation.progress,
        isComplete,
        result: evaluation.output
      })

    } catch (error) {
      console.error('Error getting progress:', error)
      return reply.status(500).send({
        evaluationId: request.params.evaluationId,
        progress: {
          status: 'failed',
          currentRound: 0,
          totalRounds: 0,
          scoresReceived: 0,
          totalAgents: 0
        },
        isComplete: false
      })
    }
  })

  /**
   * GET /orchestrator/result/:evaluationId
   * Get final evaluation result
   */
  fastify.get<{
    Params: { evaluationId: string }
    Reply: OrchestratorOutput | { error: string }
  }>('/result/:evaluationId', async (request: FastifyRequest<{ Params: { evaluationId: string } }>, reply: FastifyReply) => {
    try {
      const { evaluationId } = request.params
      const evaluation = activeEvaluations.get(evaluationId)

      if (!evaluation) {
        return reply.status(404).send({
          error: 'Evaluation not found'
        })
      }

      if (!evaluation.output) {
        return reply.status(202).send({
          error: 'Evaluation not yet complete'
        })
      }

      return reply.send(evaluation.output)

    } catch (error) {
      console.error('Error getting result:', error)
      return reply.status(500).send({
        error: 'Internal server error'
      })
    }
  })

  /**
   * GET /orchestrator/transcript/:evaluationId
   * Get full conversation transcript for transparency
   */
  fastify.get<{
    Params: { evaluationId: string }
    Reply: any
  }>('/transcript/:evaluationId', async (request: FastifyRequest<{ Params: { evaluationId: string } }>, reply: FastifyReply) => {
    try {
      const { evaluationId } = request.params
      const evaluation = activeEvaluations.get(evaluationId)

      if (!evaluation) {
        return reply.status(404).send({
          error: 'Evaluation not found'
        })
      }

      if (!evaluation.output) {
        return reply.status(202).send({
          error: 'Evaluation not yet complete'
        })
      }

      return reply.send(evaluation.output.transcript)

    } catch (error) {
      console.error('Error getting transcript:', error)
      return reply.status(500).send({
        error: 'Internal server error'
      })
    }
  })

  /**
   * GET /orchestrator/active
   * Get list of active evaluations
   */
  fastify.get('/active', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const active = Array.from(activeEvaluations.entries()).map(([id, evaluation]) => ({
        evaluationId: id,
        status: evaluation.progress.status,
        startTime: evaluation.startTime,
        currentRound: evaluation.progress.currentRound,
        totalRounds: evaluation.progress.totalRounds,
        topicId: evaluation.progress.topicId,
        isComplete: evaluation.output !== undefined
      }))

      return reply.send({ active })

    } catch (error) {
      console.error('Error getting active evaluations:', error)
      return reply.status(500).send({
        error: 'Internal server error'
      })
    }
  })

  /**
   * DELETE /orchestrator/:evaluationId
   * Cancel/cleanup an evaluation
   */
  fastify.delete<{
    Params: { evaluationId: string }
  }>('/:evaluationId', async (request: FastifyRequest<{ Params: { evaluationId: string } }>, reply: FastifyReply) => {
    try {
      const { evaluationId } = request.params
      const deleted = activeEvaluations.delete(evaluationId)

      if (!deleted) {
        return reply.status(404).send({
          error: 'Evaluation not found'
        })
      }

      return reply.send({
        message: 'Evaluation cancelled successfully'
      })

    } catch (error) {
      console.error('Error cancelling evaluation:', error)
      return reply.status(500).send({
        error: 'Internal server error'
      })
    }
  })

  /**
   * POST /orchestrator/register
   * Create an AA wallet for orchestrator registration
   * User provides only their wallet address (no private key required)
   */
  fastify.post<{
    Body: {
      userAddress: string
      fundingAmount?: number
      name?: string
    }
  }>('/register', async (request: FastifyRequest<{ Body: { userAddress: string; fundingAmount?: number; name?: string } }>, reply: FastifyReply) => {
    try {
      const { userAddress, fundingAmount = 10, name = 'Orchestrator AA Wallet' } = request.body

      // Validate input
      if (!userAddress) {
        return reply.status(400).send({
          error: 'User address is required'
        })
      }

      const aaWalletService = getAAWalletService()
      const walletInfo = await aaWalletService.createAAWallet(userAddress, fundingAmount, name)
      const aaWallet = aaWalletService.toAAWalletResponse(walletInfo)

      return reply.send({
        success: true,
        message: 'AA wallet created successfully',
        aaWallet,
        details: {
          aaWalletId: walletInfo.aaWalletId,
          userAddress: walletInfo.userAddress,
          publicKey: walletInfo.publicKey,
          fundedBalance: walletInfo.fundedBalance,
          fundingTxId: walletInfo.fundingTxId,
          createdAt: walletInfo.createdAt,
        },
        security: {
          notes: [
            'User\'s private key was never required',
            'Only public key/address was used',
            'User maintains full control of their private key',
            'Wallet is ready for X402 payments and transactions',
          ],
        },
      })

    } catch (error: any) {
      console.error('Error creating AA wallet:', error)
      return reply.status(500).send({
        error: 'Failed to create AA wallet',
        message: error.message,
      })
    }
  })

  /**
   * GET /orchestrator/wallet/:aaWalletId
   * Get AA wallet information
   */
  fastify.get<{
    Params: { aaWalletId: string }
  }>('/wallet/:aaWalletId', async (request: FastifyRequest<{ Params: { aaWalletId: string } }>, reply: FastifyReply) => {
    try {
      const { aaWalletId } = request.params
      const aaWalletService = getAAWalletService()
      const walletInfo = await aaWalletService.getAAWalletInfo(aaWalletId)

      if (!walletInfo) {
        return reply.status(404).send({
          error: 'AA wallet not found'
        })
      }

      const aaWallet = aaWalletService.toAAWalletResponse(walletInfo)

      return reply.send({
        aaWallet,
        details: walletInfo,
      })

    } catch (error: any) {
      console.error('Error getting AA wallet info:', error)
      return reply.status(500).send({
        error: 'Failed to get AA wallet info',
        message: error.message,
      })
    }
  })

  /**
   * POST /orchestrator/create
   * Create orchestrator with AA wallet
   */
  fastify.post<{
    Body: {
      userAddress: string
      config: {
        maxDiscussionRounds: number
        roundTimeout: number
        consensusAlgorithm: string
        enableDiscussion: boolean
        convergenceThreshold: number
        outlierDetection: boolean
      }
      systemPrompt: string
      network: 'testnet' | 'mainnet'
      initialFunding?: number
    }
  }>('/create', async (request: FastifyRequest<{ 
    Body: {
      userAddress: string
      config: {
        maxDiscussionRounds: number
        roundTimeout: number
        consensusAlgorithm: string
        enableDiscussion: boolean
        convergenceThreshold: number
        outlierDetection: boolean
      }
      systemPrompt: string
      network: 'testnet' | 'mainnet'
      initialFunding?: number
    }
  }>, reply: FastifyReply) => {
    try {
      const orchestratorService = getOrchestratorService()
      const result = await orchestratorService.createOrchestrator(request.body)

      return reply.send(result)
    } catch (error: any) {
      console.error('Error creating orchestrator:', error)
      return reply.status(500).send({
        error: 'Failed to create orchestrator',
        message: error.message
      })
    }
  })

  /**
   * POST /orchestrator/fund
   * Record funding transaction
   */
  fastify.post<{
    Body: {
      orchestratorId: string
      amount: number
      userAddress: string
      transactionHash: string
    }
  }>('/fund', async (request: FastifyRequest<{ 
    Body: {
      orchestratorId: string
      amount: number
      userAddress: string
      transactionHash: string
    }
  }>, reply: FastifyReply) => {
    try {
      const orchestratorService = getOrchestratorService()
      const result = await orchestratorService.recordFunding(request.body)

      return reply.send(result)
    } catch (error: any) {
      console.error('Error recording funding:', error)
      return reply.status(500).send({
        error: 'Failed to record funding',
        message: error.message
      })
    }
  })

  /**
   * GET /orchestrator/:orchestratorId/balance
   * Get wallet balance from Hedera Mirror Node
   */
  fastify.get<{
    Params: { orchestratorId: string }
  }>('/:orchestratorId/balance', async (request: FastifyRequest<{ 
    Params: { orchestratorId: string }
  }>, reply: FastifyReply) => {
    try {
      const { orchestratorId } = request.params
      const orchestratorService = getOrchestratorService()
      const result = await orchestratorService.getWalletBalance(orchestratorId)

      return reply.send(result)
    } catch (error: any) {
      console.error('Error getting balance:', error)
      return reply.status(500).send({
        error: 'Failed to get balance',
        message: error.message
      })
    }
  })

  /**
   * GET /orchestrator/:orchestratorId
   * Get orchestrator status
   */
  fastify.get<{
    Params: { orchestratorId: string }
  }>('/:orchestratorId', async (request: FastifyRequest<{ 
    Params: { orchestratorId: string }
  }>, reply: FastifyReply) => {
    try {
      const { orchestratorId } = request.params
      const orchestratorService = getOrchestratorService()
      const result = await orchestratorService.getOrchestratorStatus(orchestratorId)

      return reply.send(result)
    } catch (error: any) {
      console.error('Error getting orchestrator status:', error)
      return reply.status(500).send({
        error: 'Failed to get orchestrator status',
        message: error.message
      })
    }
  })

  /**
   * POST /orchestrator/test
   * Test endpoint: Create multi-agent orchestrator round with HCS topic creation
   * Tests the full workflow: topic creation, agent selection, multi-round evaluation
   */
  fastify.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        agentIds,
        maxRounds = 2,
        consensusAlgorithm = 'weighted_average',
        content = "Evaluate this test content for quality and accuracy.",
        criteria = ['Accuracy', 'Clarity', 'Completeness', 'Relevance']
      } = request.body as {
        agentIds?: number[]
        maxRounds?: number
        consensusAlgorithm?: string
        content?: string
        criteria?: string[]
      }

      console.log('🧪 Starting Multi-Agent Orchestrator Test')
      console.log('========================================')
      console.log(`📝 Content: ${content}`)
      console.log(`🔢 Max Rounds: ${maxRounds}`)
      console.log(`🎲 Algorithm: ${consensusAlgorithm}`)

      // Step 1: Fetch agents from database
      console.log('\n👥 Step 1: Fetching Agents from Database')
      const db = getDatabase()

      let dbAgents
      if (agentIds && agentIds.length > 0) {
        dbAgents = await db.agent.findMany({
          where: { id: { in: agentIds } }
        })
        console.log(`✅ Found ${dbAgents.length} specified agents`)
      } else {
        // Get first 3 agents if no IDs specified
        dbAgents = await db.agent.findMany({
          take: 3
        })
        console.log(`✅ Selected ${dbAgents.length} agents`)
      }

      if (dbAgents.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No agents found. Please create agents first or specify valid agent IDs.'
        })
      }

      // Step 2: Create evaluation request
      console.log('\n📋 Step 2: Creating Evaluation Request')
      const evaluationId = `eval_test_${Date.now()}`

      const judgmentRequest: JudgmentRequest = {
        id: evaluationId,
        content,
        criteria,
        selectedAgents: dbAgents.map(agent => ({
          id: agent.id.toString(),
          name: agent.name,
          title: agent.name,
          tagline: agent.bio || '',
          bio: agent.bio || '',
          avatar: agent.avatar || '',
          color: (agent.color || 'purple') as 'purple' | 'cyan' | 'gold',
          hederaAccount: {
            accountId: agent.accountId,
            publicKey: '',
            balance: 0
          },
          paymentConfig: {
            enabled: true,
            acceptedTokens: ['HBAR'],
            pricePerJudgment: agent.fee,
            paymentAddress: agent.payToAddress,
            minimumPayment: agent.fee
          },
          identity: {
            registryId: '',
            agentId: agent.id.toString(),
            verified: false,
            registeredAt: agent.createdAt.getTime()
          },
          reputation: {
            totalReviews: 0,
            averageRating: agent.reputation,
            completedJudgments: 0,
            successRate: 1.0,
            lastUpdated: Date.now()
          },
          capabilities: {
            specialties: JSON.parse(agent.specialties || '[]'),
            languages: ['en'],
            modelProvider: 'openai' as const,
            modelName: 'gpt-4',
            systemPrompt: agent.bio || '',
            temperature: 0.7,
            maxTokens: 2000
          },
          createdBy: '',
          createdAt: agent.createdAt.getTime(),
          updatedAt: agent.updatedAt.getTime(),
          isActive: true,
          trending: agent.trending || false
        })),
        requestedBy: process.env.HEDERA_ACCOUNT_ID || '',
        createdAt: Date.now(),
        status: 'pending' as const
      }

      console.log(`✅ Evaluation ID: ${evaluationId}`)
      console.log(`   Agents: ${judgmentRequest.selectedAgents.map(a => a.name).join(', ')}`)

      // Step 3: Configure orchestrator
      console.log('\n⚙️  Step 3: Configuring Orchestrator')

      // Validate consensus algorithm
      const validAlgorithms = ['simple_average', 'weighted_average', 'median', 'trimmed_mean', 'iterative_convergence', 'delphi_method']
      const algorithm = validAlgorithms.includes(consensusAlgorithm)
        ? consensusAlgorithm as OrchestratorConfig['consensusAlgorithm']
        : 'weighted_average' as const

      const config: OrchestratorConfig = {
        maxDiscussionRounds: maxRounds,
        roundTimeout: 60000,
        consensusAlgorithm: algorithm,
        enableDiscussion: true,
        convergenceThreshold: 0.5,
        outlierDetection: true
      }

      console.log(`✅ Config: ${JSON.stringify(config, null, 2)}`)

      // Step 4: Execute multi-agent evaluation
      console.log('\n🚀 Step 4: Executing Multi-Agent Evaluation')
      console.log('   This will:')
      console.log('   1. Create HCS topic for agent communication')
      console.log('   2. Run independent scoring round')
      console.log('   3. Run discussion rounds (if enabled)')
      console.log('   4. Calculate consensus')
      console.log('   5. Publish final result to HCS')
      console.log('')

      const orchestratorInstance = getOrchestrator()
      const result = await orchestratorInstance.executeEvaluation(judgmentRequest, config)

      // Step 5: Format and return results
      console.log('\n✅ Evaluation Complete!')
      console.log(`   📡 Topic ID: ${result.topicId}`)
      console.log(`   🎯 Final Score: ${result.consensus.finalScore.toFixed(2)}/10`)
      console.log(`   📊 Confidence: ${(result.consensus.confidence * 100).toFixed(1)}%`)
      console.log(`   🔄 Rounds: ${result.progress.currentRound}`)
      console.log(`   📈 Variance: ${result.consensus.variance.toFixed(3)}`)

      return reply.send({
        success: true,
        evaluationId,
        topicId: result.topicId,
        consensus: {
          finalScore: result.consensus.finalScore,
          confidence: result.consensus.confidence,
          variance: result.consensus.variance,
          algorithm: result.consensus.algorithm,
          convergenceRounds: result.consensus.convergenceRounds
        },
        progress: result.progress,
        individualResults: result.individualResults,
        transcript: result.transcript,
        agentsSummary: judgmentRequest.selectedAgents.map(a => ({
          id: a.id,
          name: a.name,
          score: result.consensus.individualScores[a.id]
        })),
        message: 'Multi-agent orchestrator test completed successfully'
      })

    } catch (error: any) {
      console.error('❌ Multi-Agent Orchestrator Test Failed:', error)
      return reply.status(500).send({
        success: false,
        error: 'Multi-Agent Orchestrator Test Failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  })
}