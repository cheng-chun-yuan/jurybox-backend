import { config as loadEnv } from 'dotenv'

loadEnv()

export const config = {
  server: {
    host: process.env.FASTIFY_HOST || '0.0.0.0',
    port: parseInt(process.env.FASTIFY_PORT || '10000', 10),
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
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  hedera: {
    network: process.env.HEDERA_NETWORK || 'testnet',
    accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.1234',
    privateKey: process.env.HEDERA_PRIVATE_KEY || '',
  },
  x402: {
    debug: process.env.X402_DEBUG === 'true',
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    facilitatorApiKey: process.env.X402_FACILITATOR_API_KEY,
  },
} as const
