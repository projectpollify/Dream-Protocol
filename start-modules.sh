#!/bin/bash

# Start all backend modules with individual ports
# Each module runs on its designated port (3001-3010)

cd /Users/shawn/Desktop/dreamprotocol

echo "🚀 Starting Dream Protocol Backend Modules"
echo "=========================================="
echo ""

mkdir -p logs

# Kill any existing module processes
pkill -f "pnpm --filter @dream" 2>/dev/null
sleep 1

# Array of modules and their ports
declare -a MODULES=("identity" "bridge-legacy" "user" "economy" "token-exchange" "governance" "content" "social" "verification" "analytics")
declare -a PORTS=(3001 3002 3003 3004 3005 3006 3007 3008 3009 3010)

# Start each module with its designated port
for i in "${!MODULES[@]}"; do
  module="${MODULES[$i]}"
  port="${PORTS[$i]}"

  echo "Starting Module $(printf "%02d" $((i+1))): $module on port $port..."

  PORT=$port pnpm --filter "@dream/$module" dev > "logs/${i+1:02d}-$module.log" 2>&1 &

  sleep 0.5
done

echo ""
echo "✓ All modules started"
echo ""
echo "Running modules:"
for i in "${!MODULES[@]}"; do
  module="${MODULES[$i]}"
  port="${PORTS[$i]}"
  echo "  Module $(printf "%02d" $((i+1))): $module on port $port"
done

echo ""
echo "Check logs with: tail -f logs/XX-modulename.log"
echo ""

# Keep the script running
wait
