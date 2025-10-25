/**
 * Tasks Routes
 * Handle task creation, status, and finalization
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getOrchestratorService } from '../../lib/hedera/orchestrator-service.js'
import { dbService } from '../../lib/database.js'

// Validation schemas
const createTaskSchema = {
  type: 'object',
  properties: {
    content: { type: 'string', minLength: 1 },
    judges: { 
      type: 'array', 
      items: { type: 'number' },
      minItems: 1
    },
    maxRounds: { type: 'number', minimum: 1, maximum: 10, default: 3 }
  },
  required: ['content', 'judges']
}

const submitScoreSchema = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    judgeId: { type: 'number' },
    round: { type: 'number' },
    score: { type: 'number', minimum: 0, maximum: 10 },
    reasoning: { type: 'string', minLength: 1 }
  },
  required: ['taskId', 'judgeId', 'round', 'score', 'reasoning']
}

export default async function tasksRoutes(fastify: FastifyInstance) {
  // Create new evaluation task
  fastify.post('/create', {
    schema: {
      body: createTaskSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            taskId: { type: 'string' },
            topicId: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { content: string; judges: number[]; maxRounds?: number } }>, reply: FastifyReply) => {
    try {
      const { content, judges, maxRounds } = request.body
      
      // Generate unique task ID
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      
      // Start the task using orchestrator
      const orchestrator = getOrchestratorService()
      const topicId = await orchestrator.startTask(taskId, content, judges, maxRounds)
      
      return {
        success: true,
        taskId,
        topicId,
        message: 'Task created successfully',
      }
    } catch (error) {
      fastify.log.error('Failed to create task:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      })
    }
  })

  // Get task status and progress
  fastify.get('/:taskId/status', {
    schema: {
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            task: { type: 'object' },
            progress: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    try {
      const { taskId } = request.params
      
      const orchestrator = getOrchestratorService()
      const taskStatus = await orchestrator.getTaskStatus(taskId)
      
      return {
        success: true,
        ...taskStatus,
      }
    } catch (error) {
      fastify.log.error(`Failed to get task status for ${request.params.taskId}:`, error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task status',
      })
    }
  })

  // Submit score for a task
  fastify.post('/submit-score', {
    schema: {
      body: submitScoreSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { taskId: string; judgeId: number; round: number; score: number; reasoning: string } }>, reply: FastifyReply) => {
    try {
      const { taskId, judgeId, round, score, reasoning } = request.body
      
      // Submit score to database
      await dbService.submitScore({
        taskId,
        judgeId,
        round,
        score,
        reasoning,
      })
      
      // Submit score to HCS
      const orchestrator = getOrchestratorService()
      const taskData = await dbService.getTaskById(taskId)
      if (taskData) {
        const hcsService = (await import('../../lib/hedera/hcs-service.js')).getHCSService()
        await hcsService.submitScore(taskId, taskData.topicId, judgeId.toString(), round, score, reasoning)
      }
      
      // Check if we should process scores for this round
      const scores = await dbService.getScoresForTask(taskId, round)
      
      // If we have enough scores, process consensus
      if (scores.length >= (taskData?.maxRounds || 3)) {
        await orchestrator.processScores(taskId, round)
      }
      
      return {
        success: true,
        message: 'Score submitted successfully',
      }
    } catch (error) {
      fastify.log.error('Failed to submit score:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit score',
      })
    }
  })

  // Finalize task (force completion)
  fastify.post('/:taskId/finalize', {
    schema: {
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    try {
      const { taskId } = request.params
      
      const orchestrator = getOrchestratorService()
      const task = await dbService.getTaskById(taskId)
      
      if (!task) {
        return reply.status(404).send({
          success: false,
          error: 'Task not found',
        })
      }
      
      if (task.status === 'completed') {
        return reply.status(400).send({
          success: false,
          error: 'Task already completed',
        })
      }
      
      // Get current round scores and calculate final consensus
      const scores = await dbService.getScoresForTask(taskId, task.currentRound)
      if (scores.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No scores available to finalize',
        })
      }
      
      // Calculate final score
      const finalScore = scores.reduce((sum, score) => sum + score.score, 0) / scores.length
      
      // Finalize the task
      await orchestrator.finalizeTask(taskId, finalScore, {
        consensus: true,
        finalScore,
        confidence: 1.0,
        round: task.currentRound,
        scores: scores.map(s => ({
          judgeId: s.judgeId,
          score: s.score,
          reasoning: s.reasoning || '',
          weight: 1.0,
        })),
        metaScores: {
          average: finalScore,
          median: finalScore,
          standardDeviation: 0,
          agreement: 1.0,
        },
      })
      
      return {
        success: true,
        message: 'Task finalized successfully',
      }
    } catch (error) {
      fastify.log.error(`Failed to finalize task ${request.params.taskId}:`, error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize task',
      })
    }
  })

  // Get all tasks
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          limit: { type: 'number' },
          offset: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tasks: { type: 'array' },
            total: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { status?: string; limit?: number; offset?: number } }>, reply: FastifyReply) => {
    try {
      const { status, limit = 10, offset = 0 } = request.query
      
      // This would require implementing a more complex query in the database service
      // For now, we'll return a simple response
      const tasks = await dbService.getTaskById('') // This would need to be implemented
      
      return {
        success: true,
        tasks: [],
        total: 0,
      }
    } catch (error) {
      fastify.log.error('Failed to get tasks:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tasks',
      })
    }
  })
}
