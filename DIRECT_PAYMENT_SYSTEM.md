# Direct Payment System

## Overview

The Direct Payment System replaces the allowance-based system with direct HBAR transfers using private keys. This approach simplifies payment processing by eliminating the need for pre-approved allowances and uses direct Hedera transfers.

## Key Changes

### ✅ Removed Components
- `lib/hedera/allowance-service.ts` - Allowance service
- `scripts/tests/test-allowance-fund-withdraw.ts` - Allowance tests
- `ALLOWANCE_SYSTEM_README.md` - Allowance documentation

### ✅ Added Components
- `lib/hedera/direct-payment-service.ts` - Direct payment service
- Updated orchestrator test endpoint
- Updated test scripts

## Direct Payment Service

### Features
- **Direct HBAR Transfers**: Uses private keys for immediate transfers
- **Batch Processing**: Handles multiple agent payments efficiently
- **Payment Tracking**: Creates and updates payment records
- **Error Handling**: Comprehensive error management
- **Transaction Verification**: Verifies payment status

### Core Methods

#### `transferHbar(fromAccountId, toAccountId, amount, fromPrivateKey, memo?)`
```typescript
const result = await directPaymentService.transferHbar(
  '0.0.7117763',           // From account
  '0.0.1234567',           // To account
  0.01,                     // Amount in HBAR
  fromPrivateKey,           // Private key
  'Payment to agent'        // Memo
)
```

#### `payAgent(fromAccountId, agentId, amount, fromPrivateKey, taskId?)`
```typescript
const result = await directPaymentService.payAgent(
  '0.0.7117763',           // From account
  1,                        // Agent ID
  0.01,                     // Amount in HBAR
  fromPrivateKey,           // Private key
  'task_123'                // Task ID
)
```

#### `payMultipleAgents(fromAccountId, agentIds, amount, fromPrivateKey, taskId?)`
```typescript
const result = await directPaymentService.payMultipleAgents(
  '0.0.7117763',           // From account
  [1, 2, 3],               // Agent IDs
  0.01,                     // Amount per agent
  fromPrivateKey,           // Private key
  'task_123'                // Task ID
)
```

## Updated Orchestrator Test

### Endpoint
**POST** `/api/orchestrator/test`

### Process Flow
1. **Create HCS Topic** - Using `HEDERA_ACCOUNT_ID_2`
2. **Create Orchestrator** - For coordination
3. **Create Test Task** - With topic linkage
4. **Fetch Agents** - From database
5. **Process Direct Payments** - Using private key
6. **Publish Coordination Message** - To HCS topic
7. **Generate Summary** - With results

### Request Body
```json
{
  "agentIds": [1, 2, 3],
  "paymentAmount": 0.01,
  "taskContent": "Test X402 payment coordination"
}
```

### Response
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
        "status": "completed",
        "txHash": "0x1234567890abcdef...",
        "message": "Direct HBAR transfer completed"
      }
    ]
  },
  "message": "X402 Payment Coordination Test Completed"
}
```

## Environment Variables

### Required
- `HEDERA_ACCOUNT_ID_2`: Secondary Hedera account for coordination
- `HEDERA_PRIVATE_KEY_2`: Private key for the secondary account

### Optional
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
    "taskContent": "Custom direct payment test"
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
    taskContent: 'Test direct payments'
  })
})

const result = await response.json()
console.log('Test Results:', result.testResults)
```

## Testing

### Run Test Script
```bash
bun run scripts/tests/test-x402-coordination.ts
```

### Expected Output
```
🧪 Testing X402 Payment Coordination with Direct Private Key
============================================================
📤 Sending test request...
   Agent IDs: 1, 2, 3
   Payment Amount: 0.01 HBAR per agent
   Task Content: Test X402 payment coordination with selected agents

✅ X402 Payment Coordination Test Completed!
📊 Test Results:
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
    "payments": [...]
  },
  "message": "X402 Payment Coordination Test Completed"
}
```

## Benefits of Direct Payment System

### ✅ Advantages
- **Simplified Architecture**: No need for allowance management
- **Immediate Transfers**: Direct HBAR transfers without pre-approval
- **Reduced Complexity**: Fewer moving parts and dependencies
- **Better Performance**: Faster payment processing
- **Easier Debugging**: Clear transaction flow

### ✅ Security
- **Private Key Control**: Direct control over payment execution
- **Transaction Verification**: Built-in transaction verification
- **Error Handling**: Comprehensive error management
- **Audit Trail**: Complete payment tracking

## Database Integration

### Payment Records
- **Creation**: Payment records created before transfer
- **Updates**: Status updated after transfer completion
- **Tracking**: Transaction hashes and verification timestamps
- **Error Logging**: Failed payment details stored

### Agent Management
- **Account Validation**: Verifies agent account IDs
- **Payment History**: Tracks all payments per agent
- **Status Updates**: Real-time payment status

## Error Handling

### Common Errors
- **Invalid Agent ID**: Agent not found in database
- **Missing Account ID**: Agent has no Hedera account
- **Insufficient Balance**: Not enough HBAR for transfer
- **Transaction Failure**: Hedera network issues
- **Private Key Issues**: Invalid or missing private key

### Error Response Format
```json
{
  "success": false,
  "error": "Payment failed",
  "message": "Agent with ID 1 has no account ID",
  "details": "Stack trace"
}
```

## Future Enhancements

### Planned Features
- **Multi-signature Support**: Multiple signers for payments
- **Payment Scheduling**: Delayed payment execution
- **Advanced Verification**: Enhanced transaction verification
- **Analytics**: Payment analytics and reporting
- **Integration**: Smart contract integration

### Performance Optimizations
- **Batch Processing**: Optimized batch transfers
- **Caching**: Payment status caching
- **Async Processing**: Background payment processing
- **Rate Limiting**: Hedera API rate limiting

## Migration Notes

### From Allowance System
1. **Remove Allowance Dependencies**: All allowance-related code removed
2. **Update Payment Logic**: Use direct transfers instead of allowances
3. **Environment Variables**: Add `HEDERA_PRIVATE_KEY_2`
4. **Test Updates**: Update all test scripts
5. **Documentation**: Update API documentation

### Backward Compatibility
- **API Endpoints**: Same endpoint structure
- **Response Format**: Compatible response format
- **Database Schema**: No schema changes required
- **Configuration**: Minimal configuration changes

## Support

For issues or questions about the Direct Payment System:
1. Check the test script output for detailed logs
2. Verify environment variables are set correctly
3. Ensure agent accounts exist in the database
4. Check Hedera network connectivity
5. Review private key configuration
