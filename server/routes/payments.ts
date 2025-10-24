/**
 * Payment Routes
 * Handles x402 payment protocol integration for agent services
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { 
  getX402Service, 
  x402PaymentRequiredException,
  type PaymentRequest,
  type PaymentResult,
  type PaymentVerification
} from '../../lib/x402/payment-service'

// Request/Response schemas
const paymentRequestSchema = {
  type: 'object',
  required: ['amount', 'currency', 'recipient', 'description'],
  properties: {
    amount: { type: 'number', minimum: 0 },
    currency: { type: 'string' },
    recipient: { type: 'string' },
    description: { type: 'string' },
    resource: { type: 'string' },
    metadata: { type: 'object' }
  }
}

const processPaymentSchema = {
  type: 'object',
  required: ['privateKey', 'paymentRequirements'],
  properties: {
    privateKey: { type: 'string' },
    paymentRequirements: { type: 'object' }
  }
}

const verifyPaymentSchema = {
  type: 'object',
  required: ['paymentPayload', 'requirements'],
  properties: {
    paymentPayload: { type: 'object' },
    requirements: { type: 'object' }
  }
}

export default async function paymentRoutes(fastify: FastifyInstance) {
  const x402Service = getX402Service()

  // Request payment for a service
  fastify.post('/request', {
    schema: {
      body: paymentRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        402: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            paymentRequired: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: PaymentRequest }>, reply: FastifyReply) => {
    try {
      const paymentRequest = request.body
      
      // This will throw x402PaymentRequiredException
      x402Service.requestPayment(paymentRequest)
      
      // This line should never be reached
      return reply.code(200).send({
        success: true,
        message: 'Payment processed successfully'
      })
    } catch (error) {
      // Handle x402 payment required exception
      if (error instanceof x402PaymentRequiredException) {
        return reply.code(402).send({
          error: 'Payment Required',
          paymentRequired: {
            price: error.price,
            payToAddress: error.payToAddress,
            resource: error.resource,
            description: error.description,
            metadata: error.metadata
          }
        })
      }
      
      // Handle other errors
      fastify.log.error('Payment request error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Process payment using x402 protocol
  fastify.post('/process', {
    schema: {
      body: processPaymentSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactionId: { type: 'string' },
            paymentPayload: { type: 'object' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Body: { privateKey: string; paymentRequirements: any } 
  }>, reply: FastifyReply) => {
    try {
      const { privateKey, paymentRequirements } = request.body
      
      const result = await x402Service.processPayment(privateKey, paymentRequirements)
      
      if (result.success) {
        return reply.code(200).send({
          success: true,
          transactionId: result.transactionId,
          paymentPayload: result.paymentPayload
        })
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      fastify.log.error('Payment processing error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment processing failed'
      })
    }
  })

  // Verify payment
  fastify.post('/verify', {
    schema: {
      body: verifyPaymentSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            isValid: { type: 'boolean' },
            payer: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Body: { paymentPayload: any; requirements: any } 
  }>, reply: FastifyReply) => {
    try {
      const { paymentPayload, requirements } = request.body
      
      const verification = await x402Service.verifyPayment(paymentPayload, requirements)
      
      return reply.code(200).send({
        success: true,
        isValid: verification.isValid,
        payer: verification.payer,
        error: verification.error
      })
    } catch (error) {
      fastify.log.error('Payment verification error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment verification failed'
      })
    }
  })

  // Settle payment
  fastify.post('/settle', {
    schema: {
      body: verifyPaymentSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactionId: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Body: { paymentPayload: any; requirements: any } 
  }>, reply: FastifyReply) => {
    try {
      const { paymentPayload, requirements } = request.body
      
      const result = await x402Service.settlePayment(paymentPayload, requirements)
      
      if (result.success) {
        return reply.code(200).send({
          success: true,
          transactionId: result.transactionId
        })
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      fastify.log.error('Payment settlement error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment settlement failed'
      })
    }
  })

  // Complete payment workflow (verify + settle)
  fastify.post('/complete', {
    schema: {
      body: verifyPaymentSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactionId: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Body: { paymentPayload: any; requirements: any } 
  }>, reply: FastifyReply) => {
    try {
      const { paymentPayload, requirements } = request.body
      
      const result = await x402Service.completePaymentWorkflow(paymentPayload, requirements)
      
      if (result.success) {
        return reply.code(200).send({
          success: true,
          transactionId: result.transactionId
        })
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error
        })
      }
    } catch (error) {
      fastify.log.error('Complete payment workflow error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Payment workflow failed'
      })
    }
  })

  // Get payment requirements from task
  fastify.post('/requirements', {
    schema: {
      body: {
        type: 'object',
        required: ['task'],
        properties: {
          task: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            requirements: { type: 'object' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { task: any } }>, reply: FastifyReply) => {
    try {
      const { task } = request.body
      
      const requirements = x402Service.getPaymentRequirements(task)
      
      if (requirements) {
        return reply.code(200).send({
          success: true,
          requirements
        })
      } else {
        return reply.code(400).send({
          success: false,
          error: 'No payment requirements found in task'
        })
      }
    } catch (error) {
      fastify.log.error('Get payment requirements error:', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to get payment requirements'
      })
    }
  })
}
