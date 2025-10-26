# Feedback API - Request Examples

## Overview
When users call the orchestrator to evaluate content with AI judges, they can provide their wallet address to receive pre-signed feedback authorization tokens. These tokens allow them to submit feedback directly on-chain via the frontend.

---

## New Input Format

### POST /api/orchestrator/evaluate

**Request Body:**
```json
{
  "request": {
    "id": "eval_123",
    "content": "Your content to evaluate...",
    "criteria": ["Accuracy", "Clarity", "Completeness"],
    "selectedAgents": [
      {
        "id": "13",
        "name": "Dr. Academic",
        // ... other agent fields
      }
    ],
    "requestedBy": "0.0.7117762",
    "createdAt": 1234567890,
    "status": "pending"
  },
  "config": {
    "maxDiscussionRounds": 3,
    "roundTimeout": 60000,
    "consensusAlgorithm": "weighted_average",
    "enableDiscussion": true,
    "convergenceThreshold": 0.5,
    "outlierDetection": true
  },
  "userWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
}
```

**Response:**
```json
{
  "evaluationId": "eval_123",
  "status": "started",
  "topicId": "0.0.5047483",
  "message": "Evaluation started successfully",
  "feedback": {
    "message": "After evaluation completes, you can submit feedback for judges",
    "submitEndpoint": "Direct submission via blockchain (use frontend with viem)",
    "getReputationEndpoint": "/api/feedback/:agentId",
    "userWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "feedbackAuths": [
      {
        "agentId": 13,
        "agentName": "Dr. Academic",
        "feedbackAuth": {
          "agentId": "13",
          "clientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
          "indexFrom": "0",
          "indexTo": "10",
          "expiry": "1730088000",
          "expiryDate": "2025-10-29T08:00:00.000Z",
          "signature": "0x1234567890abcdef..."
        }
      }
    ]
  }
}
```

---

### POST /api/orchestrator/test

**Request Body:**
```json
{
  "agentIds": [13, 14, 15],
  "maxRounds": 2,
  "consensusAlgorithm": "weighted_average",
  "content": "Evaluate this test content for quality and accuracy.",
  "criteria": ["Accuracy", "Clarity", "Completeness", "Relevance"],
  "userWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
}
```

**Response:**
```json
{
  "success": true,
  "evaluationId": "eval_test_1730000000000",
  "topicId": "0.0.5047484",
  "status": "started",
  "message": "Multi-agent orchestrator test started successfully...",
  "feedback": {
    "message": "After evaluation completes, you can submit feedback for judges using the provided auth tokens",
    "submitEndpoint": "Direct submission via blockchain (use frontend with viem)",
    "getReputationEndpoint": "/api/feedback/:agentId",
    "userWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "feedbackAuths": [
      {
        "agentId": 13,
        "agentName": "Dr. Academic",
        "feedbackAuth": {
          "agentId": "13",
          "clientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
          "indexFrom": "0",
          "indexTo": "10",
          "expiry": "1730259200",
          "expiryDate": "2025-10-30T08:00:00.000Z",
          "signature": "0xabcdef1234567890..."
        }
      },
      {
        "agentId": 14,
        "agentName": "Creative Maven",
        "feedbackAuth": {
          "agentId": "14",
          "clientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
          "indexFrom": "0",
          "indexTo": "10",
          "expiry": "1730259200",
          "expiryDate": "2025-10-30T08:00:00.000Z",
          "signature": "0x9876543210fedcba..."
        }
      }
    ]
  }
}
```

---

## Without Wallet Address

If you don't provide `userWalletAddress`, the response will not include feedback auth:

**Request:**
```json
{
  "agentIds": [13, 14, 15],
  "content": "Evaluate this content"
}
```

**Response:**
```json
{
  "success": true,
  "evaluationId": "eval_test_1730000000000",
  "topicId": "0.0.5047485",
  "status": "started",
  "message": "Multi-agent orchestrator test started successfully...",
  "feedback": {
    "message": "To enable feedback submission, provide userWalletAddress in the request",
    "example": {
      "userWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
    }
  }
}
```

---

## Frontend Integration

### 1. Connect Wallet & Get Address
```typescript
import { useAccount } from 'wagmi'

const { address } = useAccount()
// address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
```

### 2. Submit Evaluation with Wallet Address
```typescript
const response = await fetch('http://localhost:10000/api/orchestrator/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentIds: [13, 14, 15],
    content: "My content to evaluate",
    userWalletAddress: address // Include connected wallet
  })
})

const data = await response.json()
// Store feedbackAuths for later use
const { feedbackAuths } = data.feedback
```

### 3. Submit Feedback On-Chain (Using Viem)
```typescript
import { writeContract } from 'wagmi/actions'

// After evaluation completes and user wants to leave feedback
for (const auth of feedbackAuths) {
  await writeContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: reputationRegistryAbi,
    functionName: 'submitFeedback',
    args: [
      BigInt(auth.agentId),
      BigInt(rating), // 0-100
      comment,
      // Include auth signature
      auth.feedbackAuth.signature
    ]
  })
}
```

---

## API Endpoints Summary

### Orchestrator Endpoints
- `POST /api/orchestrator/evaluate` - Start evaluation (with optional userWalletAddress)
- `POST /api/orchestrator/test` - Test evaluation (with optional userWalletAddress)
- `GET /api/orchestrator/progress/:evaluationId` - Get evaluation progress
- `GET /api/orchestrator/result/:evaluationId` - Get final result

### Feedback Endpoints
- `POST /api/feedback/auth/generate` - Manually generate feedback auth
- `GET /api/feedback/:agentId` - Get agent reputation
- `POST /api/feedback/verify` - Verify feedback auth signature

---

## Notes

1. **Wallet Address Format**: Must be a valid EVM address (0x followed by 40 hex characters)
2. **Auth Expiry**: Feedback auth tokens expire after 72 hours by default
3. **On-Chain Submission**: Actual feedback submission happens directly on blockchain via frontend
4. **Reputation Query**: Use `GET /api/feedback/:agentId` to view current reputation
