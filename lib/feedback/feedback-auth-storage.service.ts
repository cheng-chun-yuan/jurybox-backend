/**
 * Feedback Auth Storage Service
 * Stores and retrieves FeedbackAuth records from database
 */

import { PrismaClient } from '@prisma/client'
import { getFeedbackAuthService, type FeedbackAuth } from './feedback-auth.service.js'

const prisma = new PrismaClient()

export interface StoredFeedbackAuth {
  id: string
  agentId: string
  agentName?: string
  clientAddress: string
  feedbackAuth: string
  issuedAt: Date
  expiresAt: Date
  indexLimit: number
  used: boolean
  chainId: string
  identityRegistry: string
  signerAddress: string
  signature: string
}

/**
 * Create and store feedback auth for a client
 * Checks if client already has active auth before creating new one
 */
export async function createAndStoreFeedbackAuth(
  agentId: number,
  agentName: string,
  clientAddress: string
): Promise<StoredFeedbackAuth> {
  // Check if client already has active (unused & not expired) auth for this agent
  const existing = await prisma.feedbackAuthRecord.findFirst({
    where: {
      agentId: agentId.toString(),
      clientAddress,
      expiresAt: { gt: new Date() },
      used: false,
    },
  })

  if (existing) {
    console.log(`♻️  Reusing existing FeedbackAuth for agent ${agentId}, client ${clientAddress}`)
    return {
      ...existing,
      agentName,
    }
  }

  // Create new auth
  const feedbackAuthService = getFeedbackAuthService()
  const auth = await feedbackAuthService.generateFeedbackAuth({
    agentId,
    clientAddress,
    indexLimit: 100,
    expirySeconds: 3600, // 1 hour
  })

  // Generate unique ID
  const id = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Store in database
  const record = await prisma.feedbackAuthRecord.create({
    data: {
      id,
      agentId: agentId.toString(),
      clientAddress,
      feedbackAuth: auth.feedbackAuth,
      issuedAt: new Date(),
      expiresAt: new Date(Number(auth.expiry) * 1000),
      indexLimit: Number(auth.indexTo),
      used: false,
      chainId: auth.chainId.toString(),
      identityRegistry: auth.identityRegistry,
      signerAddress: auth.signerAddress,
      signature: auth.signature,
    },
  })

  console.log(`✅ Created and stored FeedbackAuth: ${id}`)

  return {
    ...record,
    agentName,
  }
}

/**
 * Get all active feedback auth records for a client
 */
export async function getActiveFeedbackAuths(clientAddress: string): Promise<StoredFeedbackAuth[]> {
  const records = await prisma.feedbackAuthRecord.findMany({
    where: {
      clientAddress,
      expiresAt: { gt: new Date() },
      used: false,
    },
    orderBy: {
      issuedAt: 'desc',
    },
  })

  return records
}

/**
 * Mark feedback auth as used
 */
export async function markFeedbackAuthAsUsed(id: string): Promise<void> {
  await prisma.feedbackAuthRecord.update({
    where: { id },
    data: { used: true },
  })
  console.log(`✅ Marked FeedbackAuth as used: ${id}`)
}

/**
 * Cleanup expired feedback auth records
 */
export async function cleanupExpiredFeedbackAuths(): Promise<number> {
  const result = await prisma.feedbackAuthRecord.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
  console.log(`🧹 Cleaned up ${result.count} expired FeedbackAuth records`)
  return result.count
}
