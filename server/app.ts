import Fastify, { FastifyInstance } from 'fastify'
import { config } from './config'
import { connectDatabase, disconnectDatabase } from '../lib/database.js'

// Plugins
import corsPlugin from './plugins/cors'
import helmetPlugin from './plugins/helmet'
import multipartPlugin from './plugins/multipart'

// Routes
import agentsRoutes from './routes/agents'
import judgesRoutes from './routes/judges'
import orchestratorRoutes from './routes/orchestrator'
import uploadRoutes from './routes/upload'
import paymentRoutes from './routes/payments'
import tasksRoutes from './routes/tasks'
import auditRoutes from './routes/audit'

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: config.logging.prettyPrint
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
          level: config.logging.level,
        }
      : {
          level: config.logging.level,
        },
  })

  // Connect to database
  try {
    await connectDatabase()
  } catch (error) {
    fastify.log.error('Failed to connect to database:', error)
    throw error
  }

  // Register plugins
  await fastify.register(corsPlugin)
  await fastify.register(helmetPlugin)
  await fastify.register(multipartPlugin)

  // Health check
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: Date.now(),
      database: 'connected',
      hedera: config.hedera.network,
    }
  })

  // Register routes
  await fastify.register(agentsRoutes, { prefix: '/api/agents' })
  await fastify.register(judgesRoutes, { prefix: '/api/judges' })
  await fastify.register(orchestratorRoutes, { prefix: '/api/orchestrator' })
  await fastify.register(uploadRoutes, { prefix: '/api/upload' })
  await fastify.register(paymentRoutes, { prefix: '/api/payments' })
  await fastify.register(tasksRoutes, { prefix: '/api/tasks' })
  await fastify.register(auditRoutes, { prefix: '/api/audit' })

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await disconnectDatabase()
  })

  return fastify
}
