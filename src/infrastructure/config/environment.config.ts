/**
 * Environment Configuration
 * Validates and exports environment variables with proper types
 */

import { z } from 'zod'
import { config as loadEnv } from 'dotenv'

// Load environment variables
loadEnv()

const EnvironmentSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server configuration
  FASTIFY_HOST: z.string().default('0.0.0.0'),
  FASTIFY_PORT: z.coerce.number().default(10000),

  // CORS configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Database
  DATABASE_URL: z.string().default('file:./dev.db'),

  // Hedera configuration
  HEDERA_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  HEDERA_ACCOUNT_ID: z.string(),
  HEDERA_PRIVATE_KEY: z.string(),

  // X402 Payment configuration
  X402_DEBUG: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  X402_FACILITATOR_URL: z.string().default('https://x402.org/facilitator'),
  X402_FACILITATOR_API_KEY: z.string().optional(),

  // OpenAI configuration
  OPENAI_API_KEY: z.string().optional(),

  // IPFS configuration
  PINATA_API_KEY: z.string().optional(),
  PINATA_SECRET_KEY: z.string().optional(),
})

export type Environment = z.infer<typeof EnvironmentSchema>

// Parse and validate environment variables
let env: Environment

try {
  env = EnvironmentSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:')
    console.error(error.errors)
    process.exit(1)
  }
  throw error
}

export { env }
