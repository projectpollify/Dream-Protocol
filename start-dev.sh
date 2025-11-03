#!/bin/bash

# Dream Protocol Development Startup Script
# Starts all services in the correct order

set -e

echo "🚀 Dream Protocol Development Environment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if all modules are built
echo -e "${BLUE}Checking module builds...${NC}"
pnpm build:modules 2>/dev/null || {
  echo "Building modules (first time)..."
  pnpm --filter '@dream/*' build
}

echo ""
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Show instructions
echo -e "${BLUE}Starting services...${NC}"
echo ""
echo "This script will open multiple terminal windows."
echo "You can stop any service with Ctrl+C"
echo ""

# Function to open terminal in iTerm (macOS)
open_iterm() {
  local title=$1
  local cmd=$2

  if command -v open &> /dev/null && osascript -e 'tell app "System Events" to name of processes' 2>/dev/null | grep -q iTerm; then
    osascript <<EOF
tell application "iTerm"
  create window with default profile
  tell current session of current window
    set name to "$title"
    write text "$cmd"
  end tell
end tell
EOF
  fi
}

# Function to open terminal in Terminal.app (fallback)
open_terminal() {
  local title=$1
  local cmd=$2

  open -a Terminal "$(pwd)"
  # Terminal doesn't allow direct command execution easily, so we'll use a different approach
}

# Check environment
DB_STATUS=$(pg_isready -h localhost 2>&1)
if [[ $DB_STATUS != *"accepting connections"* ]]; then
  echo -e "${BLUE}⚠️  PostgreSQL is not running on localhost:5432${NC}"
  echo "Please start PostgreSQL first:"
  echo "  brew services start postgresql@15"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Create a startup summary
cat > /tmp/dream-protocol-startup.txt <<'STARTUP'
Dream Protocol Startup Instructions
====================================

1. API Gateway Terminal:
   pnpm --filter @dream/api-gateway dev

2. Backend Modules Terminal:
   pnpm --filter '@dream/!(api-gateway)' dev

3. Frontend Terminal:
   pnpm dev

Then visit: http://localhost:3000

Service Ports:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3001
- Modules: http://localhost:3001-3010 (via gateway)

Check Gateway Health:
  curl http://localhost:3001/health
  curl http://localhost:3001/info
STARTUP

echo -e "${BLUE}Copy and run these commands in separate terminals:${NC}"
echo ""
echo "Terminal 1 (API Gateway):"
echo "  cd /Users/shawn/Desktop/dreamprotocol"
echo "  pnpm --filter @dream/api-gateway dev"
echo ""
echo "Terminal 2 (Backend Modules - all at once):"
echo "  cd /Users/shawn/Desktop/dreamprotocol"
echo "  pnpm --filter '@dream/!(api-gateway)' dev"
echo ""
echo "Terminal 3 (Frontend):"
echo "  cd /Users/shawn/Desktop/dreamprotocol"
echo "  pnpm dev"
echo ""
echo "Then visit:"
echo "  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Check gateway health:${NC}"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/ping"
echo ""
