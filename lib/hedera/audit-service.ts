/**
 * Audit Service
 * Records events to database and publishes to HCS for transparency
 */

import { getHCSService } from './hcs-service.js'
import { dbService } from '../database.js'

export interface AuditEvent {
  taskId: string
  event: string
  data?: any
  timestamp: Date
  hcsMessageId?: string
}

export interface AuditReport {
  taskId: string
  totalEvents: number
  events: AuditEvent[]
  timeline: Array<{
    timestamp: Date
    event: string
    description: string
  }>
  summary: {
    taskCreated: boolean
    roundsCompleted: number
    consensusReached: boolean
    paymentsProcessed: number
    finalScore?: number
  }
}

export class AuditService {
  private hcsService = getHCSService()

  /**
   * Log an event to both database and HCS
   */
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      console.log(`📝 Logging event: ${event.event} for task ${event.taskId}`)

      // Log to database
      const dbLog = await dbService.logEvent({
        taskId: event.taskId,
        event: event.event,
        data: event.data,
      })

      // Publish to HCS for transparency
      const task = await dbService.getTaskById(event.taskId)
      if (task) {
        const hcsMessage = {
          type: 'audit_event',
          taskId: event.taskId,
          event: event.event,
          data: event.data,
          timestamp: event.timestamp.toISOString(),
          dbLogId: dbLog.id,
        }

        const hcsMessageId = await this.hcsService.submitMessage(
          task.topicId,
          JSON.stringify(hcsMessage)
        )

        // Update database log with HCS message ID
        await dbService.logEvent({
          taskId: event.taskId,
          event: 'hcs_message_published',
          data: { 
            originalEvent: event.event,
            hcsMessageId,
            dbLogId: dbLog.id,
          },
        })

        console.log(`✅ Event logged to DB and HCS: ${hcsMessageId}`)
      }
    } catch (error) {
      console.error(`❌ Failed to log event ${event.event}:`, error)
      // Don't throw - audit failures shouldn't break the main flow
    }
  }

  /**
   * Log task creation
   */
  async logTaskCreation(taskId: string, content: string, judges: number[], maxRounds: number): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'task_created',
      data: {
        content: content.substring(0, 100) + '...', // Truncate for storage
        judges,
        maxRounds,
      },
      timestamp: new Date(),
    })
  }

  /**
   * Log round start
   */
  async logRoundStart(taskId: string, round: number): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'round_started',
      data: { round },
      timestamp: new Date(),
    })
  }

  /**
   * Log score submission
   */
  async logScoreSubmission(taskId: string, judgeId: number, round: number, score: number, reasoning: string): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'score_submitted',
      data: {
        judgeId,
        round,
        score,
        reasoning: reasoning.substring(0, 200) + '...', // Truncate for storage
      },
      timestamp: new Date(),
    })
  }

  /**
   * Log consensus calculation
   */
  async logConsensusCalculation(taskId: string, round: number, consensus: boolean, metaScores: any): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'consensus_calculated',
      data: {
        round,
        consensus,
        metaScores,
      },
      timestamp: new Date(),
    })
  }

  /**
   * Log payment processing
   */
  async logPaymentProcessing(taskId: string, judgeId: number, amount: number, txHash: string, status: string): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'payment_processed',
      data: {
        judgeId,
        amount,
        txHash,
        status,
      },
      timestamp: new Date(),
    })
  }

  /**
   * Log task completion
   */
  async logTaskCompletion(taskId: string, finalScore: number, consensusData: any): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'task_completed',
      data: {
        finalScore,
        consensusData,
      },
      timestamp: new Date(),
    })
  }

  /**
   * Log error events
   */
  async logError(taskId: string, error: string, context?: any): Promise<void> {
    await this.logEvent({
      taskId,
      event: 'error_occurred',
      data: {
        error,
        context,
      },
      timestamp: new Date(),
    })
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport(taskId: string): Promise<AuditReport> {
    try {
      console.log(`📊 Generating audit report for task ${taskId}...`)

      const auditLogs = await dbService.getAuditLogs(taskId)
      const task = await dbService.getTaskById(taskId)

      if (!task) {
        throw new Error('Task not found')
      }

      // Process events
      const events: AuditEvent[] = auditLogs.map(log => ({
        taskId: log.taskId,
        event: log.event,
        data: log.data,
        timestamp: log.createdAt,
        hcsMessageId: log.hcsMessageId || undefined,
      }))

      // Create timeline
      const timeline = events.map(event => ({
        timestamp: event.timestamp,
        event: event.event,
        description: this.getEventDescription(event.event, event.data),
      }))

      // Generate summary
      const summary = {
        taskCreated: events.some(e => e.event === 'task_created'),
        roundsCompleted: events.filter(e => e.event === 'round_started').length,
        consensusReached: events.some(e => e.event === 'consensus_calculated' && e.data?.consensus),
        paymentsProcessed: events.filter(e => e.event === 'payment_processed' && e.data?.status === 'settled').length,
        finalScore: task.finalScore || undefined,
      }

      const report: AuditReport = {
        taskId,
        totalEvents: events.length,
        events,
        timeline,
        summary,
      }

      console.log(`✅ Audit report generated for task ${taskId}`)
      return report
    } catch (error) {
      console.error(`❌ Failed to generate audit report for task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Get human-readable description for events
   */
  private getEventDescription(event: string, data: any): string {
    switch (event) {
      case 'task_created':
        return `Task created with ${data?.judges?.length || 0} judges, max ${data?.maxRounds || 3} rounds`
      case 'round_started':
        return `Round ${data?.round || 1} started`
      case 'score_submitted':
        return `Judge ${data?.judgeId} submitted score ${data?.score} for round ${data?.round}`
      case 'consensus_calculated':
        return `Consensus ${data?.consensus ? 'reached' : 'not reached'} for round ${data?.round}`
      case 'payment_processed':
        return `Payment of ${data?.amount} processed for judge ${data?.judgeId} (${data?.status})`
      case 'task_completed':
        return `Task completed with final score ${data?.finalScore}`
      case 'error_occurred':
        return `Error: ${data?.error}`
      case 'hcs_message_published':
        return `Event published to HCS (message ID: ${data?.hcsMessageId})`
      default:
        return `Event: ${event}`
    }
  }

  /**
   * Get audit logs for a specific time range
   */
  async getAuditLogsByTimeRange(startDate: Date, endDate: Date): Promise<AuditEvent[]> {
    // This would require a more complex query in the database service
    // For now, we'll get all logs and filter
    const allLogs = await dbService.getAuditLogs('') // Empty string to get all
    return allLogs
      .filter(log => log.createdAt >= startDate && log.createdAt <= endDate)
      .map(log => ({
        taskId: log.taskId,
        event: log.event,
        data: log.data,
        timestamp: log.createdAt,
        hcsMessageId: log.hcsMessageId || undefined,
      }))
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    recentActivity: number
    errorRate: number
  }> {
    const allLogs = await dbService.getAuditLogs('') // Empty string to get all
    
    const eventsByType: Record<string, number> = {}
    let errorCount = 0
    
    allLogs.forEach(log => {
      eventsByType[log.event] = (eventsByType[log.event] || 0) + 1
      if (log.event === 'error_occurred') {
        errorCount++
      }
    })

    const recentActivity = allLogs.filter(log => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return log.createdAt >= oneDayAgo
    }).length

    return {
      totalEvents: allLogs.length,
      eventsByType,
      recentActivity,
      errorRate: allLogs.length > 0 ? (errorCount / allLogs.length) * 100 : 0,
    }
  }

  /**
   * Export audit data for external analysis
   */
  async exportAuditData(taskId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const report = await this.generateAuditReport(taskId)
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2)
    } else {
      // Convert to CSV format
      const csvRows = [
        'Timestamp,Event,Description,Data',
        ...report.timeline.map(item => 
          `"${item.timestamp.toISOString()}","${item.event}","${item.description}","${JSON.stringify(item).replace(/"/g, '""')}"`
        )
      ]
      return csvRows.join('\n')
    }
  }
}

// Singleton instance
let auditService: AuditService | null = null

export function getAuditService(): AuditService {
  if (!auditService) {
    auditService = new AuditService()
  }
  return auditService
}
