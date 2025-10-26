# 🐳 JuryBox Backend - Docker Deployment Guide

Complete guide for deploying JuryBox backend using Docker and Docker Compose.

## 📋 Prerequisites

- Docker Engine 20.10+ 
- Docker Compose 2.0+
- At least 2GB RAM available
- Port 10000 available (or configure different port)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository (if not already)
git clone <repository-url>
cd jurybox-backend

# Copy environment variables template
cp .env.docker.example .env

# Edit .env with your actual credentials
nano .env  # or use your preferred editor
```

### 2. Configure Environment Variables

Edit `.env` file with your credentials:

```bash
# Hedera Account (REQUIRED)
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420YOUR_KEY

# OpenAI API Key (REQUIRED for AI features)
OPENAI_API_KEY=sk-YOUR_OPENAI_API_KEY

# Pinata JWT (REQUIRED for IPFS)
PINATA_JWT=YOUR_PINATA_JWT_TOKEN

# Registry Private Key (REQUIRED for ERC-8004)
REGISTRY_PRIVATE_KEY=0xYOUR_REGISTRY_PRIVATE_KEY

# X402 Facilitator (REQUIRED for payments)
X402_FACILITATOR_ACCOUNT_ID=0.0.YOUR_FACILITATOR_ID
X402_FACILITATOR_PRIVATE_KEY=302e020100300506032b657004220420YOUR_KEY
```

### 3. Build and Run

```bash
# Build Docker images
docker-compose build

# Start services (PostgreSQL + Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### 4. Verify Deployment

```bash
# Check services status
docker-compose ps

# Test health endpoint
curl http://localhost:10000/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": 1761469665502,
#   "database": "connected",
#   "hedera": "testnet"
# }
```

## 📦 Services

### Backend (JuryBox API)
- **Port:** 10000
- **Health Check:** `/health`
- **Container:** `jurybox-backend`
- **Image:** Built from `Dockerfile`

### PostgreSQL Database
- **Port:** 5432
- **Container:** `jurybox-postgres`
- **Image:** `postgres:16-alpine`
- **Credentials:** See `.env` file

### pgAdmin (Optional - for database management)
- **Port:** 5050
- **Container:** `jurybox-pgadmin`
- **Access:** http://localhost:5050
- **Activate:** `docker-compose --profile tools up -d pgadmin`

## 🛠️ Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart backend only
docker-compose restart backend

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Check service status
docker-compose ps
```

### Database Operations

```bash
# Run migrations
docker-compose exec backend bunx prisma migrate deploy

# Generate Prisma Client
docker-compose exec backend bunx prisma generate

# Open Prisma Studio (in container)
docker-compose exec backend bunx prisma studio

# Backup database
docker-compose exec postgres pg_dump -U jurybox jurybox > backup.sql

# Restore database
docker-compose exec -T postgres psql -U jurybox jurybox < backup.sql
```

### Development Commands

```bash
# Rebuild without cache
docker-compose build --no-cache backend

# View backend container shell
docker-compose exec backend sh

# Check backend environment variables
docker-compose exec backend printenv
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Docker Compose Network              │
│                                                 │
│  ┌──────────────────┐      ┌─────────────────┐ │
│  │   PostgreSQL     │      │   Backend API   │ │
│  │   (postgres)     │◄─────┤   (backend)     │ │
│  │   Port: 5432     │      │   Port: 10000   │ │
│  └──────────────────┘      └─────────────────┘ │
│         │                          │            │
│         │  ┌─────────────────┐     │            │
│         └──►   pgAdmin      │     │            │
│            │  (optional)     │     │            │
│            │  Port: 5050     │     │            │
│            └─────────────────┘     │            │
└────────────────────────────────────┼────────────┘
                                    │
                              Host: 10000
```

## 📂 Volumes

Persistent data is stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep jurybox

# Volumes created:
# - jurybox-backend_postgres_data   (Database data)
# - jurybox-backend_backend_logs    (Application logs)
# - jurybox-backend_pgadmin_data    (pgAdmin config)
```

### Backup Volumes

```bash
# Backup database volume
docker run --rm \
  -v jurybox-backend_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore database volume
docker run --rm \
  -v jurybox-backend_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/db` |
| `HEDERA_ACCOUNT_ID` | Hedera account ID | `0.0.12345` |
| `HEDERA_PRIVATE_KEY` | Hedera private key (DER format) | `302e020100...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `PINATA_JWT` | Pinata JWT token for IPFS | `eyJ...` |
| `REGISTRY_PRIVATE_KEY` | EVM private key for registry | `0x...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `10000` | Backend API port |
| `NODE_ENV` | `production` | Node environment |
| `LOG_LEVEL` | `info` | Logging level |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `HEDERA_NETWORK` | `testnet` | Hedera network |

## 🐛 Troubleshooting

### Container fails to start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Missing environment variables
# 2. Database connection failed
# 3. Port already in use
```

### Database connection error

```bash
# Ensure PostgreSQL is healthy
docker-compose ps postgres

# Check database connectivity
docker-compose exec postgres pg_isready -U jurybox

# Reset database
docker-compose down -v  # ⚠️ Destroys data!
docker-compose up -d
```

### Port already in use

```bash
# Option 1: Change port in .env
PORT=11000

# Option 2: Stop conflicting service
lsof -ti:10000 | xargs kill -9
```

### Out of memory

```bash
# Check Docker resources
docker stats

# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory
```

## 🔐 Security Best Practices

1. **Never commit `.env` file to git**
   ```bash
   # Add to .gitignore (already done)
   .env
   .env.local
   ```

2. **Use secrets management in production**
   - Docker Swarm secrets
   - Kubernetes secrets
   - HashiCorp Vault

3. **Limit container privileges**
   - Containers run as non-root user (`jurybox`)
   - Read-only file systems where possible

4. **Network isolation**
   - Backend communicates with PostgreSQL via internal network
   - Only port 10000 exposed to host

## 🚀 Production Deployment

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml jurybox

# Check services
docker service ls
```

### Using Kubernetes

Convert `docker-compose.yml` to Kubernetes manifests:

```bash
# Install kompose
brew install kompose

# Convert to Kubernetes
kompose convert -f docker-compose.yml

# Deploy
kubectl apply -f .
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker-compose build
      
      - name: Push to registry
        run: |
          docker tag jurybox-backend:latest registry.example.com/jurybox:${{ github.sha }}
          docker push registry.example.com/jurybox:${{ github.sha }}
      
      - name: Deploy to server
        run: |
          ssh deploy@server "docker pull registry.example.com/jurybox:${{ github.sha }} && docker-compose up -d"
```

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:10000/health

# Database health
docker-compose exec postgres pg_isready

# Container health
docker ps --filter "name=jurybox"
```

### Logs

```bash
# Follow all logs
docker-compose logs -f

# Follow backend only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Export logs
docker-compose logs backend > backend.log
```

## 🧹 Cleanup

```bash
# Stop and remove containers (keeps volumes)
docker-compose down

# Stop and remove containers + volumes (⚠️ DESTROYS DATA)
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a --volumes
```

## 📞 Support

- **Issues:** https://github.com/jurybox/backend/issues
- **Docs:** https://docs.jurybox.io
- **Email:** support@jurybox.io

---

**Built with ❤️ by the JuryBox Team**
