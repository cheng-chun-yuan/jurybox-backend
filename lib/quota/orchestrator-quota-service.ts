/**
 * Orchestrator Quota Service
 * Manages pay-per-use with monthly spending caps integrated into the orchestrator schema
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

export interface TaskQuotaInfo {
  taskId: string
  creatorAddress: string
  monthlyCap: number
  currentUsage: number
  taskCost: number
  quotaExceeded: boolean
}

export class OrchestratorQuotaService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Check if user can create a task within their monthly quota
   */
  async checkTaskQuota(
    creatorAddress: string, 
    estimatedCost: number,
    monthlyCap: number = 100.0
  ): Promise<QuotaCheckResult> {
    try {
      // Get user's current month usage from existing tasks
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const monthlyUsage = await this.prisma.task.aggregate({
        where: {
          creatorAddress,
          createdAt: {
            gte: startOfMonth
          },
          quotaExceeded: false // Only count successful tasks
        },
        _sum: {
          taskCost: true
        }
      })

      const currentUsage = monthlyUsage._sum.taskCost || 0
      const newUsage = currentUsage + estimatedCost
      const allowed = newUsage <= monthlyCap

      return {
        allowed,
        currentUsage,
        monthlyCap,
        remainingQuota: monthlyCap - currentUsage,
        resetDate: this.getNextResetDate(),
        reason: allowed ? undefined : `Task would exceed monthly cap. Current: $${currentUsage.toFixed(2)}, Cap: $${monthlyCap.toFixed(2)}, Estimated: $${estimatedCost.toFixed(2)}`
      }
    } catch (error) {
      console.error('Error checking task quota:', error)
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
   * Record task cost and update quota tracking
   */
  async recordTaskCost(
    taskId: string,
    creatorAddress: string,
    taskCost: number,
    monthlyCap: number
  ): Promise<void> {
    try {
      // Get current month usage
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const monthlyUsage = await this.prisma.task.aggregate({
        where: {
          creatorAddress,
          createdAt: {
            gte: startOfMonth
          },
          quotaExceeded: false
        },
        _sum: {
          taskCost: true
        }
      })

      const currentUsage = monthlyUsage._sum.taskCost || 0

      // Create or update task with quota information
      await this.prisma.task.upsert({
        where: { taskId },
        update: {
          monthlyCap,
          currentUsage,
          taskCost,
          quotaExceeded: false
        },
        create: {
          taskId,
          content: `Demo task for quota testing`,
          topicId: `demo-topic-${taskId}`,
          creatorAddress,
          maxRounds: 3,
          monthlyCap,
          currentUsage,
          taskCost,
          quotaExceeded: false
        }
      })

      console.log(`📊 Task ${taskId} quota recorded: $${taskCost} (Total: $${currentUsage + taskCost}/${monthlyCap})`)
    } catch (error) {
      console.error('Error recording task cost:', error)
      throw error
    }
  }

  /**
   * Mark task as quota exceeded
   */
  async markQuotaExceeded(taskId: string, reason: string): Promise<void> {
    try {
      // Create or update task as quota exceeded
      await this.prisma.task.upsert({
        where: { taskId },
        update: {
          quotaExceeded: true,
          status: 'failed'
        },
        create: {
          taskId,
          content: `Blocked task: ${reason}`,
          topicId: `blocked-topic-${taskId}`,
          creatorAddress: 'unknown',
          maxRounds: 1,
          quotaExceeded: true,
          status: 'failed'
        }
      })

      // Log the quota exceeded event
      await this.prisma.auditLog.create({
        data: {
          taskId,
          event: 'quota_exceeded',
          data: JSON.stringify({ reason })
        }
      })

      console.log(`❌ Task ${taskId} marked as quota exceeded: ${reason}`)
    } catch (error) {
      console.error('Error marking quota exceeded:', error)
      throw error
    }
  }

  /**
   * Get user's current quota status
   */
  async getUserQuotaStatus(creatorAddress: string): Promise<QuotaCheckResult> {
    try {
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const monthlyUsage = await this.prisma.task.aggregate({
        where: {
          creatorAddress,
          createdAt: {
            gte: startOfMonth
          },
          quotaExceeded: false
        },
        _sum: {
          taskCost: true
        }
      })

      const currentUsage = monthlyUsage._sum.taskCost || 0
      const monthlyCap = 100.0 // Default cap, could be configurable per user

      return {
        allowed: currentUsage < monthlyCap,
        currentUsage,
        monthlyCap,
        remainingQuota: monthlyCap - currentUsage,
        resetDate: this.getNextResetDate()
      }
    } catch (error) {
      console.error('Error getting quota status:', error)
      return {
        allowed: true,
        currentUsage: 0,
        monthlyCap: 100.0,
        remainingQuota: 100.0,
        resetDate: this.getNextResetDate()
      }
    }
  }

  /**
   * Get task quota information
   */
  async getTaskQuotaInfo(taskId: string): Promise<TaskQuotaInfo | null> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { taskId },
        select: {
          taskId: true,
          creatorAddress: true,
          monthlyCap: true,
          currentUsage: true,
          taskCost: true,
          quotaExceeded: true
        }
      })

      if (!task) return null

      return {
        taskId: task.taskId,
        creatorAddress: task.creatorAddress,
        monthlyCap: task.monthlyCap || 100.0,
        currentUsage: task.currentUsage || 0,
        taskCost: task.taskCost || 0,
        quotaExceeded: task.quotaExceeded
      }
    } catch (error) {
      console.error('Error getting task quota info:', error)
      return null
    }
  }

  /**
   * Calculate estimated task cost based on judges and rounds
   */
  calculateTaskCost(judgeCount: number, maxRounds: number, pricePerJudgment: number = 5.0): number {
    // Cost = number of judges × max rounds × price per judgment
    return judgeCount * maxRounds * pricePerJudgment
  }

  /**
   * Update user's monthly cap
   */
  async updateMonthlyCap(creatorAddress: string, newCap: number): Promise<void> {
    try {
      // Get current month usage
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const monthlyUsage = await this.prisma.task.aggregate({
        where: {
          creatorAddress,
          createdAt: {
            gte: startOfMonth
          },
          quotaExceeded: false
        },
        _sum: {
          taskCost: true
        }
      })

      const currentUsage = monthlyUsage._sum.taskCost || 0

      // Update or create task with new monthly cap
      await this.prisma.task.upsert({
        where: { taskId: `quota-config-${creatorAddress}` },
        update: {
          monthlyCap: newCap,
          currentUsage,
          quotaExceeded: false
        },
        create: {
          taskId: `quota-config-${creatorAddress}`,
          content: `Monthly quota configuration for ${creatorAddress}`,
          topicId: `quota-config-${creatorAddress}`,
          creatorAddress,
          maxRounds: 1,
          monthlyCap: newCap,
          currentUsage,
          quotaExceeded: false
        }
      })

      console.log(`✅ Monthly cap updated to $${newCap} for ${creatorAddress}`)
    } catch (error) {
      console.error('Error updating monthly cap:', error)
      throw error
    }
  }

  /**
   * Get next reset date (first day of next month)
   */
  private getNextResetDate(): Date {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    nextMonth.setHours(0, 0, 0, 0)
    return nextMonth
  }

  /**
   * Get monthly usage summary for a user
   */
  async getMonthlyUsageSummary(creatorAddress: string): Promise<{
    totalTasks: number
    totalCost: number
    successfulTasks: number
    failedTasks: number
    quotaExceededTasks: number
  }> {
    try {
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      
      const tasks = await this.prisma.task.findMany({
        where: {
          creatorAddress,
          createdAt: {
            gte: startOfMonth
          }
        },
        select: {
          taskCost: true,
          status: true,
          quotaExceeded: true
        }
      })

      const summary = tasks.reduce((acc, task) => {
        acc.totalTasks++
        acc.totalCost += task.taskCost || 0
        
        if (task.quotaExceeded) {
          acc.quotaExceededTasks++
          acc.failedTasks++
        } else if (task.status === 'completed') {
          acc.successfulTasks++
        } else if (task.status === 'failed') {
          acc.failedTasks++
        }
        
        return acc
      }, {
        totalTasks: 0,
        totalCost: 0,
        successfulTasks: 0,
        failedTasks: 0,
        quotaExceededTasks: 0
      })

      return summary
    } catch (error) {
      console.error('Error getting monthly usage summary:', error)
      return {
        totalTasks: 0,
        totalCost: 0,
        successfulTasks: 0,
        failedTasks: 0,
        quotaExceededTasks: 0
      }
    }
  }
}
