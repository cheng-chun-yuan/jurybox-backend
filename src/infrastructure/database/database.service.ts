/**
 * Database Service
 * Centralized database access using Prisma
 */

import { PrismaClient } from '@prisma/client'
import { appConfig } from '../config'
import { getLogger } from '../../shared/utils'

const logger = getLogger()

// Global Prisma client instance
let prisma: PrismaClient | null = null

export function getDatabaseClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        appConfig.logging.level === 'debug'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    })
  }
  return prisma
}

export async function connectDatabase(): Promise<void> {
  const db = getDatabaseClient()
  try {
    await db.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Database connection failed', error)
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    logger.info('Database disconnected')
    prisma = null
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const db = getDatabaseClient()
    await db.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    logger.error('Database health check failed', error)
    return false
  }
}
