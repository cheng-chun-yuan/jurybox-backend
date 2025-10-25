/**
 * Direct Payment Service
 * Handles direct HBAR transfers using private keys instead of allowances
 */

import {
  Client,
  AccountId,
  PrivateKey,
  Hbar,
  TransferTransaction,
  TransactionReceipt,
  HbarUnit,
} from '@hashgraph/sdk'
import { getDatabase } from '../database.js'

export interface DirectPaymentResult {
  success: boolean
  txId?: string
  receipt?: TransactionReceipt
  error?: string
}

export class DirectPaymentService {
  private client: Client
  private prisma = getDatabase()

  constructor(client: Client) {
    this.client = client
  }

  /**
   * Transfer HBAR directly from one account to another
   */
  async transferHbar(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    fromPrivateKey: PrivateKey,
    memo?: string
  ): Promise<DirectPaymentResult> {
    try {
      console.log(`💸 Direct HBAR Transfer: ${fromAccountId} → ${toAccountId}`)
      console.log(`   Amount: ${amount} HBAR`)
      console.log(`   Memo: ${memo || 'Direct payment'}`)

      // Create transfer transaction
      const transferTx = new TransferTransaction()
        .addHbarTransfer(
          AccountId.fromString(fromAccountId),
          new Hbar(-amount, HbarUnit.Hbar)
        )
        .addHbarTransfer(
          AccountId.fromString(toAccountId),
          new Hbar(amount, HbarUnit.Hbar)
        )
        .setTransactionMemo(memo || 'Direct HBAR payment')

      // Sign and execute transaction
      const signedTx = transferTx.sign(fromPrivateKey)
      const txResponse = await signedTx.execute(this.client)
      const receipt = await txResponse.getReceipt(this.client)

      console.log(`✅ Transfer completed`)
      console.log(`   Transaction ID: ${txResponse.transactionId}`)
      console.log(`   Status: ${receipt.status}`)

      return {
        success: true,
        txId: txResponse.transactionId.toString(),
        receipt
      }
    } catch (error) {
      console.error('❌ Direct transfer failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process payment to an agent
   */
  async payAgent(
    fromAccountId: string,
    agentId: number,
    amount: number,
    fromPrivateKey: PrivateKey,
    taskId?: string
  ): Promise<DirectPaymentResult> {
    try {
      // Get agent information
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId }
      })

      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`)
      }

      if (!agent.accountId) {
        throw new Error(`Agent ${agentId} has no account ID`)
      }

      console.log(`💰 Paying Agent ${agentId}: ${agent.name}`)
      console.log(`   Account ID: ${agent.accountId}`)
      console.log(`   Amount: ${amount} HBAR`)

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          taskId: taskId || `direct_payment_${Date.now()}`,
          judgeId: agentId,
          amount,
          status: 'pending'
        }
      })

      // Execute transfer
      const result = await this.transferHbar(
        fromAccountId,
        agent.accountId,
        amount,
        fromPrivateKey,
        `Payment to ${agent.name} (Agent ID: ${agentId})`
      )

      // Update payment record
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          txHash: result.txId,
          status: result.success ? 'completed' : 'failed',
          verifiedAt: result.success ? new Date() : null,
          error: result.error
        }
      })

      return result
    } catch (error) {
      console.error('❌ Agent payment failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process multiple payments to agents
   */
  async payMultipleAgents(
    fromAccountId: string,
    agentIds: number[],
    amount: number,
    fromPrivateKey: PrivateKey,
    taskId?: string
  ): Promise<{
    successful: DirectPaymentResult[]
    failed: DirectPaymentResult[]
    totalAmount: number
  }> {
    console.log(`💸 Processing ${agentIds.length} agent payments`)
    console.log(`   Amount per agent: ${amount} HBAR`)
    console.log(`   Total amount: ${amount * agentIds.length} HBAR`)

    const successful: DirectPaymentResult[] = []
    const failed: DirectPaymentResult[] = []

    for (const agentId of agentIds) {
      try {
        const result = await this.payAgent(
          fromAccountId,
          agentId,
          amount,
          fromPrivateKey,
          taskId
        )

        if (result.success) {
          successful.push(result)
        } else {
          failed.push(result)
        }
      } catch (error) {
        failed.push({
          success: false,
          error: error.message
        })
      }
    }

    console.log(`✅ Payment Summary:`)
    console.log(`   Successful: ${successful.length}`)
    console.log(`   Failed: ${failed.length}`)
    console.log(`   Total Amount: ${amount * agentIds.length} HBAR`)

    return {
      successful,
      failed,
      totalAmount: amount * agentIds.length
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<number> {
    try {
      const { AccountBalanceQuery } = await import('@hashgraph/sdk')
      const query = new AccountBalanceQuery().setAccountId(accountId)
      const balance = await query.execute(this.client)
      return balance.hbars.to(HbarUnit.Hbar).toNumber()
    } catch (error) {
      console.error('❌ Failed to get account balance:', error)
      throw error
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(txId: string): Promise<{
    success: boolean
    status?: string
    error?: string
  }> {
    try {
      const { TransactionId } = await import('@hashgraph/sdk')
      const transactionId = TransactionId.fromString(txId)
      const receipt = await transactionId.getReceipt(this.client)
      
      return {
        success: true,
        status: receipt.status.toString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Singleton instance
let directPaymentService: DirectPaymentService | null = null

export function getDirectPaymentService(client: Client): DirectPaymentService {
  if (!directPaymentService) {
    directPaymentService = new DirectPaymentService(client)
  }
  return directPaymentService
}
