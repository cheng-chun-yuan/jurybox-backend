# JuryBox Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM oven/bun:1.1.38-alpine AS deps
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

# Copy package files
COPY package.json ./
COPY bun.lockb* ./

# Install dependencies
RUN bun install --production

# Stage 2: Builder
FROM oven/bun:1.1.38-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc

# Copy package files
COPY package.json ./
COPY bun.lockb* ./

# Install all dependencies (including dev)
RUN bun install

# Copy source code
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Stage 3: Runner
FROM oven/bun:1.1.38-alpine AS runner
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 jurybox

# Copy dependencies
COPY --from=deps --chown=jurybox:nodejs /app/node_modules ./node_modules

# Copy Prisma files
COPY --from=builder --chown=jurybox:nodejs /app/prisma ./prisma
COPY --from=builder --chown=jurybox:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy application code
COPY --chown=jurybox:nodejs . .

# Switch to non-root user
USER jurybox

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run healthcheck || exit 1

# Start the application
CMD ["bun", "run", "start"]
