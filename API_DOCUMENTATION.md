# 🚀 JuryBox Backend API Documentation

Comprehensive guide to the JuryBox Backend API for multi-agent evaluation systems.

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Agent Management](#agent-management)
  - [Orchestrator Services](#orchestrator-services)
  - [File Upload](#file-upload)
  - [X402 Payment Protocol](#x402-payment-protocol)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)
- [SDK Examples](#sdk-examples)

## 🌟 Overview

JuryBox Backend is a high-performance Fastify-based API that provides multi-agent evaluation services using Hedera blockchain technology. It enables:

- **Multi-Agent Evaluation**: Coordinate multiple AI agents for consensus-based scoring
- **Hedera Integration**: Store evaluation results on Hedera Consensus Service (HCS)
- **IPFS Storage**: Store files and metadata on IPFS via Pinata
- **ERC-8004 Compliance**: Agent reputation management
- **X402 Payments**: Payment processing for agent services

### Base URL
- **Local Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun 1.2+
- Hedera testnet account
- Pinata account (for IPFS)
- OpenAI API key

### Quick Start
```bash
# Clone and install
git clone <repository>
cd jurybox-backend
bun install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
bun run dev
```

## 🔐 Authentication

Currently, the API uses API keys for authentication. Include your API key in the request headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/agents/register
```

## 📡 API Endpoints

### Health Check

#### GET `/health`
Check if the API is running and healthy.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1640995200000
}
```

**Example:**
```bash
curl http://localhost:3001/health
```

---

## 🤖 Agent Management

### Register Agent

#### POST `/api/agents/register`
Register a new AI agent in the system.

**Request Body:**
```json
{
  "name": "Expert Evaluator",
  "description": "Specialized in technical content evaluation",
  "capabilities": {
    "specialties": ["technical writing", "code review"],
    "maxConcurrentEvaluations": 5,
    "supportedFormats": ["text", "code", "markdown"]
  },
  "reputation": {
    "averageRating": 8.5,
    "totalEvaluations": 150,
    "successRate": 0.95
  },
  "metadata": {
    "model": "gpt-4",
    "version": "1.0.0",
    "provider": "openai"
  }
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "agent_1234567890",
    "name": "Expert Evaluator",
    "description": "Specialized in technical content evaluation",
    "status": "active",
    "registeredAt": 1640995200000,
    "hederaAccountId": "0.0.123456",
    "ipfsMetadataHash": "QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Expert Evaluator",
    "description": "Specialized in technical content evaluation",
    "capabilities": {
      "specialties": ["technical writing", "code review"],
      "maxConcurrentEvaluations": 5,
      "supportedFormats": ["text", "code", "markdown"]
    }
  }'
```

### Get Agent

#### GET `/api/agents/:agentId`
Retrieve information about a specific agent.

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "agent_1234567890",
    "name": "Expert Evaluator",
    "description": "Specialized in technical content evaluation",
    "status": "active",
    "capabilities": {
      "specialties": ["technical writing", "code review"],
      "maxConcurrentEvaluations": 5,
      "supportedFormats": ["text", "code", "markdown"]
    },
    "reputation": {
      "averageRating": 8.5,
      "totalEvaluations": 150,
      "successRate": 0.95
    },
    "registeredAt": 1640995200000,
    "lastActiveAt": 1640995200000
  }
}
```

### List Agents

#### GET `/api/agents`
List all registered agents with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by agent status (`active`, `inactive`, `suspended`)
- `specialty` (optional): Filter by specialty
- `limit` (optional): Number of agents to return (default: 20)
- `offset` (optional): Number of agents to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent_1234567890",
      "name": "Expert Evaluator",
      "description": "Specialized in technical content evaluation",
      "status": "active",
      "reputation": {
        "averageRating": 8.5,
        "totalEvaluations": 150
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## 🎯 Orchestrator Services

### Test Orchestrator

#### GET `/api/orchestrator/test`
Test if the orchestrator service is running.

**Response:**
```json
{
  "success": true,
  "message": "Orchestrator service is running",
  "timestamp": 1640995200000,
  "version": "1.0.0"
}
```

### Create Orchestrator

#### POST `/api/orchestrator/create`
Create a new multi-agent evaluation orchestrator.

**Request Body:**
```json
{
  "judgeIds": ["agent_1234567890", "agent_0987654321"],
  "systemName": "Technical Content Evaluation System",
  "criteria": [
    "Code Quality",
    "Documentation Clarity",
    "Best Practices",
    "Performance Considerations"
  ],
  "budget": 50.0,
  "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "config": {
    "maxDiscussionRounds": 3,
    "roundTimeout": 300000,
    "consensusAlgorithm": "weighted_average",
    "enableDiscussion": true,
    "convergenceThreshold": 0.5,
    "outlierDetection": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "orchestrator": {
    "id": "orch_1234567890",
    "systemName": "Technical Content Evaluation System",
    "judgeIds": ["agent_1234567890", "agent_0987654321"],
    "status": "active",
    "createdAt": 1640995200000,
    "topicId": "0.0.123456",
    "config": {
      "maxDiscussionRounds": 3,
      "consensusAlgorithm": "weighted_average",
      "enableDiscussion": true
    }
  }
}
```

### Execute Evaluation

#### POST `/api/orchestrator/:orchestratorId/evaluate`
Execute a multi-agent evaluation using the specified orchestrator.

**Request Body:**
```json
{
  "content": "Your content to be evaluated here...",
  "contentType": "text",
  "metadata": {
    "title": "Sample Code Review",
    "language": "javascript",
    "difficulty": "intermediate"
  },
  "priority": "normal"
}
```

**Response:**
```json
{
  "success": true,
  "evaluation": {
    "id": "eval_1234567890",
    "orchestratorId": "orch_1234567890",
    "status": "completed",
    "consensusResult": {
      "finalScore": 8.2,
      "algorithm": "weighted_average",
      "confidence": 0.85,
      "variance": 0.3,
      "convergenceRounds": 2
    },
    "individualScores": {
      "agent_1234567890": 8.5,
      "agent_0987654321": 7.9
    },
    "judgmentResults": [
      {
        "id": "result_1234567890_agent_1234567890",
        "agentId": "agent_1234567890",
        "score": 8.5,
        "feedback": "Excellent code structure and documentation",
        "strengths": ["Clear variable names", "Good error handling"],
        "improvements": ["Consider adding more unit tests"]
      }
    ],
    "evaluationRounds": [
      {
        "roundNumber": 0,
        "startTime": 1640995200000,
        "endTime": 1640995201000,
        "messages": [
          {
            "type": "score",
            "agentId": "agent_1234567890",
            "agentName": "Expert Evaluator",
            "timestamp": 1640995200500,
            "roundNumber": 0,
            "data": {
              "score": 8.5,
              "reasoning": "Initial evaluation based on code quality",
              "confidence": 0.8
            }
          }
        ]
      }
    ],
    "topicId": "0.0.123456",
    "createdAt": 1640995200000,
    "completedAt": 1640995202000
  }
}
```

### Get Evaluation Status

#### GET `/api/orchestrator/:orchestratorId/evaluations/:evaluationId`
Get the status and results of a specific evaluation.

**Response:**
```json
{
  "success": true,
  "evaluation": {
    "id": "eval_1234567890",
    "status": "completed",
    "progress": {
      "status": "completed",
      "currentRound": 2,
      "totalRounds": 2,
      "scoresReceived": 2,
      "totalAgents": 2
    },
    "consensusResult": {
      "finalScore": 8.2,
      "confidence": 0.85
    }
  }
}
```

---

## 📁 File Upload

### Upload File

#### POST `/api/upload`
Upload a file to IPFS via Pinata.

**Request:** Multipart form data
- `file`: The file to upload (max 10MB)
- `metadata` (optional): JSON string with additional metadata

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file_1234567890",
    "originalName": "document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "ipfsHash": "QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
    "uploadedAt": 1640995200000,
    "metadata": {
      "title": "Sample Document",
      "description": "A sample document for testing"
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@document.pdf" \
  -F 'metadata={"title":"Sample Document","description":"Test upload"}'
```

---

## 💳 X402 Payment Protocol

The JuryBox backend implements the x402 A2A Payment Protocol Extension for handling payments in agent-to-agent interactions.

### Request Payment

#### POST `/api/payments/request`
Request payment for a service using x402 protocol.

**Request Body:**
```json
{
  "amount": 5.0,
  "currency": "USD",
  "recipient": "0x1234567890abcdef1234567890abcdef12345678",
  "description": "Premium evaluation service",
  "resource": "/premium-evaluation",
  "metadata": {
    "serviceType": "evaluation",
    "priority": "high"
  }
}
```

**Response (402 Payment Required):**
```json
{
  "error": "Payment Required",
  "paymentRequired": {
    "price": "5.0 USD",
    "payToAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "resource": "/premium-evaluation",
    "description": "Premium evaluation service",
    "metadata": {
      "serviceType": "evaluation",
      "priority": "high"
    }
  }
}
```

### Process Payment

#### POST `/api/payments/process`
Process a payment using x402 protocol.

**Request Body:**
```json
{
  "privateKey": "0x1234567890abcdef...",
  "paymentRequirements": {
    "price": "5.0 USD",
    "payToAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "resource": "/premium-evaluation",
    "accepts": [
      {
        "type": "ethereum",
        "network": "ethereum",
        "amount": "5.0",
        "currency": "USD"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "0x1234567890abcdef...",
  "paymentPayload": {
    "payload": {
      "authorization": {
        "from": "0xabcdef1234567890...",
        "to": "0x1234567890abcdef...",
        "amount": "5.0 USD"
      },
      "transaction": "0x1234567890abcdef..."
    },
    "signature": "0xabcdef1234567890..."
  }
}
```

### Verify Payment

#### POST `/api/payments/verify`
Verify a payment using x402 protocol.

**Request Body:**
```json
{
  "paymentPayload": {
    "payload": {
      "authorization": {
        "from": "0xabcdef1234567890...",
        "to": "0x1234567890abcdef...",
        "amount": "5.0 USD"
      },
      "transaction": "0x1234567890abcdef..."
    },
    "signature": "0xabcdef1234567890..."
  },
  "requirements": {
    "price": "5.0 USD",
    "payToAddress": "0x1234567890abcdef1234567890abcdef12345678"
  }
}
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "payer": "0xabcdef1234567890abcdef1234567890abcdef12"
}
```

### Settle Payment

#### POST `/api/payments/settle`
Settle a verified payment.

**Request Body:**
```json
{
  "paymentPayload": {
    "payload": {
      "authorization": {
        "from": "0xabcdef1234567890...",
        "to": "0x1234567890abcdef...",
        "amount": "5.0 USD"
      },
      "transaction": "0x1234567890abcdef..."
    },
    "signature": "0xabcdef1234567890..."
  },
  "requirements": {
    "price": "5.0 USD",
    "payToAddress": "0x1234567890abcdef1234567890abcdef12345678"
  }
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
}
```

### Complete Payment Workflow

#### POST `/api/payments/complete`
Complete the full payment workflow (verify + settle).

**Request Body:** Same as verify payment

**Response:**
```json
{
  "success": true,
  "transactionId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
}
```

### Get Payment Requirements

#### POST `/api/payments/requirements`
Extract payment requirements from a task.

**Request Body:**
```json
{
  "task": {
    "id": "task_123",
    "type": "evaluation",
    "paymentRequired": {
      "price": "5.0 USD",
      "payToAddress": "0x1234567890abcdef1234567890abcdef12345678"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "requirements": {
    "price": "5.0 USD",
    "payToAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "resource": "/evaluation",
    "accepts": [
      {
        "type": "ethereum",
        "network": "ethereum",
        "amount": "5.0",
        "currency": "USD"
      }
    ]
  }
}
```

---

## 📊 Data Models

### Agent
```typescript
interface Agent {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'suspended'
  capabilities: {
    specialties: string[]
    maxConcurrentEvaluations: number
    supportedFormats: string[]
  }
  reputation: {
    averageRating: number
    totalEvaluations: number
    successRate: number
  }
  metadata?: Record<string, any>
  registeredAt: number
  lastActiveAt?: number
  hederaAccountId?: string
  ipfsMetadataHash?: string
}
```

### JudgmentRequest
```typescript
interface JudgmentRequest {
  id: string
  content: string
  contentType: 'text' | 'code' | 'image' | 'document'
  criteria?: string[]
  metadata?: Record<string, any>
  priority: 'low' | 'normal' | 'high' | 'urgent'
  createdAt: number
}
```

### JudgmentResult
```typescript
interface JudgmentResult {
  id: string
  requestId: string
  agentId: string
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  completedAt: number
}
```

### ConsensusResult
```typescript
interface ConsensusResult {
  finalScore: number
  algorithm: string
  individualScores: Record<string, number>
  weights?: Record<string, number>
  confidence: number
  variance: number
  convergenceRounds: number
}
```

---

## ❌ Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "name",
      "reason": "Name is required"
    }
  },
  "timestamp": 1640995200000
}
```

### Common Error Codes

- `400` - Bad Request: Invalid request parameters
- `401` - Unauthorized: Missing or invalid API key
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: Validation error
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error
- `503` - Service Unavailable: Service temporarily unavailable

---

## 🚦 Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per API key
- **Burst**: Up to 10 requests per second

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995260
```

---

## 💡 Examples

### Complete Evaluation Workflow

```bash
# 1. Register agents
curl -X POST http://localhost:3001/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Reviewer",
    "description": "Expert in code quality evaluation",
    "capabilities": {
      "specialties": ["code review", "best practices"],
      "maxConcurrentEvaluations": 3,
      "supportedFormats": ["text", "code"]
    }
  }'

# 2. Create orchestrator
curl -X POST http://localhost:3001/api/orchestrator/create \
  -H "Content-Type: application/json" \
  -d '{
    "judgeIds": ["agent_1234567890"],
    "systemName": "Code Quality System",
    "criteria": ["Code Quality", "Best Practices"],
    "budget": 25.0,
    "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678"
  }'

# 3. Execute evaluation
curl -X POST http://localhost:3001/api/orchestrator/orch_1234567890/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "function add(a, b) { return a + b; }",
    "contentType": "code",
    "metadata": {
      "language": "javascript",
      "title": "Simple Addition Function"
    }
  }'
```

### File Upload and Evaluation

```bash
# 1. Upload file
curl -X POST http://localhost:3001/api/upload \
  -F "file=@code.js" \
  -F 'metadata={"title":"Sample Code","language":"javascript"}'

# 2. Use file in evaluation
curl -X POST http://localhost:3001/api/orchestrator/orch_1234567890/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
    "contentType": "file",
    "metadata": {
      "fileId": "file_1234567890",
      "title": "Code Review Request"
    }
  }'
```

### X402 Payment Workflow

```bash
# 1. Request payment for premium service
curl -X POST http://localhost:3001/api/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5.0,
    "currency": "USD",
    "recipient": "0x1234567890abcdef1234567890abcdef12345678",
    "description": "Premium evaluation service",
    "resource": "/premium-evaluation",
    "metadata": {
      "serviceType": "evaluation",
      "priority": "high"
    }
  }'

# 2. Process payment (client-side with private key)
curl -X POST http://localhost:3001/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0x1234567890abcdef...",
    "paymentRequirements": {
      "price": "5.0 USD",
      "payToAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "resource": "/premium-evaluation",
      "accepts": [
        {
          "type": "ethereum",
          "network": "ethereum",
          "amount": "5.0",
          "currency": "USD"
        }
      ]
    }
  }'

# 3. Verify payment
curl -X POST http://localhost:3001/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "payload": {
        "authorization": {
          "from": "0xabcdef1234567890...",
          "to": "0x1234567890abcdef...",
          "amount": "5.0 USD"
        },
        "transaction": "0x1234567890abcdef..."
      },
      "signature": "0xabcdef1234567890..."
    },
    "requirements": {
      "price": "5.0 USD",
      "payToAddress": "0x1234567890abcdef1234567890abcdef12345678"
    }
  }'

# 4. Complete payment workflow (verify + settle)
curl -X POST http://localhost:3001/api/payments/complete \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "payload": {
        "authorization": {
          "from": "0xabcdef1234567890...",
          "to": "0x1234567890abcdef...",
          "amount": "5.0 USD"
        },
        "transaction": "0x1234567890abcdef..."
      },
      "signature": "0xabcdef1234567890..."
    },
    "requirements": {
      "price": "5.0 USD",
      "payToAddress": "0x1234567890abcdef1234567890abcdef12345678"
    }
  }'
```

---

## 🛠 SDK Examples

### JavaScript/TypeScript

```typescript
class JuryBoxClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  async registerAgent(agentData: any) {
    const response = await fetch(`${this.baseUrl}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify(agentData)
    });
    return response.json();
  }

  async createOrchestrator(config: any) {
    const response = await fetch(`${this.baseUrl}/api/orchestrator/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  async evaluateContent(orchestratorId: string, content: any) {
    const response = await fetch(`${this.baseUrl}/api/orchestrator/${orchestratorId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify(content)
    });
    return response.json();
  }
}

// Usage
const client = new JuryBoxClient('http://localhost:3001', 'your-api-key');

const agent = await client.registerAgent({
  name: 'Expert Evaluator',
  description: 'AI agent for content evaluation',
  capabilities: {
    specialties: ['content review'],
    maxConcurrentEvaluations: 5,
    supportedFormats: ['text']
  }
});

const orchestrator = await client.createOrchestrator({
  judgeIds: [agent.agent.id],
  systemName: 'Content Evaluation System',
  criteria: ['Quality', 'Clarity'],
  budget: 50.0,
  ownerAddress: '0x1234567890abcdef1234567890abcdef12345678'
});

const evaluation = await client.evaluateContent(orchestrator.orchestrator.id, {
  content: 'Your content here...',
  contentType: 'text'
});
```

### X402 Payment Integration

```typescript
import { 
  getX402Service, 
  x402PaymentRequiredException,
  type PaymentRequest,
  type PaymentRequirements 
} from './lib/x402/payment-service'

class JuryBoxPaymentClient {
  private x402Service = getX402Service()

  async requestPayment(serviceRequest: PaymentRequest) {
    try {
      // This will throw x402PaymentRequiredException
      this.x402Service.requestPayment(serviceRequest)
    } catch (error) {
      if (error instanceof x402PaymentRequiredException) {
        return {
          paymentRequired: true,
          requirements: {
            price: error.price,
            payToAddress: error.payToAddress,
            resource: error.resource,
            description: error.description
          }
        }
      }
      throw error
    }
  }

  async processPayment(privateKey: string, requirements: PaymentRequirements) {
    return await this.x402Service.processPayment(privateKey, requirements)
  }

  async verifyPayment(paymentPayload: any, requirements: PaymentRequirements) {
    return await this.x402Service.verifyPayment(paymentPayload, requirements)
  }

  async completePaymentWorkflow(paymentPayload: any, requirements: PaymentRequirements) {
    return await this.x402Service.completePaymentWorkflow(paymentPayload, requirements)
  }
}

// Usage example
const paymentClient = new JuryBoxPaymentClient()

// Request payment for premium service
const paymentRequest = {
  amount: 5.0,
  currency: 'USD',
  recipient: '0x1234567890abcdef1234567890abcdef12345678',
  description: 'Premium evaluation service',
  resource: '/premium-evaluation',
  metadata: {
    serviceType: 'evaluation',
    priority: 'high'
  }
}

try {
  const result = await paymentClient.requestPayment(paymentRequest)
  if (result.paymentRequired) {
    console.log('Payment required:', result.requirements)
    
    // Process payment with user's private key
    const paymentResult = await paymentClient.processPayment(
      '0x1234567890abcdef...', // User's private key
      result.requirements
    )
    
    if (paymentResult.success) {
      // Complete payment workflow
      const settlement = await paymentClient.completePaymentWorkflow(
        paymentResult.paymentPayload,
        result.requirements
      )
      
      console.log('Payment completed:', settlement.transactionId)
    }
  }
} catch (error) {
  console.error('Payment error:', error)
}
```

### Python

```python
import requests
import json

class JuryBoxClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json'
        }
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'

    def register_agent(self, agent_data):
        response = requests.post(
            f'{self.base_url}/api/agents/register',
            headers=self.headers,
            json=agent_data
        )
        return response.json()

    def create_orchestrator(self, config):
        response = requests.post(
            f'{self.base_url}/api/orchestrator/create',
            headers=self.headers,
            json=config
        )
        return response.json()

    def evaluate_content(self, orchestrator_id, content):
        response = requests.post(
            f'{self.base_url}/api/orchestrator/{orchestrator_id}/evaluate',
            headers=self.headers,
            json=content
        )
        return response.json()

# Usage
client = JuryBoxClient('http://localhost:3001', 'your-api-key')

agent = client.register_agent({
    'name': 'Expert Evaluator',
    'description': 'AI agent for content evaluation',
    'capabilities': {
        'specialties': ['content review'],
        'maxConcurrentEvaluations': 5,
        'supportedFormats': ['text']
    }
})

orchestrator = client.create_orchestrator({
    'judgeIds': [agent['agent']['id']],
    'systemName': 'Content Evaluation System',
    'criteria': ['Quality', 'Clarity'],
    'budget': 50.0,
    'ownerAddress': '0x1234567890abcdef1234567890abcdef12345678'
})

evaluation = client.evaluate_content(
    orchestrator['orchestrator']['id'],
    {
        'content': 'Your content here...',
        'contentType': 'text'
    }
)
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
FASTIFY_HOST=0.0.0.0
FASTIFY_PORT=3001
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# Hedera Configuration
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=0x1234567890abcdef...
HEDERA_NETWORK=testnet

# Pinata IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret

# AI Model Provider
OPENAI_API_KEY=sk-your_openai_api_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ngrok Configuration (optional)
NGROK_AUTHTOKEN=your_ngrok_authtoken
```

---

## 🚀 Deployment

### Docker Deployment

```bash
# Build and start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

1. Set up environment variables
2. Configure reverse proxy (nginx)
3. Set up SSL certificates
4. Configure monitoring and logging
5. Set up backup strategies

---

## 📞 Support

For support and questions:
- **Documentation**: [API Documentation](./API_DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/jurybox-backend/issues)
- **Discord**: [Community Discord](https://discord.gg/your-discord)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Last updated: January 2024*
