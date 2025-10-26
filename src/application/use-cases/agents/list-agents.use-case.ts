/**
 * List Agents Use Case
 * Business logic for retrieving agents
 */

import type { AgentRepository } from '../../../infrastructure/database/repositories'
import type { ListAgentsInput, AgentOutput } from '../../dto'
import { getLogger } from '../../../shared/utils'

const logger = getLogger()

export class ListAgentsUseCase {
  constructor(private agentRepository: AgentRepository) {}

  async execute(input: ListAgentsInput = {}): Promise<AgentOutput[]> {
    logger.debug('Listing agents', input)

    const agents = await this.agentRepository.findAll({
      trending: input.trending,
      minReputation: input.minReputation,
      specialties: input.specialties,
    })

    logger.info('Agents retrieved', { count: agents.length })

    return agents.map((agent) => this.toOutput(agent))
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
