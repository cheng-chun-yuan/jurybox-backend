#!/bin/bash

# JuryBox Backend Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up JuryBox Backend..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
bun run db:generate

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data

# Push database schema
echo "🗄️ Setting up database..."
bun run db:push

# Seed database
echo "🌱 Seeding database..."
bun run db:seed

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual credentials"
fi

echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Run 'bun run dev' to start the development server"
echo "3. Run 'bun run db:studio' to open Prisma Studio"
echo ""
echo "Available commands:"
echo "  bun run dev          - Start development server"
echo "  bun run db:studio    - Open Prisma Studio"
echo "  bun run db:push      - Push schema changes"
echo "  bun run db:seed      - Seed database"
echo "  bun run docker:up    - Start with Docker"
