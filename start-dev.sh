#!/bin/bash

# Dream Protocol Development Startup Script
# NEW ARCHITECTURE: Only 2 servers (Frontend on 3000, Backend on 3001)

set -e

echo "🚀 Dream Protocol Development Environment"
echo "=========================================="
echo ""
echo "Architecture: Frontend (3000) + API Gateway (3001)"
echo "All modules run in-process (NO separate servers)"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}Installing dependencies...${NC}"
  pnpm install
  echo -e "${GREEN}✅ Dependencies installed${NC}"
  echo ""
fi

# Check environment
DB_STATUS=$(pg_isready -h localhost 2>&1)
if [[ $DB_STATUS != *"accepting connections"* ]]; then
  echo -e "${RED}⚠️  PostgreSQL is not running on localhost:5432${NC}"
  echo "Please start PostgreSQL first:"
  echo "  brew services start postgresql@15"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Display startup instructions
echo "═══════════════════════════════════════════════════════════"
echo -e "${BLUE}STARTUP INSTRUCTIONS${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Run these commands in SEPARATE terminals:${NC}"
echo ""
echo -e "${BLUE}Terminal 1 - API Gateway (Backend):${NC}"
echo "  pnpm --filter @dream/api-gateway dev"
echo ""
echo -e "${BLUE}Terminal 2 - Frontend (Next.js):${NC}"
echo "  pnpm --filter flagship dev"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}After both are running:${NC}"
echo "  • Frontend: http://localhost:3000"
echo "  • API Gateway: http://localhost:3001"
echo "  • All modules accessible via Gateway"
echo ""
echo -e "${BLUE}Quick health checks:${NC}"
echo "  curl http://localhost:3001/ping"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/info"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
