/**
 * Application Configuration
 * Centralized configuration using validated environment variables
 */

import { env } from './environment.config'

export const appConfig = {
  // Server configuration
  server: {
    host: env.FASTIFY_HOST,
    port: env.FASTIFY_PORT,
    env: env.NODE_ENV,
  },

  // CORS configuration
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },

  // Logging configuration
  logging: {
    level: env.LOG_LEVEL,
    prettyPrint: env.NODE_ENV !== 'production',
  },

  // Upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  // Database configuration
  database: {
    url: env.DATABASE_URL,
  },

  // Hedera configuration
  hedera: {
    network: env.HEDERA_NETWORK,
    accountId: env.HEDERA_ACCOUNT_ID,
    privateKey: env.HEDERA_PRIVATE_KEY,
  },

  // X402 Payment configuration
  x402: {
    debug: env.X402_DEBUG || false,
    facilitatorUrl: env.X402_FACILITATOR_URL,
    facilitatorApiKey: env.X402_FACILITATOR_API_KEY,
  },

  // OpenAI configuration
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },

  // IPFS configuration
  ipfs: {
    pinataApiKey: env.PINATA_API_KEY,
    pinataSecretKey: env.PINATA_SECRET_KEY,
  },
} as const

export type AppConfig = typeof appConfig
