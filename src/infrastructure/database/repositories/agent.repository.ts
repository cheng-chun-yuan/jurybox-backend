/**
 * Agent Repository
 * Data access layer for agent entities
 */

import { PrismaClient, Agent as PrismaAgent } from '@prisma/client'
import { IRepository } from '../../../shared/interfaces'
import { Agent } from '../../../domain/types'

export interface CreateAgentData {
  name: string
  accountId: string
  payToAddress: string
  fee: number
  specialties: string[]
  bio?: string
  avatar?: string
  color?: string
  reputation?: number
  trending?: boolean
}

export interface UpdateAgentData {
  name?: string
  bio?: string
  avatar?: string
  color?: string
  reputation?: number
  trending?: boolean
  fee?: number
  specialties?: string[]
}

export interface AgentFilters {
  trending?: boolean
  minReputation?: number
  specialties?: string[]
}

export class AgentRepository implements Partial<IRepository<Agent, number>> {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number): Promise<Agent | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    })

    return agent ? this.mapToEntity(agent) : null
  }

  async findByAccountId(accountId: string): Promise<Agent | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { accountId },
    })

    return agent ? this.mapToEntity(agent) : null
  }

  async findAll(filters?: AgentFilters): Promise<Agent[]> {
    const where: any = {}

    if (filters?.trending !== undefined) {
      where.trending = filters.trending
    }

    if (filters?.minReputation !== undefined) {
      where.reputation = { gte: filters.minReputation }
    }

    const agents = await this.prisma.agent.findMany({
      where,
      orderBy: { reputation: 'desc' },
    })

    return agents.map((agent) => this.mapToEntity(agent))
  }

  async create(data: CreateAgentData): Promise<Agent> {
    const agent = await this.prisma.agent.create({
      data: {
        ...data,
        specialties: JSON.stringify(data.specialties),
      },
    })

    return this.mapToEntity(agent)
  }

  async update(id: number, data: UpdateAgentData): Promise<Agent> {
    const updateData: any = { ...data }

    if (data.specialties) {
      updateData.specialties = JSON.stringify(data.specialties)
    }

    const agent = await this.prisma.agent.update({
      where: { id },
      data: updateData,
    })

    return this.mapToEntity(agent)
  }

  async delete(id: number): Promise<void> {
    await this.prisma.agent.delete({
      where: { id },
    })
  }

  async updateReputation(id: number, reputation: number): Promise<void> {
    await this.prisma.agent.update({
      where: { id },
      data: { reputation },
    })
  }

  async incrementCompletedJudgments(id: number): Promise<void> {
    // This would require adding a completedJudgments field to the schema
    // For now, we'll just update the reputation
    const agent = await this.findById(id)
    if (agent) {
      await this.updateReputation(id, agent.reputation.averageRating + 0.01)
    }
  }

  private mapToEntity(prismaAgent: PrismaAgent): Agent {
    const specialties = JSON.parse(prismaAgent.specialties as string) as string[]

    return {
      id: prismaAgent.id.toString(),
      name: prismaAgent.name,
      title: prismaAgent.name,
      tagline: prismaAgent.bio || '',
      bio: prismaAgent.bio || '',
      avatar: prismaAgent.avatar || '',
      color: (prismaAgent.color || 'purple') as 'purple' | 'cyan' | 'gold',
      hederaAccount: {
        accountId: prismaAgent.accountId,
        publicKey: '',
        balance: 0,
      },
      paymentConfig: {
        enabled: true,
        acceptedTokens: ['HBAR'],
        pricePerJudgment: prismaAgent.fee,
        paymentAddress: prismaAgent.payToAddress,
        minimumPayment: prismaAgent.fee,
      },
      identity: {
        registryId: '',
        agentId: prismaAgent.id.toString(),
        verified: false,
        registeredAt: prismaAgent.createdAt.getTime(),
      },
      reputation: {
        totalReviews: 0,
        averageRating: prismaAgent.reputation,
        completedJudgments: 0,
        successRate: 1.0,
        lastUpdated: Date.now(),
      },
      capabilities: {
        specialties,
        languages: ['en'],
        modelProvider: 'openai',
        modelName: 'gpt-4',
        systemPrompt: prismaAgent.bio || '',
        temperature: 0.7,
        maxTokens: 2000,
      },
      createdBy: '',
      createdAt: prismaAgent.createdAt.getTime(),
      updatedAt: prismaAgent.updatedAt.getTime(),
      isActive: true,
      trending: prismaAgent.trending || false,
    }
  }
}
