import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { FastifyPluginAsync } from 'fastify'
import { config } from '../config'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
}

export default fp(corsPlugin, {
  name: 'cors',
})
