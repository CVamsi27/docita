#!/bin/bash

# Development Setup Script
# Ensures proper order of service startup and proper environment configuration

set -e

echo "🚀 Starting Docita Development Environment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Kill any existing processes on ports 3000, 3001, 3002, 3003
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
node scripts/kill-ports.js 2>/dev/null || true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  pnpm install --frozen-lockfile
fi

# Generate Prisma Client
echo -e "${YELLOW}Generating Prisma Client...${NC}"
pnpm db:generate

# Start API server first
echo -e "${YELLOW}Starting API server on port 3001...${NC}"
pnpm --filter @docita/api run start:dev &
API_PID=$!

# Wait for API to be ready
echo -e "${YELLOW}Waiting for API server to be ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s http://localhost:3001/api/health > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES..."
  sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}✗ API server failed to start${NC}"
  kill $API_PID 2>/dev/null || true
  exit 1
fi

echo -e "${GREEN}✓ API server is ready${NC}"

# Start apps (landing, app, admin) in parallel
echo -e "${YELLOW}Starting frontend apps...${NC}"

pnpm --filter @docita/landing --filter @docita/app --filter @docita/admin run dev &
FRONTEND_PID=$!

# Wait for all services
echo -e "${GREEN}\n✓ All services are running!${NC}"
echo ""
echo -e "${YELLOW}Endpoints:${NC}"
echo "  API:     http://localhost:3001"
echo "  App:     http://localhost:3000"
echo "  Admin:   http://localhost:3002"
echo "  Landing: http://localhost:3003"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

wait
