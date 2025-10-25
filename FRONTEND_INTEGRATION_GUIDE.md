# Frontend Integration Guide for HCS Topic Streaming

## Overview

This guide shows you how to integrate real-time Hedera Consensus Service (HCS) topic streaming into your frontend application. You have two options:

1. **Server-Sent Events (SSE)** - Simple, uses existing backend endpoint
2. **Direct Hedera Subscription** - Better performance, no backend overhead

## Quick Comparison

| Feature | SSE Approach | Direct Hedera Approach |
|---------|-------------|----------------------|
| **Setup Complexity** | ⭐ Easy | ⭐⭐ Medium |
| **Dependencies** | None | @hashgraph/sdk (~2MB) |
| **Backend Load** | High (one connection per client) | None |
| **Latency** | Medium (proxied) | Low (direct) |
| **Scalability** | Limited by backend | Unlimited |
| **Best For** | Quick demos, prototypes | Production apps |

---

## Option 1: Server-Sent Events (SSE)

### When to Use
- Quick prototypes or demos
- Don't want to add Hedera SDK dependency
- Simple implementation needed
- Low number of concurrent users

### Step 1: Start Evaluation and Get Topic ID

```typescript
// Call your backend to start evaluation
const response = await fetch('http://localhost:10000/orchestrator/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentIds: [1, 2, 3],
    maxRounds: 2,
    consensusAlgorithm: 'weighted_average',
    content: 'Your content to evaluate...'
  })
});

const result = await response.json();
const topicId = result.topicId; // e.g., "0.0.12345"
```

### Step 2: Connect to SSE Stream

**Vanilla JavaScript:**
```typescript
const eventSource = new EventSource(
  `http://localhost:10000/orchestrator/stream/${topicId}`
);

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'connected') {
    console.log('✅ Connected to topic:', message.topicId);
  } else if (message.type === 'message') {
    handleAgentMessage(message.data);
  } else if (message.type === 'error') {
    console.error('❌ Error:', message.message);
  }
};

eventSource.onerror = (error) => {
  console.error('Connection error:', error);
  eventSource.close();
};

// Cleanup when done
function cleanup() {
  eventSource.close();
}
```

**React Hook:**
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

export function useSSEStream(topicId: string | null) {
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
      } else if (message.type === 'message') {
        setMessages(prev => [...prev, message.data]);
      } else if (message.type === 'error') {
        setError(message.message);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connection error');
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [topicId]);

  return { messages, isConnected, error };
}

// Usage in component
function EvaluationMonitor({ topicId }: { topicId: string }) {
  const { messages, isConnected, error } = useSSEStream(topicId);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error}</div>}

      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.agentName}</strong> ({msg.type}):
            Score: {msg.data.score}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Vue 3 Composable:**
```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useSSEStream(topicId: string) {
  const messages = ref<any[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);
  let eventSource: EventSource | null = null;

  onMounted(() => {
    eventSource = new EventSource(
      `http://localhost:10000/orchestrator/stream/${topicId}`
    );

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'connected') {
        isConnected.value = true;
      } else if (message.type === 'message') {
        messages.value.push(message.data);
      } else if (message.type === 'error') {
        error.value = message.message;
      }
    };

    eventSource.onerror = () => {
      isConnected.value = false;
      error.value = 'Connection error';
    };
  });

  onUnmounted(() => {
    eventSource?.close();
  });

  return { messages, isConnected, error };
}
```

### Step 3: Handle Message Types

```typescript
function handleAgentMessage(message: AgentMessage) {
  switch (message.type) {
    case 'score':
      // Initial agent scoring
      console.log(`${message.agentName} scored: ${message.data.score}`);
      updateScoreUI(message);
      break;

    case 'discussion':
      // Agent discussion/deliberation
      console.log(`${message.agentName}: ${message.data.discussion}`);
      addDiscussionToUI(message);
      break;

    case 'adjustment':
      // Score adjustment after discussion
      console.log(`${message.agentName} adjusted: ${message.data.originalScore} → ${message.data.adjustedScore}`);
      updateAdjustedScore(message);
      break;

    case 'final':
      // Final consensus result
      console.log(`Final score: ${message.data.score}`);
      showFinalResult(message);
      break;
  }
}
```

---

## Option 2: Direct Hedera Subscription (Recommended)

### When to Use
- Production applications
- Need to scale to many users
- Want minimal latency
- Backend should focus on processing

### Advantages
✅ No backend connection overhead
✅ Scales to unlimited clients
✅ Lower latency (direct to Hedera)
✅ Backend continues processing independently
✅ Reading HCS topics is free and public

### Step 1: Install Hedera SDK

```bash
npm install @hashgraph/sdk
# or
yarn add @hashgraph/sdk
# or
pnpm add @hashgraph/sdk
```

### Step 2: Start Evaluation and Get Topic ID

Same as SSE approach - call `/orchestrator/test` to get `topicId`.

### Step 3: Subscribe Directly to Hedera

**Vanilla JavaScript/TypeScript:**
```typescript
import {
  TopicMessageQuery,
  TopicId,
  Client,
  TopicMessage
} from '@hashgraph/sdk';

// Create client (no private key needed for reading!)
const client = Client.forTestnet();

// Optional: Set custom mirror node
client.setMirrorNetwork(['testnet.mirrornode.hedera.com:443']);

// Subscribe to topic
const topicId = '0.0.12345'; // From backend response

const subscription = new TopicMessageQuery()
  .setTopicId(TopicId.fromString(topicId))
  .setStartTime(new Date(Date.now() - 60000)) // Start from 1 min ago
  .subscribe(
    client,
    null, // No error callback needed
    (message: TopicMessage) => {
      // Parse message
      const content = Buffer.from(message.contents).toString('utf8');
      const agentMessage = JSON.parse(content);

      console.log('Received:', agentMessage);
      handleAgentMessage(agentMessage);
    }
  );

// Cleanup when done
function cleanup() {
  subscription.unsubscribe();
  client.close();
}
```

**React Hook:**
```typescript
import { useEffect, useState, useRef } from 'react';
import { TopicMessageQuery, TopicId, Client } from '@hashgraph/sdk';

interface AgentMessage {
  type: 'score' | 'discussion' | 'adjustment' | 'final';
  agentId: string;
  agentName: string;
  timestamp: number;
  roundNumber: number;
  data: any;
}

export function useHederaStream(topicId: string | null) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!topicId) return;

    const setupSubscription = async () => {
      try {
        // Create client
        const client = Client.forTestnet();
        client.setMirrorNetwork(['testnet.mirrornode.hedera.com:443']);
        clientRef.current = client;

        // Subscribe to topic
        const subscription = new TopicMessageQuery()
          .setTopicId(TopicId.fromString(topicId))
          .setStartTime(new Date(Date.now() - 60000))
          .subscribe(
            client,
            null,
            (message) => {
              try {
                const content = Buffer.from(message.contents).toString('utf8');
                const agentMessage = JSON.parse(content);
                setMessages(prev => [...prev, agentMessage]);
              } catch (err) {
                console.error('Parse error:', err);
              }
            }
          );

        subscriptionRef.current = subscription;
        setIsConnected(true);
      } catch (err: any) {
        setError(err.message);
        setIsConnected(false);
      }
    };

    setupSubscription();

    // Cleanup
    return () => {
      subscriptionRef.current?.unsubscribe();
      clientRef.current?.close();
      setIsConnected(false);
    };
  }, [topicId]);

  return { messages, isConnected, error };
}

// Usage
function EvaluationMonitor({ topicId }: { topicId: string }) {
  const { messages, isConnected, error } = useHederaStream(topicId);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error}</div>}

      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.agentName}</strong> ({msg.type}):
            Score: {msg.data.score}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Vue 3 Composable:**
```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { TopicMessageQuery, TopicId, Client } from '@hashgraph/sdk';

export function useHederaStream(topicId: string) {
  const messages = ref<any[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  let client: Client | null = null;
  let subscription: any = null;

  onMounted(async () => {
    try {
      client = Client.forTestnet();
      client.setMirrorNetwork(['testnet.mirrornode.hedera.com:443']);

      subscription = new TopicMessageQuery()
        .setTopicId(TopicId.fromString(topicId))
        .setStartTime(new Date(Date.now() - 60000))
        .subscribe(
          client,
          null,
          (message) => {
            try {
              const content = Buffer.from(message.contents).toString('utf8');
              const agentMessage = JSON.parse(content);
              messages.value.push(agentMessage);
            } catch (err) {
              console.error('Parse error:', err);
            }
          }
        );

      isConnected.value = true;
    } catch (err: any) {
      error.value = err.message;
    }
  });

  onUnmounted(() => {
    subscription?.unsubscribe();
    client?.close();
  });

  return { messages, isConnected, error };
}
```

---

## Message Types Reference

### Score Message
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
      "Clarity": 8.0
    }
  }
}
```

### Discussion Message
```json
{
  "type": "discussion",
  "agentId": "agent-2",
  "agentName": "Technical Reviewer",
  "timestamp": 1234567891,
  "roundNumber": 1,
  "data": {
    "discussion": "I agree but consider...",
    "replyTo": "agent-1"
  }
}
```

### Adjustment Message
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
    "reasoning": "After feedback..."
  }
}
```

### Final Message
```json
{
  "type": "final",
  "agentId": "coordinator",
  "agentName": "System Coordinator",
  "timestamp": 1234567893,
  "roundNumber": 2,
  "data": {
    "score": 8.48,
    "reasoning": "{\"evaluationId\":\"eval_123\",\"individualScores\":{...}}"
  }
}
```

---

## Complete Workflow Example

### 1. Start Evaluation
```typescript
const response = await fetch('http://localhost:10000/orchestrator/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentIds: [1, 2, 3],
    maxRounds: 2,
    content: 'Content to evaluate...'
  })
});

const { topicId, evaluationId } = await response.json();
```

### 2. Subscribe to Stream
```typescript
// Option A: SSE
const eventSource = new EventSource(`http://localhost:10000/orchestrator/stream/${topicId}`);

// Option B: Direct Hedera
const client = Client.forTestnet();
new TopicMessageQuery()
  .setTopicId(TopicId.fromString(topicId))
  .subscribe(client, null, handleMessage);
```

### 3. Handle Messages in Real-Time
```typescript
function handleMessage(message: AgentMessage) {
  // Update UI based on message type
  if (message.type === 'score') {
    updateAgentScore(message);
  } else if (message.type === 'final') {
    showFinalResult(message);
  }
}
```

### 4. Get Final Result
```typescript
const resultResponse = await fetch(
  `http://localhost:10000/orchestrator/result/${evaluationId}`
);
const finalResult = await resultResponse.json();
```

---

## Best Practices

### Performance
- **Reuse client instance** - Create once, use for multiple topics
- **Filter messages** - Only process relevant roundNumbers
- **Debounce UI updates** - Don't update on every message if too frequent
- **Limit message history** - Clear old messages to save memory

### Error Handling
- **Network errors** - Implement retry logic with exponential backoff
- **Parse errors** - Catch JSON.parse errors, log and skip bad messages
- **Connection loss** - Show disconnected state, attempt reconnection
- **Invalid topic** - Validate topicId format before subscribing

### Security
- **Validate topicId** - Ensure it comes from your backend
- **Sanitize content** - XSS prevention when displaying messages
- **CORS** - Configure properly for your domain
- **Rate limiting** - Implement if using SSE to prevent abuse

### UI/UX
- **Show connection status** - Visual indicator (🟢/🔴)
- **Loading states** - While waiting for messages
- **Message grouping** - Group by roundNumber for clarity
- **Auto-scroll** - To latest message
- **Timestamp formatting** - Human-readable times

---

## Troubleshooting

### SSE: Connection Keeps Dropping
- Check backend logs for errors
- Verify CORS headers
- Check network/firewall settings
- Increase timeout on backend if needed

### Direct Hedera: No Messages Received
- Verify topicId format is correct (e.g., "0.0.12345")
- Check startTime - may be too far in past/future
- Confirm topic has messages (check backend logs)
- Try different mirror node endpoint

### Messages Arrive Out of Order
- This is normal - Hedera delivers by consensus time
- Sort by `timestamp` field if needed
- Group by `roundNumber` for display

### High Memory Usage
- Limit stored messages (e.g., last 100)
- Clear messages when changing topics
- Unsubscribe when component unmounts

---

## Configuration Examples

### Environment Variables
```env
# Frontend .env
VITE_BACKEND_URL=http://localhost:10000
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_MIRROR_NODE=testnet.mirrornode.hedera.com:443
```

### Package.json Dependencies
```json
{
  "dependencies": {
    "@hashgraph/sdk": "^2.48.0"
  }
}
```

---

## Recommendation

For your project, I recommend:

**Start with SSE** for quick development and testing:
- No additional dependencies
- Simpler to debug
- Good for demos

**Migrate to Direct Hedera** for production:
- Better scalability
- Lower latency
- Reduced backend load
- Your backend can focus on orchestrator logic

Both approaches work with your existing backend - no changes needed!
