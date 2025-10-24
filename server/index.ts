import { buildApp } from './app'
import { config } from './config'

async function start() {
  try {
    const app = await buildApp()

    await app.listen({
      host: config.server.host,
      port: config.server.port,
    })

    console.log(`🚀 Fastify server running at http://${config.server.host}:${config.server.port}`)
  } catch (err) {
    console.error('Error starting server:', err)
    process.exit(1)
  }
}

start()
