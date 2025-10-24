/**
 * Audit Routes
 * Handle audit logs and transparency reports
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getAuditService } from '../../lib/hedera/audit-service.js'
import { dbService } from '../../lib/database.js'

export default async function auditRoutes(fastify: FastifyInstance) {
  // Get audit logs for a specific task
  fastify.get('/:taskId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            auditLogs: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    try {
      const { taskId } = request.params
      
      const auditLogs = await dbService.getAuditLogs(taskId)
      
      return {
        success: true,
        auditLogs,
      }
    } catch (error) {
      fastify.log.error(`Failed to get audit logs for ${request.params.taskId}:`, error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs',
      })
    }
  })

  // Generate comprehensive audit report
  fastify.get('/:taskId/report', {
    schema: {
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
        },
        required: ['taskId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            report: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    try {
      const { taskId } = request.params
      
      const auditService = getAuditService()
      const report = await auditService.generateAuditReport(taskId)
      
      return {
        success: true,
        report,
      }
    } catch (error) {
      fastify.log.error(`Failed to generate audit report for ${request.params.taskId}:`, error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate audit report',
      })
    }
  })

  // Export audit data
  fastify.get('/:taskId/export', {
    schema: {
      params: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
        },
        required: ['taskId'],
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv'] },
        },
      },
      response: {
        200: {
          type: 'string',
        },
      },
    },
  }, async (request: FastifyRequest<{ 
    Params: { taskId: string }
    Querystring: { format?: 'json' | 'csv' }
  }>, reply: FastifyReply) => {
    try {
      const { taskId } = request.params
      const { format = 'json' } = request.query
      
      const auditService = getAuditService()
      const exportData = await auditService.exportAuditData(taskId, format)
      
      const contentType = format === 'json' ? 'application/json' : 'text/csv'
      const filename = `audit_${taskId}_${Date.now()}.${format}`
      
      reply.header('Content-Type', contentType)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      
      return exportData
    } catch (error) {
      fastify.log.error(`Failed to export audit data for ${request.params.taskId}:`, error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export audit data',
      })
    }
  })

  // Get audit statistics
  fastify.get('/statistics', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            statistics: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const auditService = getAuditService()
      const statistics = await auditService.getAuditStatistics()
      
      return {
        success: true,
        statistics,
      }
    } catch (error) {
      fastify.log.error('Failed to get audit statistics:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit statistics',
      })
    }
  })

  // Get audit logs by time range
  fastify.get('/logs/range', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['startDate', 'endDate'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            logs: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ 
    Querystring: { startDate: string; endDate: string }
  }>, reply: FastifyReply) => {
    try {
      const { startDate, endDate } = request.query
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid date format',
        })
      }
      
      const auditService = getAuditService()
      const logs = await auditService.getAuditLogsByTimeRange(start, end)
      
      return {
        success: true,
        logs,
      }
    } catch (error) {
      fastify.log.error('Failed to get audit logs by time range:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs',
      })
    }
  })
}
