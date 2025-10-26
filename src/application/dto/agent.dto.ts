/**
 * Agent DTOs
 * Data Transfer Objects for agent operations with Zod validation
 */

import { z } from 'zod'
import { AgentColor } from '../../shared/constants'

// Create Agent DTO
export const CreateAgentInputSchema = z.object({
  name: z.string().min(1).max(100),
  accountId: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid Hedera account ID format'),
  payToAddress: z.string(),
  fee: z.number().min(0),
  specialties: z.array(z.string()).min(1),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  color: z.enum([AgentColor.PURPLE, AgentColor.CYAN, AgentColor.GOLD] as const).optional(),
  reputation: z.number().min(0).max(10).optional(),
  trending: z.boolean().optional(),
})

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>

// Update Agent DTO
export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().optional(),
  avatar: z.string().url().optional(),
  color: z.enum([AgentColor.PURPLE, AgentColor.CYAN, AgentColor.GOLD] as const).optional(),
  reputation: z.number().min(0).max(10).optional(),
  trending: z.boolean().optional(),
  fee: z.number().min(0).optional(),
  specialties: z.array(z.string()).min(1).optional(),
})

export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>

// List Agents DTO
export const ListAgentsInputSchema = z.object({
  trending: z.boolean().optional(),
  minReputation: z.number().min(0).max(10).optional(),
  specialties: z.array(z.string()).optional(),
})

export type ListAgentsInput = z.infer<typeof ListAgentsInputSchema>

// Response DTOs
export interface AgentOutput {
  id: string
  name: string
  accountId: string
  payToAddress: string
  fee: number
  reputation: number
  specialties: string[]
  bio?: string
  avatar?: string
  color?: string
  trending?: boolean
  createdAt: number
  updatedAt: number
}
