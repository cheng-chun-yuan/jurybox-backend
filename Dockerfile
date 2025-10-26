FROM oven/bun:1.1.38-alpine

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy application code
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Expose port
EXPOSE 10000

# Start the application
CMD ["bun", "run", "start"]
