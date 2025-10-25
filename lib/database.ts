/**
 * Database Service
 * Centralized database access using Prisma with SQLite
 */

import { PrismaClient } from '@prisma/client'
import { config } from '../server/config/index.js'

// Global Prisma client instance
let prisma: PrismaClient | null = null

export function getDatabase(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: config.logging.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
    })
  }
  return prisma
}

export async function connectDatabase(): Promise<void> {
  const db = getDatabase()
  try {
    await db.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
  }
}

// Database utility functions
export class DatabaseService {
  private db: PrismaClient

  constructor() {
    this.db = getDatabase()
  }

  // Agent operations
  async createAgent(data: {
    name: string
    accountId: string
    payToAddress: string
    fee: number
    specialties: string[]
    bio?: string
    avatar?: string
    color?: string
  }) {
    return this.db.agent.create({
      data: {
        ...data,
        specialties: JSON.stringify(data.specialties),
      },
    })
  }

  async getAgentById(id: number) {
    const agent = await this.db.agent.findUnique({
      where: { id },
    })
    if (agent) {
      agent.specialties = JSON.parse(agent.specialties as string)
    }
    return agent
  }

  async getAgentByAccountId(accountId: string) {
    const agent = await this.db.agent.findUnique({
      where: { accountId },
    })
    if (agent) {
      agent.specialties = JSON.parse(agent.specialties as string)
    }
    return agent
  }

  async getAllAgents() {
    const agents = await this.db.agent.findMany({
      orderBy: { reputation: 'desc' },
    })
    return agents.map(agent => ({
      ...agent,
      specialties: JSON.parse(agent.specialties as string),
    }))
  }

  // Task operations
  async createTask(data: {
    taskId: string
    content: string
    topicId: string
    creatorAddress: string
    maxRounds?: number
  }) {
    return this.db.task.create({
      data,
    })
  }

  async getTaskById(taskId: string) {
    return this.db.task.findUnique({
      where: { taskId },
      include: {
        scores: {
          include: {
            judge: true,
          },
        },
        payments: {
          include: {
            judge: true,
          },
        },
        auditLogs: true,
      },
    })
  }

  async updateTaskStatus(taskId: string, status: string, currentRound?: number) {
    return this.db.task.update({
      where: { taskId },
      data: {
        status,
        ...(currentRound && { currentRound }),
      },
    })
  }

  async finalizeTask(taskId: string, finalScore: number) {
    return this.db.task.update({
      where: { taskId },
      data: {
        status: 'completed',
        finalScore,
        consensusReached: true,
      },
    })
  }

  // Score operations
  async submitScore(data: {
    taskId: string
    judgeId: number
    round: number
    score: number
    reasoning?: string
  }) {
    return this.db.score.upsert({
      where: {
        taskId_judgeId_round: {
          taskId: data.taskId,
          judgeId: data.judgeId,
          round: data.round,
        },
      },
      update: {
        score: data.score,
        reasoning: data.reasoning,
        submittedAt: new Date(),
      },
      create: data,
    })
  }

  async getScoresForTask(taskId: string, round?: number) {
    return this.db.score.findMany({
      where: {
        taskId,
        ...(round && { round }),
      },
      include: {
        judge: true,
      },
      orderBy: { submittedAt: 'asc' },
    })
  }

  // Payment operations
  async createPayment(data: {
    taskId: string
    judgeId: number
    amount: number
  }) {
    return this.db.payment.create({
      data,
    })
  }

  async updatePaymentStatus(
    taskId: string,
    judgeId: number,
    status: string,
    txHash?: string
  ) {
    const updateData: any = { status }
    
    if (status === 'verified') {
      updateData.verifiedAt = new Date()
    } else if (status === 'settled') {
      updateData.settledAt = new Date()
    }
    
    if (txHash) {
      updateData.txHash = txHash
    }

    return this.db.payment.update({
      where: {
        taskId_judgeId: {
          taskId,
          judgeId,
        },
      },
      data: updateData,
    })
  }

  async getPaymentsForTask(taskId: string) {
    return this.db.payment.findMany({
      where: { taskId },
      include: {
        judge: true,
      },
    })
  }

  // Audit operations
  async logEvent(data: {
    taskId: string
    event: string
    data?: any
    hcsMessageId?: string
  }) {
    return this.db.auditLog.create({
      data: {
        ...data,
        data: data.data ? JSON.stringify(data.data) : null,
      },
    })
  }

  async getAuditLogs(taskId: string) {
    const logs = await this.db.auditLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    })
    return logs.map(log => ({
      ...log,
      data: log.data ? JSON.parse(log.data) : null,
    }))
  }

  // Statistics and analytics
  async getTaskStatistics() {
    const [totalTasks, completedTasks, activeTasks, totalPayments] = await Promise.all([
      this.db.task.count(),
      this.db.task.count({ where: { status: 'completed' } }),
      this.db.task.count({ where: { status: 'active' } }),
      this.db.payment.count({ where: { status: 'settled' } }),
    ])

    return {
      totalTasks,
      completedTasks,
      activeTasks,
      totalPayments,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    }
  }

  async getAgentStatistics(agentId: number) {
    const [totalScores, totalPayments, avgScore] = await Promise.all([
      this.db.score.count({ where: { judgeId: agentId } }),
      this.db.payment.count({ where: { judgeId: agentId, status: 'settled' } }),
      this.db.score.aggregate({
        where: { judgeId: agentId },
        _avg: { score: true },
      }),
    ])

    return {
      totalScores,
      totalPayments,
      averageScore: avgScore._avg.score || 0,
    }
  }

  // AA Wallet operations
  async createAAWallet(data: {
    aaWalletId: string
    userAddress: string
    publicKey: string
    initialBalance: number
    fundedBalance: number
    fundingTxId?: string
    name?: string
  }) {
    return this.db.aAWallet.create({
      data: {
        ...data,
        name: data.name || 'Orchestrator AA Wallet'
      },
    })
  }

  async getAAWalletByAddress(aaWalletId: string) {
    return this.db.aAWallet.findUnique({
      where: { aaWalletId },
    })
  }

  async getUserAAWallets(userAddress: string) {
    return this.db.aAWallet.findMany({
      where: { userAddress },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getAllAAWallets() {
    return this.db.aAWallet.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateAAWalletStatus(aaWalletId: string, isActive: boolean) {
    return this.db.aAWallet.update({
      where: { aaWalletId },
      data: { isActive },
    })
  }
}

// Export singleton instance
export const dbService = new DatabaseService()
