# Frontend Integration Guide - HCS Direct Subscription

## Overview

This guide shows you how to integrate real-time Hedera Consensus Service (HCS) topic streaming directly into your frontend application. Your frontend will subscribe directly to Hedera's public mirror nodes, eliminating backend overhead and achieving better scalability.

## Why Direct Subscription?

✅ **No Backend Overhead** - Backend doesn't maintain connections
✅ **Unlimited Scalability** - Each client connects directly to Hedera
✅ **Lower Latency** - Direct to mirror node, no proxy delay
✅ **Backend Focus** - Your backend can focus on orchestrator processing
✅ **Free & Public** - Reading HCS topics requires no credentials or fees

---

## Prerequisites

### 1. Install Hedera SDK

```bash
npm install @hashgraph/sdk
# or
yarn add @hashgraph/sdk
# or
pnpm add @hashgraph/sdk
```

**Bundle size:** ~2MB (acceptable for most production apps)

### 2. No Private Keys Needed!

Reading from HCS topics is completely public:
- No Hedera account required
- No private keys in frontend
- No authentication needed
- Just connect and subscribe

---

## Quick Start

### Step 1: Get Topic ID from Backend

Call your backend to start an evaluation and receive the topicId:

```typescript
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

### Step 2: Subscribe Directly to Hedera

**TypeScript/JavaScript:**
```typescript
import {
  TopicMessageQuery,
  TopicId,
  Client,
  TopicMessage
} from '@hashgraph/sdk';

// Create client (no private key needed!)
const client = Client.forTestnet();

// Optional: Set custom mirror node
client.setMirrorNetwork(['testnet.mirrornode.hedera.com:443']);

// Subscribe to topic
const subscription = new TopicMessageQuery()
  .setTopicId(TopicId.fromString(topicId))
  .setStartTime(new Date(Date.now() - 60000)) // Start from 1 min ago
  .subscribe(
    client,
    null,
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

---

## Framework Integration

### React Hook

```typescript
import { useEffect, useState, useRef } from 'react';
import { TopicMessageQuery, TopicId, Client } from '@hashgraph/sdk';

interface AgentMessage {
  type: 'score' | 'discussion' | 'adjustment' | 'final';
  agentId: string;
  agentName: string;
  timestamp: number;
  roundNumber: number;
  data: {
    score?: number;
    reasoning?: string;
    originalScore?: number;
    adjustedScore?: number;
    confidence?: number;
    aspects?: Record<string, number>;
    discussion?: string;
    replyTo?: string;
  };
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

// Usage in component
function EvaluationMonitor({ topicId }: { topicId: string }) {
  const { messages, isConnected, error } = useHederaStream(topicId);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <div>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div>
        <h3>Messages:</h3>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.agentName}</strong> ({msg.type}) - Round {msg.roundNumber}
            {msg.type === 'score' && <span>: Score {msg.data.score}</span>}
            {msg.type === 'discussion' && <span>: {msg.data.discussion}</span>}
            {msg.type === 'adjustment' && (
              <span>: {msg.data.originalScore} → {msg.data.adjustedScore}</span>
            )}
            {msg.type === 'final' && <span>: Final {msg.data.score}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Vue 3 Composable

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { TopicMessageQuery, TopicId, Client } from '@hashgraph/sdk';

interface AgentMessage {
  type: 'score' | 'discussion' | 'adjustment' | 'final';
  agentId: string;
  agentName: string;
  timestamp: number;
  roundNumber: number;
  data: any;
}

export function useHederaStream(topicId: string) {
  const messages = ref<AgentMessage[]>([]);
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

### Vanilla JavaScript

```javascript
import {
  TopicMessageQuery,
  TopicId,
  Client
} from '@hashgraph/sdk';

class HederaStreamService {
  constructor() {
    this.client = null;
    this.subscription = null;
    this.onMessageCallback = null;
  }

  async connect(topicId, onMessage) {
    this.onMessageCallback = onMessage;

    // Create client
    this.client = Client.forTestnet();
    this.client.setMirrorNetwork(['testnet.mirrornode.hedera.com:443']);

    // Subscribe
    this.subscription = new TopicMessageQuery()
      .setTopicId(TopicId.fromString(topicId))
      .setStartTime(new Date(Date.now() - 60000))
      .subscribe(
        this.client,
        null,
        (message) => {
          try {
            const content = Buffer.from(message.contents).toString('utf8');
            const agentMessage = JSON.parse(content);
            this.onMessageCallback(agentMessage);
          } catch (err) {
            console.error('Parse error:', err);
          }
        }
      );

    console.log('✅ Connected to topic:', topicId);
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.client?.close();
    console.log('📴 Disconnected');
  }
}

// Usage
const streamService = new HederaStreamService();

streamService.connect('0.0.12345', (message) => {
  console.log('Received:', message);
  updateUI(message);
});

// Later...
streamService.disconnect();
```

---

## Message Types Reference

### 1. Score Message (Initial Scoring)
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

### 4. Final Message (Consensus)
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

---

## Handling Messages

### Basic Handler
```typescript
function handleAgentMessage(message: AgentMessage) {
  switch (message.type) {
    case 'score':
      console.log(`${message.agentName} scored: ${message.data.score}`);
      displayScore(message);
      break;

    case 'discussion':
      console.log(`${message.agentName}: ${message.data.discussion}`);
      addDiscussion(message);
      break;

    case 'adjustment':
      console.log(
        `${message.agentName} adjusted: ${message.data.originalScore} → ${message.data.adjustedScore}`
      );
      updateScore(message);
      break;

    case 'final':
      console.log(`Final consensus: ${message.data.score}`);
      showFinalResult(message);
      break;
  }
}
```

### Group by Round
```typescript
function groupMessagesByRound(messages: AgentMessage[]) {
  const rounds = new Map<number, AgentMessage[]>();

  messages.forEach(msg => {
    if (!rounds.has(msg.roundNumber)) {
      rounds.set(msg.roundNumber, []);
    }
    rounds.get(msg.roundNumber)!.push(msg);
  });

  return Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
}
```

---

## Complete Workflow Example

```typescript
import { useState, useEffect } from 'react';
import { useHederaStream } from './useHederaStream';

function EvaluationWorkflow() {
  const [topicId, setTopicId] = useState<string | null>(null);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const { messages, isConnected, error } = useHederaStream(topicId);

  // Step 1: Start evaluation
  async function startEvaluation() {
    const response = await fetch('http://localhost:10000/orchestrator/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentIds: [1, 2, 3],
        maxRounds: 2,
        consensusAlgorithm: 'weighted_average',
        content: 'Content to evaluate...'
      })
    });

    const result = await response.json();
    setTopicId(result.topicId);
    setEvaluationId(result.evaluationId);
  }

  // Step 2: Monitor messages (automatic via hook)

  // Step 3: Detect completion
  const isFinal = messages.some(msg => msg.type === 'final');

  // Step 4: Fetch final result when done
  useEffect(() => {
    if (isFinal && evaluationId) {
      fetchFinalResult();
    }
  }, [isFinal, evaluationId]);

  async function fetchFinalResult() {
    const response = await fetch(
      `http://localhost:10000/orchestrator/result/${evaluationId}`
    );
    const finalResult = await response.json();
    console.log('Final result:', finalResult);
  }

  return (
    <div>
      <button onClick={startEvaluation}>Start Evaluation</button>

      {topicId && (
        <div>
          <p>Topic ID: {topicId}</p>
          <p>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>

          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.agentName}: {msg.type} - Round {msg.roundNumber}
            </div>
          ))}

          {isFinal && <p>✅ Evaluation Complete!</p>}
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### Performance

**1. Reuse Client Instance**
```typescript
// Good: Create once, reuse
const client = Client.forTestnet();
// Use for multiple subscriptions

// Bad: Create new client for each subscription
```

**2. Filter Messages**
```typescript
// Only process relevant rounds
if (message.roundNumber === currentRound) {
  handleMessage(message);
}
```

**3. Limit History**
```typescript
// Keep only last 100 messages
setMessages(prev => {
  const updated = [...prev, newMessage];
  return updated.slice(-100);
});
```

**4. Debounce UI Updates**
```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce((message) => {
  updateUI(message);
}, 100);
```

### Error Handling

**1. Network Errors**
```typescript
try {
  subscription = new TopicMessageQuery()
    .setTopicId(TopicId.fromString(topicId))
    .subscribe(client, null, handleMessage);
} catch (error) {
  console.error('Subscription failed:', error);
  // Retry with exponential backoff
  setTimeout(() => retrySubscription(), retryDelay);
}
```

**2. Parse Errors**
```typescript
(message: TopicMessage) => {
  try {
    const content = Buffer.from(message.contents).toString('utf8');
    const agentMessage = JSON.parse(content);
    handleMessage(agentMessage);
  } catch (error) {
    console.error('Parse error:', error);
    // Log and skip, don't crash
  }
}
```

**3. Validate Messages**
```typescript
function isValidMessage(msg: any): msg is AgentMessage {
  return (
    typeof msg.type === 'string' &&
    ['score', 'discussion', 'adjustment', 'final'].includes(msg.type) &&
    typeof msg.agentId === 'string' &&
    typeof msg.agentName === 'string'
  );
}
```

### Security

**1. Validate Topic ID**
```typescript
// Ensure topicId comes from your backend
function isValidTopicId(topicId: string): boolean {
  return /^0\.0\.\d+$/.test(topicId);
}
```

**2. Sanitize Display Content**
```typescript
import DOMPurify from 'dompurify';

function displayMessage(message: AgentMessage) {
  const clean = DOMPurify.sanitize(message.data.discussion || '');
  element.innerHTML = clean;
}
```

**3. CORS Configuration**
Not needed! Direct Hedera subscription bypasses your backend entirely.

### UI/UX

**1. Connection Status**
```tsx
<div className={isConnected ? 'status-connected' : 'status-disconnected'}>
  {isConnected ? '🟢 Live' : '🔴 Disconnected'}
</div>
```

**2. Loading States**
```tsx
{messages.length === 0 && isConnected && (
  <div>⏳ Waiting for messages...</div>
)}
```

**3. Auto-scroll**
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**4. Timestamp Formatting**
```typescript
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
```

---

## Troubleshooting

### No Messages Received

**Check 1: Topic ID Format**
```typescript
// Correct: "0.0.12345"
// Incorrect: "0.0.12345.0" or "12345"
```

**Check 2: Start Time**
```typescript
// Good: Recent time
.setStartTime(new Date(Date.now() - 60000))

// Bad: Too far in past (may timeout)
.setStartTime(new Date(0))
```

**Check 3: Verify Topic Has Messages**
Check backend logs to confirm messages are being submitted.

### Connection Issues

**Try Different Mirror Node:**
```typescript
// Testnet alternatives
client.setMirrorNetwork([
  'testnet.mirrornode.hedera.com:443',
  'hcs.testnet.mirrornode.hedera.com:5600'
]);
```

### Messages Out of Order

This is normal! Hedera delivers by consensus timestamp, not submission order.

**Solution: Sort by timestamp**
```typescript
const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
```

### High Memory Usage

**Solution: Limit message history**
```typescript
const MAX_MESSAGES = 100;

setMessages(prev => {
  const updated = [...prev, newMessage];
  return updated.slice(-MAX_MESSAGES);
});
```

---

## Configuration

### Environment Variables
```env
# .env
VITE_BACKEND_URL=http://localhost:10000
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_MIRROR_NODE=testnet.mirrornode.hedera.com:443
```

### TypeScript Config
```json
{
  "compilerOptions": {
    "lib": ["ES2020"],
    "module": "ES2020",
    "target": "ES2020"
  }
}
```

### Dependencies
```json
{
  "dependencies": {
    "@hashgraph/sdk": "^2.48.0"
  }
}
```

---

## Summary

✅ **Backend returns topicId** - No streaming endpoint needed
✅ **Frontend subscribes directly** - Using Hedera SDK
✅ **Scales infinitely** - No backend connection overhead
✅ **Lower latency** - Direct to mirror node
✅ **Simple & clean** - Your backend stays focused on orchestrator logic

Your backend is now clean and focused on processing, while frontend handles real-time streaming independently!
