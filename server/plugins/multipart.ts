import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { FastifyPluginAsync } from 'fastify'
import { config } from '../config'

const multipartPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize: config.upload.maxFileSize,
    },
  })
}

export default fp(multipartPlugin, {
  name: 'multipart',
})
