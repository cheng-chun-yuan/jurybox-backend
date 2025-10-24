import Fastify, { FastifyInstance } from 'fastify'
import { config } from './config'

// Plugins
import corsPlugin from './plugins/cors'
import helmetPlugin from './plugins/helmet'
import multipartPlugin from './plugins/multipart'

// Routes
import agentsRoutes from './routes/agents'
import orchestratorRoutes from './routes/orchestrator'
import uploadRoutes from './routes/upload'
import paymentRoutes from './routes/payments'

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

  // Register plugins
  await fastify.register(corsPlugin)
  await fastify.register(helmetPlugin)
  await fastify.register(multipartPlugin)

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() }
  })

  // Register routes
  await fastify.register(agentsRoutes, { prefix: '/api/agents' })
  await fastify.register(orchestratorRoutes, { prefix: '/api/orchestrator' })
  await fastify.register(uploadRoutes, { prefix: '/api/upload' })
  await fastify.register(paymentRoutes, { prefix: '/api/payments' })

  return fastify
}
