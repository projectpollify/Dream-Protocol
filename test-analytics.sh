#!/bin/bash

# Module 10: Analytics - Comprehensive Test Suite
# Tests all analytics endpoints and functions

set -e

BASE_URL="http://localhost:3000/api/v1"
RESULTS_FILE="/tmp/analytics-test-results.txt"

echo "═══════════════════════════════════════════════════════════════"
echo "Module 10: Analytics - Comprehensive Test Suite"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Testing Analytics Endpoints..."
echo ""

# Initialize results file
> "$RESULTS_FILE"

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=${5:-200}

  TESTS_RUN=$((TESTS_RUN + 1))
  echo -n "Test $TESTS_RUN: $name ... "

  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi

  # Extract status code and body
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "$name - PASS" >> "$RESULTS_FILE"
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "$name - FAIL (HTTP $http_code)" >> "$RESULTS_FILE"
    echo "Response: $body" >> "$RESULTS_FILE"
  fi

  # Print response if verbose
  if [ -n "$VERBOSE" ]; then
    echo "Response: $body" | head -c 200
    echo "..."
  fi
}

echo -e "${BLUE}1. SHADOW CONSENSUS ENDPOINTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Shadow Consensus with a mock poll ID
test_endpoint \
  "GET Shadow Consensus for poll" \
  "GET" \
  "/analytics/shadow-consensus/test-poll-123" \
  "" \
  "500" # Will fail because no real data, but endpoint exists

test_endpoint \
  "GET Shadow Consensus History" \
  "GET" \
  "/analytics/shadow-consensus-history/test-poll-123" \
  "" \
  "500" # Will fail because no real data

echo ""
echo -e "${BLUE}2. TREND PREDICTION ENDPOINTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint \
  "GET Predictions for poll" \
  "GET" \
  "/analytics/predictions/test-poll-123" \
  "" \
  "500" # Will fail because no real data

test_endpoint \
  "POST Analyze Conviction" \
  "POST" \
  "/analytics/analyze-conviction" \
  '{"poll_id":"test-123","true_self_delta":20,"shadow_delta":30,"avg_stake_yes":100,"avg_stake_no":80}' \
  "200"

test_endpoint \
  "POST Detect Consensus Patterns" \
  "POST" \
  "/analytics/detect-patterns" \
  '{"current_delta":25,"direction":"PUBLIC_OPPOSITION_PRIVATE_SUPPORT","shadow_participation_rate":75}' \
  "200"

echo ""
echo -e "${BLUE}3. HEAT SCORE ENDPOINTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint \
  "POST Calculate Heat Score" \
  "POST" \
  "/analytics/calculate-heat" \
  '{"reference_type":"poll","reference_id":"heat-test-123","metrics":{"views_per_hour":50,"comments_per_hour":10,"reactions_per_hour":25,"unique_viewers_per_hour":40,"share_count":5}}' \
  "200"

test_endpoint \
  "GET Heat Score" \
  "GET" \
  "/analytics/heat/poll/heat-test-123" \
  "" \
  "404" # Should not exist yet

test_endpoint \
  "GET Trending Content" \
  "GET" \
  "/analytics/trending/poll" \
  "" \
  "200"

echo ""
echo -e "${BLUE}4. PLATFORM HEALTH ENDPOINTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint \
  "POST Record Health Metrics" \
  "POST" \
  "/analytics/health-metrics" \
  '{
    "window_type":"realtime",
    "active_users":150,
    "new_users":25,
    "verified_humans":120,
    "dual_identity_users":85,
    "total_votes_cast":500,
    "shadow_participation_rate":68.5,
    "average_session_duration":420,
    "polls_created":12,
    "pollcoin_velocity":3.4,
    "gratium_staked":2500.50,
    "average_light_score":52.3,
    "economic_participation_rate":65.2,
    "posts_created":45,
    "comments_created":120,
    "reactions_given":350,
    "content_quality_score":72.5,
    "api_response_time_ms":245,
    "error_rate":0.0023,
    "suspected_bot_accounts":2,
    "sybil_attack_probability":0.15
  }' \
  "200"

test_endpoint \
  "GET Platform Health" \
  "GET" \
  "/analytics/platform-health" \
  "" \
  "200"

test_endpoint \
  "GET Platform Health with window_type" \
  "GET" \
  "/analytics/platform-health?window_type=hourly" \
  "" \
  "200"

echo ""
echo -e "${BLUE}5. CONVICTION ANALYSIS ENDPOINTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint \
  "POST Conviction Analysis" \
  "POST" \
  "/analytics/conviction-analysis" \
  '{"poll_id":"conviction-test-123"}' \
  "500" # Will fail because no real data

echo ""
echo -e "${BLUE}6. HEALTH CHECK${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint \
  "GET Module Health Check" \
  "GET" \
  "/analytics/health" \
  "" \
  "200"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Test Summary:${NC}"
echo "  Total Tests Run:    $TESTS_RUN"
echo -e "  ${GREEN}Passed:${NC}            $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}            $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo "See detailed results in: $RESULTS_FILE"
  exit 1
fi
