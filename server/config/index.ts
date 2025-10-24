import { config as loadEnv } from 'dotenv'

loadEnv()

export const config = {
  server: {
    host: process.env.FASTIFY_HOST || '0.0.0.0',
    port: parseInt(process.env.FASTIFY_PORT || '3001', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
} as const
