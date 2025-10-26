/**
 * Payment Repository
 * Data access layer for payment entities
 */

import { PrismaClient, Payment as PrismaPayment } from '@prisma/client'
import { IRepository } from '../../../shared/interfaces'

export interface CreatePaymentData {
  taskId: string
  judgeId: number
  amount: number
}

export interface UpdatePaymentData {
  status?: string
  txHash?: string
}

export class PaymentRepository implements Partial<IRepository<PrismaPayment, number>> {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number): Promise<PrismaPayment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        task: true,
        judge: true,
      },
    })
  }

  async findByTaskAndJudge(taskId: string, judgeId: number): Promise<PrismaPayment | null> {
    return this.prisma.payment.findUnique({
      where: {
        taskId_judgeId: {
          taskId,
          judgeId,
        },
      },
    })
  }

  async findByTask(taskId: string): Promise<PrismaPayment[]> {
    return this.prisma.payment.findMany({
      where: { taskId },
      include: {
        judge: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findAll(): Promise<PrismaPayment[]> {
    return this.prisma.payment.findMany({
      include: {
        task: true,
        judge: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(data: CreatePaymentData): Promise<PrismaPayment> {
    return this.prisma.payment.create({
      data,
    })
  }

  async update(id: number, data: UpdatePaymentData): Promise<PrismaPayment> {
    const updateData: any = { ...data }

    if (data.status === 'verified') {
      updateData.verifiedAt = new Date()
    } else if (data.status === 'settled') {
      updateData.settledAt = new Date()
    }

    return this.prisma.payment.update({
      where: { id },
      data: updateData,
    })
  }

  async updateStatus(
    taskId: string,
    judgeId: number,
    status: string,
    txHash?: string
  ): Promise<PrismaPayment> {
    const updateData: any = { status }

    if (status === 'verified') {
      updateData.verifiedAt = new Date()
    } else if (status === 'settled') {
      updateData.settledAt = new Date()
    }

    if (txHash) {
      updateData.txHash = txHash
    }

    return this.prisma.payment.update({
      where: {
        taskId_judgeId: {
          taskId,
          judgeId,
        },
      },
      data: updateData,
    })
  }

  async delete(id: number): Promise<void> {
    await this.prisma.payment.delete({
      where: { id },
    })
  }

  async getTotalSettled(): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { status: 'settled' },
      _sum: { amount: true },
    })

    return result._sum.amount || 0
  }
}
