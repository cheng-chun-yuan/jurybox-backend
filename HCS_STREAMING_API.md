# HCS Topic Streaming API Documentation

## Overview

This API enables real-time streaming of Hedera Consensus Service (HCS) topic messages to frontend applications using Server-Sent Events (SSE). This allows you to monitor agent evaluations, discussions, and consensus-building in real-time as messages are submitted to the HCS topic.

**📖 For detailed frontend implementation instructions, see [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)**

## Two Integration Options

1. **Server-Sent Events (SSE)** - Use this backend endpoint (documented below)
2. **Direct Hedera Subscription** - Frontend subscribes directly to Hedera mirror node (see integration guide)

**Recommendation:** SSE for quick prototypes, Direct Hedera for production scalability.

## Endpoint

```
GET /orchestrator/stream/:topicId
```

Stream HCS topic messages in real-time using Server-Sent Events (SSE).

### Parameters

- **topicId** (path parameter, required): The HCS topic ID to subscribe to (e.g., `0.0.12345`)

### Response Format

The endpoint streams Server-Sent Events with the following format:

```
Content-Type: text/event-stream
```

Each event is a JSON object with the following structure:

#### Connection Event
```json
{
  "type": "connected",
  "topicId": "0.0.12345"
}
```

#### Message Event
```json
{
  "type": "message",
  "data": {
    "type": "score" | "discussion" | "adjustment" | "final",
    "agentId": "string",
    "agentName": "string",
    "timestamp": 1234567890,
    "roundNumber": 0,
    "data": {
      "score": 8.5,
      "reasoning": "...",
      "originalScore": 7.5,
      "adjustedScore": 8.5,
      "confidence": 0.9,
      "aspects": {},
      "discussion": "...",
      "replyTo": "agent-id"
    }
  }
}
```

#### Error Event
```json
{
  "type": "error",
  "message": "Error description"
}
```

## Message Types

### 1. Score Message
Initial scoring from an agent:
```json
{
  "type": "score",
  "agentId": "agent-1",
  "agentName": "Expert Judge",
  "timestamp": 1234567890,
  "roundNumber": 0,
  "data": {
    "score": 8.5,
    "reasoning": "The content demonstrates...",
    "confidence": 0.9,
    "aspects": {
      "Accuracy": 9.0,
      "Clarity": 8.0,
      "Completeness": 8.5,
      "Relevance": 9.0
    }
  }
}
```

### 2. Discussion Message
Agent discussion and deliberation:
```json
{
  "type": "discussion",
  "agentId": "agent-2",
  "agentName": "Technical Reviewer",
  "timestamp": 1234567891,
  "roundNumber": 1,
  "data": {
    "discussion": "I agree with the technical assessment, but...",
    "replyTo": "agent-1"
  }
}
```

### 3. Adjustment Message
Score adjustment after discussion:
```json
{
  "type": "adjustment",
  "agentId": "agent-1",
  "agentName": "Expert Judge",
  "timestamp": 1234567892,
  "roundNumber": 1,
  "data": {
    "originalScore": 8.5,
    "adjustedScore": 8.7,
    "reasoning": "After considering the feedback..."
  }
}
```

### 4. Final Message
Consensus result:
```json
{
  "type": "final",
  "agentId": "coordinator",
  "agentName": "System Coordinator",
  "timestamp": 1234567893,
  "roundNumber": 2,
  "data": {
    "score": 8.48,
    "reasoning": "{\"evaluationId\":\"eval_123\",\"individualScores\":{...},\"consensusAlgorithm\":\"weighted_average\",\"totalRounds\":2}"
  }
}
```

## Frontend Integration Examples

### JavaScript (Browser)

```javascript
// Connect to the stream
const topicId = '0.0.12345';
const eventSource = new EventSource(`http://localhost:10000/orchestrator/stream/${topicId}`);

// Handle incoming messages
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connected':
      console.log('✅ Connected to topic:', message.topicId);
      break;

    case 'message':
      const agentMessage = message.data;
      console.log(`📨 ${agentMessage.agentName} (${agentMessage.type}):`, agentMessage.data);

      // Update UI based on message type
      if (agentMessage.type === 'score') {
        updateScoreDisplay(agentMessage);
      } else if (agentMessage.type === 'discussion') {
        addDiscussionMessage(agentMessage);
      } else if (agentMessage.type === 'adjustment') {
        updateAdjustedScore(agentMessage);
      } else if (agentMessage.type === 'final') {
        displayFinalConsensus(agentMessage);
      }
      break;

    case 'error':
      console.error('❌ Stream error:', message.message);
      break;
  }
};

// Handle errors
eventSource.onerror = (error) => {
  console.error('EventSource error:', error);
  eventSource.close();
};

// Close the connection when done
function cleanup() {
  eventSource.close();
}
```

### React Hook

```typescript
import { useEffect, useState } from 'react';

interface AgentMessage {
  type: 'score' | 'discussion' | 'adjustment' | 'final';
  agentId: string;
  agentName: string;
  timestamp: number;
  roundNumber: number;
  data: any;
}

export function useHCSStream(topicId: string | null) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;

    const eventSource = new EventSource(
      `http://localhost:10000/orchestrator/stream/${topicId}`
    );

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'connected') {
        setIsConnected(true);
        console.log('Connected to topic:', message.topicId);
      } else if (message.type === 'message') {
        setMessages(prev => [...prev, message.data]);
      } else if (message.type === 'error') {
        setError(message.message);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      setError('Connection error');
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [topicId]);

  return { messages, isConnected, error };
}

// Usage in component
function EvaluationStream({ topicId }: { topicId: string }) {
  const { messages, isConnected, error } = useHCSStream(topicId);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error}</div>}

      <div>
        <h3>Messages:</h3>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.agentName}</strong> ({msg.type}):
            {JSON.stringify(msg.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### cURL (Testing)

```bash
# Stream messages from a topic
curl -N http://localhost:10000/orchestrator/stream/0.0.12345
```

## Complete Workflow Example

### 1. Start an Evaluation

```bash
POST /orchestrator/test
{
  "agentIds": [1, 2, 3],
  "maxRounds": 2,
  "consensusAlgorithm": "weighted_average",
  "content": "Evaluate this content..."
}
```

Response includes `topicId`:
```json
{
  "success": true,
  "evaluationId": "eval_test_1234567890",
  "topicId": "0.0.12345",
  ...
}
```

### 2. Connect to Stream

```javascript
const eventSource = new EventSource(
  `http://localhost:10000/orchestrator/stream/0.0.12345`
);

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### 3. Monitor Real-Time Messages

You'll receive messages in this order:
1. **Connected** - Initial connection confirmation
2. **Score messages** - Each agent's initial score (Round 0)
3. **Discussion messages** - Agent discussions (Round 1+)
4. **Adjustment messages** - Score adjustments after discussion
5. **Final message** - Final consensus result

### 4. Get Final Result

When evaluation completes, also fetch final result:
```bash
GET /orchestrator/result/:evaluationId
```

## Features

- ✅ Real-time streaming of HCS messages
- ✅ Automatic reconnection handling
- ✅ Historical messages (starts from 1 minute ago)
- ✅ Multiple concurrent client support
- ✅ Automatic cleanup on disconnect
- ✅ CORS enabled for frontend access

## Notes

- The stream starts from 1 minute in the past to catch any recent messages
- Connection stays open until client disconnects
- Multiple clients can connect to the same topic
- Messages are delivered as they arrive from the Hedera mirror node
- The stream is read-only; you cannot send messages through SSE

## Error Handling

The stream will send error events if:
- Topic subscription fails
- Invalid topic ID
- Network connectivity issues

Clients should handle these errors and implement reconnection logic if needed.
