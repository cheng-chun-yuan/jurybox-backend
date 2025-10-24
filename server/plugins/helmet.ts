import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import { FastifyPluginAsync } from 'fastify'

const helmetPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API server
  })
}

export default fp(helmetPlugin, {
  name: 'helmet',
})
