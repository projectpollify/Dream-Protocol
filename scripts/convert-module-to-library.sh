#!/bin/bash
# Script to convert a module from standalone server to router library
# Usage: ./convert-module-to-library.sh <module-number> <module-name> <router-name>
# Example: ./convert-module-to-library.sh 03 user User

MODULE_NUM=$1
MODULE_NAME=$2
ROUTER_NAME=$3

if [ -z "$MODULE_NUM" ] || [ -z "$MODULE_NAME" ] || [ -z "$ROUTER_NAME" ]; then
  echo "Usage: $0 <module-number> <module-name> <router-name>"
  echo "Example: $0 03 user User"
  exit 1
fi

MODULE_DIR="packages/${MODULE_NUM}-${MODULE_NAME}"
INDEX_FILE="${MODULE_DIR}/src/index.ts"

if [ ! -f "$INDEX_FILE" ]; then
  echo "Error: $INDEX_FILE not found"
  exit 1
fi

echo "Converting Module ${MODULE_NUM} (${MODULE_NAME}) to library..."
echo "File: $INDEX_FILE"
echo ""
echo "Manual steps required:"
echo "1. Change import from 'express, { Express }' to '{ Router }'"
echo "2. Add createRouter function: export function create${ROUTER_NAME}Router(): Router { return ${MODULE_NAME}Routes; }"
echo "3. Deprecate initialize function"
echo "4. Remove startStandaloneServer function"
echo "5. Remove 'if (require.main === module)' block"
echo ""
echo "This script is for reference - actual edits must be done via Edit tool"
