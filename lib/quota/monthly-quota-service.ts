/**
 * Monthly Quota Service
 * Manages pay-per-use with monthly spending caps for users
 */

import { PrismaClient } from '@prisma/client'

export interface QuotaCheckResult {
  allowed: boolean
  currentUsage: number
  monthlyCap: number
  remainingQuota: number
  resetDate: Date
  reason?: string
}

export interface UsageRecord {
  userAddress: string
  amount: number
  currency?: string
  taskId?: string
  description?: string
  txHash?: string
}

export class MonthlyQuotaService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Check if user can make a payment within their monthly quota
   */
  async checkQuota(
    userAddress: string, 
    requestedAmount: number
  ): Promise<QuotaCheckResult> {
    try {
      // Get or create user quota
      let userQuota = await this.prisma.userQuota.findUnique({
        where: { userAddress }
      })

      if (!userQuota) {
        // Create default quota for new user
        userQuota = await this.prisma.userQuota.create({
          data: {
            userAddress,
            monthlyCap: 100.0, // Default $100 monthly cap
            currentUsage: 0.0,
            lastResetDate: new Date(),
            isActive: true
          }
        })
      }

      // Check if quota needs reset (monthly)
      const now = new Date()
      const lastReset = new Date(userQuota.lastResetDate)
      const needsReset = this.shouldResetQuota(lastReset, now)

      if (needsReset) {
        // Reset monthly usage
        userQuota = await this.prisma.userQuota.update({
          where: { userAddress },
          data: {
            currentUsage: 0.0,
            lastResetDate: now
          }
        })
      }

      // Check if payment would exceed quota
      const newUsage = userQuota.currentUsage + requestedAmount
      const allowed = newUsage <= userQuota.monthlyCap

      return {
        allowed,
        currentUsage: userQuota.currentUsage,
        monthlyCap: userQuota.monthlyCap,
        remainingQuota: userQuota.monthlyCap - userQuota.currentUsage,
        resetDate: this.getNextResetDate(userQuota.lastResetDate),
        reason: allowed ? undefined : `Payment would exceed monthly cap. Current: $${userQuota.currentUsage.toFixed(2)}, Cap: $${userQuota.monthlyCap.toFixed(2)}, Requested: $${requestedAmount.toFixed(2)}`
      }
    } catch (error) {
      console.error('Error checking quota:', error)
      return {
        allowed: false,
        currentUsage: 0,
        monthlyCap: 0,
        remainingQuota: 0,
        resetDate: new Date(),
        reason: 'Error checking quota'
      }
    }
  }

  /**
   * Record usage after successful payment
   */
  async recordUsage(usage: UsageRecord): Promise<void> {
    try {
      // Record the usage
      await this.prisma.usageLog.create({
        data: {
          userAddress: usage.userAddress,
          amount: usage.amount,
          currency: usage.currency || 'USD',
          taskId: usage.taskId,
          description: usage.description,
          txHash: usage.txHash
        }
      })

      // Update current usage
      await this.prisma.userQuota.upsert({
        where: { userAddress: usage.userAddress },
        update: {
          currentUsage: {
            increment: usage.amount
          }
        },
        create: {
          userAddress: usage.userAddress,
          monthlyCap: 100.0,
          currentUsage: usage.amount,
          lastResetDate: new Date(),
          isActive: true
        }
      })
    } catch (error) {
      console.error('Error recording usage:', error)
      throw error
    }
  }

  /**
   * Get user's current quota status
   */
  async getQuotaStatus(userAddress: string): Promise<QuotaCheckResult> {
    const userQuota = await this.prisma.userQuota.findUnique({
      where: { userAddress }
    })

    if (!userQuota) {
      return {
        allowed: true,
        currentUsage: 0,
        monthlyCap: 100.0,
        remainingQuota: 100.0,
        resetDate: this.getNextResetDate(new Date())
      }
    }

    // Check if quota needs reset
    const now = new Date()
    const lastReset = new Date(userQuota.lastResetDate)
    const needsReset = this.shouldResetQuota(lastReset, now)

    if (needsReset) {
      // Reset and return new status
      const resetQuota = await this.prisma.userQuota.update({
        where: { userAddress },
        data: {
          currentUsage: 0.0,
          lastResetDate: now
        }
      })

      return {
        allowed: true,
        currentUsage: 0,
        monthlyCap: resetQuota.monthlyCap,
        remainingQuota: resetQuota.monthlyCap,
        resetDate: this.getNextResetDate(now)
      }
    }

    return {
      allowed: userQuota.currentUsage < userQuota.monthlyCap,
      currentUsage: userQuota.currentUsage,
      monthlyCap: userQuota.monthlyCap,
      remainingQuota: userQuota.monthlyCap - userQuota.currentUsage,
      resetDate: this.getNextResetDate(userQuota.lastResetDate)
    }
  }

  /**
   * Update user's monthly cap
   */
  async updateMonthlyCap(userAddress: string, newCap: number): Promise<void> {
    await this.prisma.userQuota.upsert({
      where: { userAddress },
      update: { monthlyCap: newCap },
      create: {
        userAddress,
        monthlyCap: newCap,
        currentUsage: 0.0,
        lastResetDate: new Date(),
        isActive: true
      }
    })
  }

  /**
   * Get usage history for a user
   */
  async getUsageHistory(
    userAddress: string, 
    limit: number = 50
  ): Promise<any[]> {
    return await this.prisma.usageLog.findMany({
      where: { userAddress },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Check if quota should be reset (monthly)
   */
  private shouldResetQuota(lastReset: Date, now: Date): boolean {
    const lastResetMonth = lastReset.getMonth()
    const lastResetYear = lastReset.getFullYear()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return currentYear > lastResetYear || 
           (currentYear === lastResetYear && currentMonth > lastResetMonth)
  }

  /**
   * Get next reset date (first day of next month)
   */
  private getNextResetDate(lastReset: Date): Date {
    const nextMonth = new Date(lastReset)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    nextMonth.setHours(0, 0, 0, 0)
    return nextMonth
  }
}
