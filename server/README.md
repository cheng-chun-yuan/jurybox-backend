# Fastify Backend Server

High-performance backend API server for JuryBox using Fastify.

## Features

- **Fast**: Up to 30,000 requests/second
- **Type-safe**: Full TypeScript support
- **Validated**: JSON Schema validation on all routes
- **Secure**: CORS, Helmet security headers
- **Logging**: Production-ready Pino logging

## Architecture

```
server/
├── config/          # Server configuration
├── plugins/         # Fastify plugins (CORS, Helmet, etc.)
├── routes/          # API route handlers
│   ├── agents.ts    # Agent registration (ERC-8004)
│   ├── orchestrator.ts  # Multi-agent orchestrator
│   └── upload.ts    # IPFS file upload
├── app.ts           # Fastify app builder
└── index.ts         # Server entry point
```

## Development

Start Fastify server only:
```bash
bun run dev:server
```

Start both Next.js and Fastify concurrently:
```bash
bun run dev:all
```

## Endpoints

### Health Check
- `GET /health` - Server health status

### Agents
- `POST /api/agents/register` - Register new agent (ERC-8004 compliant)
- `GET /api/agents/register?agentId=123` - Get agent by ID

### Orchestrator
- `POST /api/orchestrator/create` - Create orchestrator system
- `GET /api/orchestrator/test` - Test orchestrator service

### Upload
- `POST /api/upload` - Upload image to IPFS via Pinata

## Configuration

Environment variables (add to `.env`):
- `FASTIFY_HOST` - Server host (default: 0.0.0.0)
- `FASTIFY_PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)
- `LOG_LEVEL` - Logging level (default: info)

## Production

Build and start:
```bash
bun run build
bun run start:server
```
