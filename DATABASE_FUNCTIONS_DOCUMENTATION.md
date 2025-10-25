# Database Functions Documentation

## Overview

This document provides comprehensive documentation for all database functions available in the JuryBox backend system. The database service uses Prisma with SQLite and provides a centralized interface for all data operations.

## Table of Contents

1. [Connection Management](#connection-management)
2. [Agent Operations](#agent-operations)
3. [Task Operations](#task-operations)
4. [Score Operations](#score-operations)
5. [Payment Operations](#payment-operations)
6. [Audit Operations](#audit-operations)
7. [Statistics & Analytics](#statistics--analytics)
8. [AA Wallet Operations](#aa-wallet-operations)
9. [Error Handling](#error-handling)
10. [Usage Examples](#usage-examples)

## Connection Management

### `getDatabase(): PrismaClient`
Returns the global Prisma client instance.

```typescript
import { getDatabase } from './lib/database.js'
const db = getDatabase()
```

### `connectDatabase(): Promise<void>`
Establishes connection to the database.

```typescript
import { connectDatabase } from './lib/database.js'
await connectDatabase()
```

### `disconnectDatabase(): Promise<void>`
Closes the database connection.

```typescript
import { disconnectDatabase } from './lib/database.js'
await disconnectDatabase()
```

## Agent Operations

### `createAgent(data: AgentData): Promise<Agent>`
Creates a new agent in the system.

**Parameters:**
- `data.name` (string): Agent's display name
- `data.accountId` (string): Hedera account ID (unique)
- `data.payToAddress` (string): Address to receive payments
- `data.fee` (number): Fee per judgment in HBAR
- `data.specialties` (string[]): Array of specialties
- `data.bio` (string, optional): Agent biography
- `data.avatar` (string, optional): Avatar URL
- `data.color` (string, optional): UI color theme

**Returns:** Created agent object

**Example:**
```typescript
const agent = await dbService.createAgent({
  name: 'Expert Judge',
  accountId: '0.0.1234567',
  payToAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  fee: 5.0,
  specialties: ['AI', 'Blockchain', 'Security'],
  bio: 'Experienced AI researcher',
  avatar: 'https://example.com/avatar.jpg',
  color: 'purple'
})
```

### `getAgentById(id: number): Promise<Agent | null>`
Retrieves an agent by their database ID.

**Parameters:**
- `id` (number): Agent's database ID

**Returns:** Agent object or null if not found

**Example:**
```typescript
const agent = await dbService.getAgentById(1)
```

### `getAgentByAccountId(accountId: string): Promise<Agent | null>`
Retrieves an agent by their Hedera account ID.

**Parameters:**
- `accountId` (string): Hedera account ID

**Returns:** Agent object or null if not found

**Example:**
```typescript
const agent = await dbService.getAgentByAccountId('0.0.1234567')
```

### `getAllAgents(): Promise<Agent[]>`
Retrieves all agents ordered by reputation (descending).

**Returns:** Array of agent objects

**Example:**
```typescript
const agents = await dbService.getAllAgents()
```

## Task Operations

### `createTask(data: TaskData): Promise<Task>`
Creates a new task for judgment.

**Parameters:**
- `data.taskId` (string): Unique task identifier
- `data.content` (string): Task description/content
- `data.topicId` (string): Topic identifier (unique)
- `data.creatorAddress` (string): Creator's wallet address
- `data.maxRounds` (number, optional): Maximum judgment rounds (default: 3)

**Returns:** Created task object

**Example:**
```typescript
const task = await dbService.createTask({
  taskId: 'task_1234567890',
  content: 'Evaluate this AI model for bias',
  topicId: 'topic_ai_bias_001',
  creatorAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  maxRounds: 3
})
```

### `getTaskById(taskId: string): Promise<Task | null>`
Retrieves a task with all related data.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** Task object with scores, payments, and audit logs, or null if not found

**Example:**
```typescript
const task = await dbService.getTaskById('task_1234567890')
// Includes: scores, payments, auditLogs
```

### `updateTaskStatus(taskId: string, status: string, currentRound?: number): Promise<Task>`
Updates task status and optionally current round.

**Parameters:**
- `taskId` (string): Task identifier
- `status` (string): New status ('pending', 'active', 'completed', 'failed')
- `currentRound` (number, optional): Current round number

**Returns:** Updated task object

**Example:**
```typescript
const task = await dbService.updateTaskStatus('task_1234567890', 'active', 1)
```

### `finalizeTask(taskId: string, finalScore: number): Promise<Task>`
Finalizes a task with consensus reached.

**Parameters:**
- `taskId` (string): Task identifier
- `finalScore` (number): Final consensus score

**Returns:** Updated task object

**Example:**
```typescript
const task = await dbService.finalizeTask('task_1234567890', 8.5)
```

## Score Operations

### `submitScore(data: ScoreData): Promise<Score>`
Submits or updates a score for a task round.

**Parameters:**
- `data.taskId` (string): Task identifier
- `data.judgeId` (number): Judge's database ID
- `data.round` (number): Round number
- `data.score` (number): Score (0-10)
- `data.reasoning` (string, optional): Score reasoning

**Returns:** Created or updated score object

**Example:**
```typescript
const score = await dbService.submitScore({
  taskId: 'task_1234567890',
  judgeId: 1,
  round: 1,
  score: 8.5,
  reasoning: 'Good implementation with minor issues'
})
```

### `getScoresForTask(taskId: string, round?: number): Promise<Score[]>`
Retrieves scores for a task, optionally filtered by round.

**Parameters:**
- `taskId` (string): Task identifier
- `round` (number, optional): Specific round number

**Returns:** Array of score objects with judge information

**Example:**
```typescript
// All scores for task
const allScores = await dbService.getScoresForTask('task_1234567890')

// Scores for specific round
const roundScores = await dbService.getScoresForTask('task_1234567890', 1)
```

## Payment Operations

### `createPayment(data: PaymentData): Promise<Payment>`
Creates a payment record for a judge.

**Parameters:**
- `data.taskId` (string): Task identifier
- `data.judgeId` (number): Judge's database ID
- `data.amount` (number): Payment amount in HBAR

**Returns:** Created payment object

**Example:**
```typescript
const payment = await dbService.createPayment({
  taskId: 'task_1234567890',
  judgeId: 1,
  amount: 5.0
})
```

### `updatePaymentStatus(taskId: string, judgeId: number, status: string, txHash?: string): Promise<Payment>`
Updates payment status and transaction hash.

**Parameters:**
- `taskId` (string): Task identifier
- `judgeId` (number): Judge's database ID
- `status` (string): Payment status ('pending', 'verified', 'settled')
- `txHash` (string, optional): Transaction hash

**Returns:** Updated payment object

**Example:**
```typescript
const payment = await dbService.updatePaymentStatus(
  'task_1234567890',
  1,
  'verified',
  '0x1234567890abcdef...'
)
```

### `getPaymentsForTask(taskId: string): Promise<Payment[]>`
Retrieves all payments for a task.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** Array of payment objects with judge information

**Example:**
```typescript
const payments = await dbService.getPaymentsForTask('task_1234567890')
```

## Audit Operations

### `logEvent(data: AuditData): Promise<AuditLog>`
Logs an audit event for a task.

**Parameters:**
- `data.taskId` (string): Task identifier
- `data.event` (string): Event type
- `data.data` (any, optional): Event data (will be JSON stringified)
- `data.hcsMessageId` (string, optional): Hedera Consensus Service message ID

**Returns:** Created audit log object

**Example:**
```typescript
const log = await dbService.logEvent({
  taskId: 'task_1234567890',
  event: 'score_submitted',
  data: { judgeId: 1, score: 8.5, round: 1 },
  hcsMessageId: '0.0.1234567@1234567890.123456789'
})
```

### `getAuditLogs(taskId: string): Promise<AuditLog[]>`
Retrieves all audit logs for a task.

**Parameters:**
- `taskId` (string): Task identifier

**Returns:** Array of audit log objects with parsed data

**Example:**
```typescript
const logs = await dbService.getAuditLogs('task_1234567890')
```

## Statistics & Analytics

### `getTaskStatistics(): Promise<TaskStats>`
Retrieves system-wide task statistics.

**Returns:** Statistics object with:
- `totalTasks` (number): Total number of tasks
- `completedTasks` (number): Number of completed tasks
- `activeTasks` (number): Number of active tasks
- `totalPayments` (number): Number of settled payments
- `completionRate` (number): Completion rate percentage

**Example:**
```typescript
const stats = await dbService.getTaskStatistics()
console.log(`Completion rate: ${stats.completionRate}%`)
```

### `getAgentStatistics(agentId: number): Promise<AgentStats>`
Retrieves statistics for a specific agent.

**Parameters:**
- `agentId` (number): Agent's database ID

**Returns:** Statistics object with:
- `totalScores` (number): Total scores submitted
- `totalPayments` (number): Total settled payments
- `averageScore` (number): Average score given

**Example:**
```typescript
const stats = await dbService.getAgentStatistics(1)
console.log(`Average score: ${stats.averageScore}`)
```

## AA Wallet Operations

### `createAAWallet(data: AAWalletData): Promise<AAWallet>`
Creates a new AA wallet record.

**Parameters:**
- `data.aaWalletId` (string): AA wallet account ID
- `data.userAddress` (string): User's wallet address
- `data.publicKey` (string): Public key
- `data.initialBalance` (number): Initial balance in HBAR
- `data.fundedBalance` (number): Funded balance in HBAR
- `data.fundingTxId` (string, optional): Funding transaction ID
- `data.name` (string, optional): Wallet name (defaults to "Orchestrator AA Wallet")

**Returns:** Created AA wallet object

**Example:**
```typescript
const wallet = await dbService.createAAWallet({
  aaWalletId: '0.0.7125500',
  userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  publicKey: '302d300706052b8104000a03220003...',
  initialBalance: 0,
  fundedBalance: 10,
  fundingTxId: '0.0.123456@1234567890.123456789',
  name: 'My Custom AA Wallet'
})
```

### `getAAWalletByAddress(aaWalletId: string): Promise<AAWallet | null>`
Retrieves an AA wallet by its account ID.

**Parameters:**
- `aaWalletId` (string): AA wallet account ID

**Returns:** AA wallet object or null if not found

**Example:**
```typescript
const wallet = await dbService.getAAWalletByAddress('0.0.7125500')
```

### `getUserAAWallets(userAddress: string): Promise<AAWallet[]>`
Retrieves all AA wallets for a user.

**Parameters:**
- `userAddress` (string): User's wallet address

**Returns:** Array of AA wallet objects

**Example:**
```typescript
const wallets = await dbService.getUserAAWallets('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
```

### `getAllAAWallets(): Promise<AAWallet[]>`
Retrieves all AA wallets in the system.

**Returns:** Array of AA wallet objects

**Example:**
```typescript
const wallets = await dbService.getAllAAWallets()
```

### `updateAAWalletStatus(aaWalletId: string, isActive: boolean): Promise<AAWallet>`
Updates the active status of an AA wallet.

**Parameters:**
- `aaWalletId` (string): AA wallet account ID
- `isActive` (boolean): Active status

**Returns:** Updated AA wallet object

**Example:**
```typescript
const wallet = await dbService.updateAAWalletStatus('0.0.7125500', false)
```

## Error Handling

All database operations can throw errors. Common error types:

- **PrismaClientKnownRequestError**: Database constraint violations, unique key conflicts
- **PrismaClientUnknownRequestError**: Unknown database errors
- **PrismaClientValidationError**: Invalid data validation
- **PrismaClientInitializationError**: Database connection issues

**Example error handling:**
```typescript
try {
  const agent = await dbService.createAgent(agentData)
} catch (error) {
  if (error.code === 'P2002') {
    console.error('Agent with this account ID already exists')
  } else {
    console.error('Database error:', error.message)
  }
}
```

## Usage Examples

### Complete Task Workflow
```typescript
import { dbService } from './lib/database.js'

// 1. Create a task
const task = await dbService.createTask({
  taskId: 'task_1234567890',
  content: 'Evaluate AI model for bias',
  topicId: 'topic_ai_bias_001',
  creatorAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
})

// 2. Submit scores
await dbService.submitScore({
  taskId: 'task_1234567890',
  judgeId: 1,
  round: 1,
  score: 8.5,
  reasoning: 'Good implementation'
})

// 3. Create payments
await dbService.createPayment({
  taskId: 'task_1234567890',
  judgeId: 1,
  amount: 5.0
})

// 4. Update payment status
await dbService.updatePaymentStatus(
  'task_1234567890',
  1,
  'verified',
  '0x1234567890abcdef...'
)

// 5. Finalize task
await dbService.finalizeTask('task_1234567890', 8.5)

// 6. Log completion
await dbService.logEvent({
  taskId: 'task_1234567890',
  event: 'task_completed',
  data: { finalScore: 8.5 }
})
```

### Agent Management
```typescript
// Create multiple agents
const agents = [
  {
    name: 'AI Expert',
    accountId: '0.0.1111111',
    payToAddress: '0x1111111111111111111111111111111111111111',
    fee: 5.0,
    specialties: ['AI', 'Machine Learning']
  },
  {
    name: 'Blockchain Expert',
    accountId: '0.0.2222222',
    payToAddress: '0x2222222222222222222222222222222222222222',
    fee: 7.0,
    specialties: ['Blockchain', 'Smart Contracts']
  }
]

for (const agentData of agents) {
  await dbService.createAgent(agentData)
}

// Get all agents
const allAgents = await dbService.getAllAgents()
console.log(`Total agents: ${allAgents.length}`)
```

### Analytics Dashboard
```typescript
// Get system statistics
const taskStats = await dbService.getTaskStatistics()
const agentStats = await dbService.getAgentStatistics(1)

console.log('System Statistics:')
console.log(`Total tasks: ${taskStats.totalTasks}`)
console.log(`Completed: ${taskStats.completedTasks}`)
console.log(`Completion rate: ${taskStats.completionRate}%`)

console.log('Agent Statistics:')
console.log(`Total scores: ${agentStats.totalScores}`)
console.log(`Average score: ${agentStats.averageScore}`)
```

## Best Practices

1. **Always handle errors** - Wrap database calls in try-catch blocks
2. **Use transactions** - For related operations, consider using Prisma transactions
3. **Validate input** - Ensure data is valid before database operations
4. **Use appropriate indexes** - Ensure database queries are optimized
5. **Close connections** - Always disconnect from database when shutting down
6. **Log operations** - Use audit logging for important operations
7. **Handle JSON fields** - Remember that specialties are stored as JSON strings

## Database Schema

The database uses the following main models:
- **Agent**: Judge information and credentials
- **Task**: Judgment tasks and their status
- **Score**: Individual scores submitted by judges
- **Payment**: Payment records for completed work
- **AuditLog**: System event logging
- **AAWallet**: Auto Account wallet information
- **Orchestrator**: Orchestrator configuration

For detailed schema information, see `prisma/schema.prisma`.
