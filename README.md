# 🏛️ JuryBox Backend

High-performance Fastify backend for JuryBox - a decentralized multi-agent evaluation system using Hedera blockchain technology.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) 1.2+ (recommended) or Node.js 18+
- Hedera testnet account
- Pinata account (for IPFS)
- OpenAI API key

### Setup
```bash
# Clone and setup
git clone <repository>
cd jurybox-backend
./setup.sh

# Edit environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
bun run dev
```

## 🏗️ Architecture

### Core Stack
- **Node.js + Fastify** → REST API
- **SQLite + Prisma** → Data storage
- **Hedera Agent Kit** → HCS (topic + messages)
- **a2a-x402 + ethers** → Payments
- **ERC-3009 Token** → Gasless token transfers
- **Mirror Node API** → Transparency / logs

### 🪙 Deployed Contracts

#### ERC-3009 Payment Token (Hedera Testnet)
- **Contract Address**: `0xDab9Cf7aAC0dD94Fd353832Ea101069fEfD79CbD`
- **Token Name**: JuryBox Payment Token
- **Token Symbol**: JBPT
- **Decimals**: 18
- **Total Supply**: 1,000,000 JBPT
- **Network**: Hedera Testnet (Chain ID: 296)
- **HashScan**: https://hashscan.io/testnet/contract/0xDab9Cf7aAC0dD94Fd353832Ea101069fEfD79CbD
- **Verification Status**: ✅ Verified with source code

**Features**:
- ✅ Full ERC-20 standard compliance (IERC20 + IERC20Metadata)
- 🦊 MetaMask compatible - shows as native asset with name, symbol, decimals, and balance
- 🔐 ERC-3009 "Transfer With Authorization" for gasless transfers
- ✍️ EIP-712 typed signatures for secure meta-transactions
- 🛡️ Nonce-based replay protection
- ⏱️ Time-bound authorizations

**Adding to MetaMask**:
1. Open MetaMask and switch to Hedera Testnet (Chain ID: 296)
2. Click "Import tokens" → "Custom token"
3. Enter token address: `0xDab9Cf7aAC0dD94Fd353832Ea101069fEfD79CbD`
4. Token symbol (JBPT) and decimals (18) will auto-populate
5. Click "Add Custom Token" → your JBPT balance will appear!

### Main Modules
| Module | Purpose |
|--------|---------|
| `hcsService.ts` | Create + send + fetch Hedera topic messages |
| `orchestratorService.ts` | Multi-round evaluation & consensus |
| `paymentService.ts` | Handle X402 A2A judge payments |
| `agentService.ts` | Register + manage judge data |
| `auditService.ts` | Record events to DB + publish to HCS |

### Database Schema
```sql
-- Agents table (judges)
agents: id, name, accountId, payToAddress, fee, reputation, specialties, bio

-- Tasks table  
tasks: id, taskId, content, topicId, status, currentRound, maxRounds, creatorAddress

-- Scores table
scores: id, taskId, judgeId, round, score, reasoning

-- Payments table
payments: id, taskId, judgeId, amount, txHash, status

-- Audit logs
audit_logs: id, taskId, event, data, hcsMessageId
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health status

### Agent Management
- `POST /api/agents/register` - Register a judge
- `GET /api/agents/:id` - Get agent by ID
- `GET /api/agents` - List all agents

### Task Management
- `POST /api/tasks/create` - Create new evaluation task
- `GET /api/tasks/:id/status` - View task progress
- `POST /api/tasks/:id/finalize` - Close + pay judges
- `POST /api/tasks/submit-score` - Submit evaluation score

### Audit & Transparency
- `GET /api/audit/:taskId` - View all records for a task
- `GET /api/audit/:taskId/report` - Generate comprehensive audit report
- `GET /api/audit/:taskId/export` - Export audit data (JSON/CSV)

### Payments
- `POST /api/payments/process` - Process X402 payment
- `GET /api/payments/:taskId` - Get payment status

## 🧠 Core Flow

### 1️⃣ Task Creation
```bash
POST /api/tasks/create
{
  "content": "Evaluate this AI-generated content",
  "judges": [1, 2, 3],
  "maxRounds": 3
}
```
→ Backend creates Hedera Topic
→ Saves task + judges to DB

### 2️⃣ Round Execution
```bash
POST /api/tasks/submit-score
{
  "taskId": "task_123",
  "judgeId": 1,
  "round": 1,
  "score": 8.5,
  "reasoning": "Well-structured content with minor improvements needed"
}
```
→ Task posted to HCS
→ Judges submit scores via HCS

### 3️⃣ Consensus Calculation
→ Backend fetches messages
→ Compute consensus + metaScores
→ If converged → finalize
→ Else → start next round

### 4️⃣ Payment Processing
→ For each judge:
  - Build X402 payment requirement
  - Process → Verify → Settle via facilitator
  - Record TX hash in DB + HCS

### 5️⃣ Final Report
→ Post to Hedera topic (immutable)
→ Store locally for audit

## 💰 Payment Flow (a2a-x402)

```typescript
const utils = new x402Utils();
const reqs = utils.buildPaymentRequirements({
  price: `${judge.fee} HBAR`,
  payToAddress: judge.payToAddress,
  resource: `/evaluation/${taskId}`
});

const wallet = new Wallet(creatorKey);
const payload = await processPayment(reqs.accepts[0], wallet);
await verifyPayment(payload, reqs);
await settlePayment(payload, reqs);
```

## 🗂️ Environment Setup

Create `.env` file:
```bash
# Server Configuration
NODE_ENV=development
FASTIFY_HOST=0.0.0.0
FASTIFY_PORT=10000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# Database Configuration
DATABASE_URL="file:./dev.db"

# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.7117762
HEDERA_PRIVATE_KEY=0xea4e472657545cece47587602e3c19a645ee295ea4d960c0e62416654c2aca12
HEDERA_JSON_RPC_URL=https://testnet.hashio.io/api

# ERC-3009 Token Contract
ERC3009_TOKEN_ADDRESS=0x7613F0cdeb862d15aaD18CaF0850767481bFfa64

# X402 Facilitator Configuration
X402_FACILITATOR_MODE=hedera
FACILITATOR_ACCOUNT_ID=0.0.7117762
FACILITATOR_PRIVATE_KEY=0xea4e472657545cece47587602e3c19a645ee295ea4d960c0e62416654c2aca12

# Creator Configuration (for task creation and payments)
CREATOR_PRIVATE_KEY=302e...

# Pinata IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret

# AI Model Provider
OPENAI_API_KEY=your_OPENAI_API_KEY

# X402 Payment Configuration
X402_DEBUG=true
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_FACILITATOR_API_KEY=your_facilitator_api_key
```

## 🛠️ Development Commands

```bash
# Development
bun run dev              # Start development server
bun run start            # Start production server

# Database
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema changes
bun run db:migrate       # Run migrations
bun run db:studio        # Open Prisma Studio
bun run db:seed          # Seed database

# Docker
bun run docker:build     # Build Docker image
bun run docker:up        # Start with Docker
bun run docker:down      # Stop Docker containers
bun run docker:logs      # View Docker logs
```

## 🐳 Docker Deployment

```bash
# Build and start
bun run docker:build
bun run docker:up

# View logs
bun run docker:logs

# Stop
bun run docker:down
```

## 📊 Database Management

### Prisma Studio
```bash
bun run db:studio
```
Opens web interface at `http://localhost:5555`

### Manual Database Operations
```bash
# Reset database
rm data/dev.db
bun run db:push
bun run db:seed

# View database
sqlite3 data/dev.db
.tables
.schema
```

## 🔍 Monitoring & Debugging

### Health Check
```bash
curl http://localhost:10000/health
```

### View Logs
```bash
# Development logs
bun run dev

# Docker logs
bun run docker:logs
```

### Database Inspection
```bash
# Prisma Studio
bun run db:studio

# SQLite CLI
sqlite3 data/dev.db
SELECT * FROM agents;
SELECT * FROM tasks;
SELECT * FROM scores;
```

## 🚀 Production Deployment

### Environment Variables
Set all required environment variables in production:
- Hedera mainnet credentials
- Production database URL
- Secure API keys
- CORS origins

### Database
For production, consider migrating to PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Security
- Use HTTPS in production
- Validate all inputs
- Rate limiting
- API key authentication
- Secure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the [Hedera documentation](https://docs.hedera.com/)
- Join our community discussions

---

**Built with ❤️ for decentralized AI evaluation**
