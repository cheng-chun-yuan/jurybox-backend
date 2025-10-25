# X402 Payment Coordination Test API

## Overview

The X402 Payment Coordination Test API allows you to test the complete flow of creating a Hedera Consensus Service (HCS) topic, coordinating payments to selected agents, and publishing coordination messages. This endpoint uses `HEDERA_ACCOUNT_ID_2` as the coordinator.

## Endpoint

**POST** `/api/orchestrator/test`

## Request Body

```json
{
  "agentIds": [1, 2, 3],
  "paymentAmount": 0.01,
  "taskContent": "Test task for X402 payment coordination"
}
```

### Parameters

- `agentIds` (number[], optional): Array of agent IDs to pay (default: [1, 2, 3])
- `paymentAmount` (number, optional): Payment amount in HBAR per agent (default: 0.01)
- `taskContent` (string, optional): Content of the test task (default: "Test task for X402 payment coordination")

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "testResults": {
    "topicId": "0.0.1234567",
    "orchestratorId": "test_orchestrator_1761386355374",
    "taskId": "test_task_1761386355374",
    "totalAgents": 3,
    "totalAmount": 0.03,
    "successfulPayments": 3,
    "failedPayments": 0,
    "payments": [
      {
        "agentId": 1,
        "agentName": "Dr. Alex Chen",
        "accountId": "0.0.1111111",
        "payToAddress": "0x1111111111111111111111111111111111111111",
        "amount": 0.01,
        "paymentId": 1,
        "status": "pending",
        "txHash": "0x1234567890abcdef...",
        "message": "X402 payment initiated"
      }
    ]
  },
  "message": "X402 Payment Coordination Test Completed"
}
```

### Error Response (500 Internal Server Error)
```json
{
  "success": false,
  "error": "X402 Payment Coordination Test Failed",
  "message": "Error details",
  "details": "Stack trace"
}
```

## Process Flow

### Step 1: Create HCS Topic
- Creates a new Hedera Consensus Service topic
- Uses `HEDERA_ACCOUNT_ID_2` as the topic creator
- Returns topic ID for coordination

### Step 2: Create Orchestrator
- Creates an orchestrator instance for `HEDERA_ACCOUNT_ID_2`
- Configures payment parameters and agent selection
- Stores orchestrator configuration

### Step 3: Create Test Task
- Creates a test task in the database
- Links task to the created topic
- Sets `HEDERA_ACCOUNT_ID_2` as the creator

### Step 4: Fetch Selected Agents
- Retrieves agent information from database
- Validates agent IDs and payment addresses
- Prepares payment data

### Step 5: Create X402 Payments
- Creates payment records for each selected agent
- Simulates X402 payment initiation
- Generates mock transaction hashes
- Tracks payment status

### Step 6: Publish Coordination Message
- Publishes coordination message to HCS topic
- Includes payment details and status
- Enables other participants to track progress

### Step 7: Generate Summary
- Compiles test results and statistics
- Returns comprehensive test report
- Logs all operations for debugging

## HCS Coordination Message

The system publishes a coordination message to the HCS topic with the following structure:

```json
{
  "type": "x402_payment_coordination",
  "taskId": "test_task_1761386355374",
  "orchestratorId": "test_orchestrator_1761386355374",
  "totalAgents": 3,
  "totalAmount": 0.03,
  "payments": [
    {
      "agentId": 1,
      "amount": 0.01,
      "status": "pending",
      "txHash": "0x1234567890abcdef..."
    }
  ],
  "timestamp": 1761386355374
}
```

## Database Operations

### Created Records
- **Topic**: HCS topic for coordination
- **Orchestrator**: Coordinator configuration
- **Task**: Test task with topic linkage
- **Payments**: Payment records for each agent

### Updated Records
- **Agents**: Payment status and transaction hashes
- **Audit Logs**: Coordination events and messages

## Environment Variables

- `HEDERA_ACCOUNT_ID_2`: Secondary Hedera account for coordination
- `HEDERA_PRIVATE_KEY_2`: Private key for `HEDERA_ACCOUNT_ID_2`
- `BACKEND_URL`: Backend URL for API calls

## Usage Examples

### Basic Test
```bash
curl -X POST http://localhost:10000/api/orchestrator/test \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Custom Configuration
```bash
curl -X POST http://localhost:10000/api/orchestrator/test \
  -H "Content-Type: application/json" \
  -d '{
    "agentIds": [1, 2, 3, 4, 5],
    "paymentAmount": 0.05,
    "taskContent": "Custom X402 coordination test"
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/orchestrator/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentIds: [1, 2, 3],
    paymentAmount: 0.01,
    taskContent: 'Test X402 coordination'
  })
})

const result = await response.json()
console.log('Test Results:', result.testResults)
```

### Python
```python
import requests

response = requests.post('/api/orchestrator/test', json={
    'agentIds': [1, 2, 3],
    'paymentAmount': 0.01,
    'taskContent': 'Test X402 coordination'
})

result = response.json()
print('Test Results:', result['testResults'])
```

## Testing

Run the test script to verify the API:

```bash
bun run scripts/tests/test-x402-coordination.ts
```

## Monitoring and Debugging

### Console Output
The endpoint provides detailed console logging:
- Step-by-step progress
- Agent information and payment details
- Transaction hashes and status updates
- Error messages and stack traces

### HCS Topic Monitoring
- Monitor the created topic for coordination messages
- Track payment status updates
- Verify message integrity and timing

### Database Verification
- Check created records in database
- Verify payment status and amounts
- Review audit logs for coordination events

## Error Handling

- Validates agent IDs exist in database
- Handles HCS topic creation failures
- Manages payment processing errors
- Provides detailed error messages
- Logs all operations for debugging

## Security Considerations

- Uses `HEDERA_ACCOUNT_ID_2` for coordination
- Validates agent payment addresses
- Generates secure transaction hashes
- Logs all operations for audit
- Handles sensitive payment data securely

## Integration Notes

- Compatible with existing X402 payment protocol
- Integrates with Hedera Consensus Service
- Uses database for state management
- Supports multiple agent payments
- Enables real-time coordination

## Future Enhancements

- Real X402 payment processing
- Multi-signature coordination
- Advanced payment scheduling
- Integration with smart contracts
- Enhanced monitoring and analytics
