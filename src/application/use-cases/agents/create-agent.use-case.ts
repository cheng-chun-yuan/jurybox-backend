/**
 * Create Agent Use Case
 * Business logic for creating a new agent
 */

import type { AgentRepository } from '../../../infrastructure/database/repositories'
import type { CreateAgentInput, AgentOutput } from '../../dto'
import { ValidationError } from '../../../shared/errors'
import { getLogger } from '../../../shared/utils'

const logger = getLogger()

export class CreateAgentUseCase {
  constructor(private agentRepository: AgentRepository) {}

  async execute(input: CreateAgentInput): Promise<AgentOutput> {
    logger.info('Creating new agent', { name: input.name })

    // Check if agent with same account ID already exists
    const existing = await this.agentRepository.findByAccountId(input.accountId)
    if (existing) {
      throw new ValidationError('Agent with this account ID already exists', {
        accountId: input.accountId,
      })
    }

    // Create agent
    const agent = await this.agentRepository.create({
      name: input.name,
      accountId: input.accountId,
      payToAddress: input.payToAddress,
      fee: input.fee,
      specialties: input.specialties,
      bio: input.bio,
      avatar: input.avatar,
      color: input.color,
      reputation: input.reputation || 0,
      trending: input.trending || false,
    })

    logger.info('Agent created successfully', { agentId: agent.id })

    return this.toOutput(agent)
  }

  private toOutput(agent: any): AgentOutput {
    return {
      id: agent.id,
      name: agent.name,
      accountId: agent.hederaAccount.accountId,
      payToAddress: agent.paymentConfig.paymentAddress,
      fee: agent.paymentConfig.pricePerJudgment,
      reputation: agent.reputation.averageRating,
      specialties: agent.capabilities.specialties,
      bio: agent.bio,
      avatar: agent.avatar,
      color: agent.color,
      trending: agent.trending,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }
  }
}
