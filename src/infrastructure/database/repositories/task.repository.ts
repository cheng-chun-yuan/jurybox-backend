/**
 * Task Repository
 * Data access layer for task entities
 */

import { PrismaClient, Task as PrismaTask } from '@prisma/client'
import { IRepository } from '../../../shared/interfaces'

export interface CreateTaskData {
  taskId: string
  content: string
  topicId: string
  creatorAddress: string
  maxRounds?: number
  monthlyCap?: number
  currentUsage?: number
  taskCost?: number
}

export interface UpdateTaskData {
  status?: string
  currentRound?: number
  finalScore?: number
  consensusReached?: boolean
  quotaExceeded?: boolean
}

export interface TaskFilters {
  status?: string
  creatorAddress?: string
}

export interface TaskWithDetails extends PrismaTask {
  scores?: any[]
  payments?: any[]
  auditLogs?: any[]
}

export class TaskRepository implements Partial<IRepository<PrismaTask, string>> {
  constructor(private prisma: PrismaClient) {}

  async findById(taskId: string): Promise<TaskWithDetails | null> {
    return this.prisma.task.findUnique({
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

  async findAll(filters?: TaskFilters): Promise<PrismaTask[]> {
    const where: any = {}

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.creatorAddress) {
      where.creatorAddress = filters.creatorAddress
    }

    return this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(data: CreateTaskData): Promise<PrismaTask> {
    return this.prisma.task.create({
      data,
    })
  }

  async update(taskId: string, data: UpdateTaskData): Promise<PrismaTask> {
    return this.prisma.task.update({
      where: { taskId },
      data,
    })
  }

  async delete(taskId: string): Promise<void> {
    await this.prisma.task.delete({
      where: { taskId },
    })
  }

  async updateStatus(taskId: string, status: string, currentRound?: number): Promise<PrismaTask> {
    return this.prisma.task.update({
      where: { taskId },
      data: {
        status,
        ...(currentRound && { currentRound }),
      },
    })
  }

  async finalizeTask(taskId: string, finalScore: number): Promise<PrismaTask> {
    return this.prisma.task.update({
      where: { taskId },
      data: {
        status: 'completed',
        finalScore,
        consensusReached: true,
      },
    })
  }

  async getStatistics(): Promise<{
    total: number
    completed: number
    active: number
    failed: number
    completionRate: number
  }> {
    const [total, completed, active, failed] = await Promise.all([
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: 'completed' } }),
      this.prisma.task.count({ where: { status: 'active' } }),
      this.prisma.task.count({ where: { status: 'failed' } }),
    ])

    return {
      total,
      completed,
      active,
      failed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    }
  }
}
