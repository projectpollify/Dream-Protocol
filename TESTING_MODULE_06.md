# Testing Module 06: Governance API

## Quick Access URLs (Open in Browser)

**Server Running:** http://localhost:3005

### GET Endpoints (Click to Test)
1. **Health Check**: http://localhost:3005/health
2. **All Parameters**: http://localhost:3005/api/v1/governance/parameters
3. **Constitution**: http://localhost:3005/api/v1/governance/constitution
4. **Governance Stats**: http://localhost:3005/api/v1/governance/stats
5. **All Actions**: http://localhost:3005/api/v1/governance/actions

---

## Import Postman Collection

**File Location**: `/Users/shawn/Desktop/dreamprotocol/Module-06-Governance-API.postman_collection.json`

### How to Import:
1. Open Postman
2. Click "Import" button (top left)
3. Select the file: `Module-06-Governance-API.postman_collection.json`
4. You'll get all 36 endpoints organized by category

### Categories in Collection:
- **Health & Info** (1 endpoint)
- **Polls** (4 endpoints)
- **Voting** (4 endpoints)
- **Delegation** (3 endpoints)
- **Shadow Consensus** (2 endpoints)
- **Staking** (6 endpoints)
- **Rollback** (5 endpoints)
- **Parameters** (4 endpoints) ⭐
- **Constitution** (3 endpoints) ⭐
- **Actions** (5 endpoints)

**Total: 36 endpoints**

---

## Quick cURL Tests

### 1. Health Check
```bash
curl http://localhost:3005/health | python3 -m json.tool
```

### 2. Get All Parameters
```bash
curl http://localhost:3005/api/v1/governance/parameters | python3 -m json.tool
```

### 3. Get Constitution
```bash
curl http://localhost:3005/api/v1/governance/constitution | python3 -m json.tool
```

### 4. Test Constitutional Protection (Should BLOCK this)
```bash
curl -X POST http://localhost:3005/api/v1/governance/constitution/validate-poll \
  -H "Content-Type: application/json" \
  -d '{
    "pollType": "parameter_vote",
    "parameterName": "enable_shadow_voting",
    "proposedValue": "false"
  }' | python3 -m json.tool
```

**Expected Result**: `"violatesConstitution": true`

### 5. Test Valid Parameter Change (Should ALLOW this)
```bash
curl -X POST http://localhost:3005/api/v1/governance/constitution/validate-poll \
  -H "Content-Type: application/json" \
  -d '{
    "pollType": "parameter_vote",
    "parameterName": "poll_creation_cost_general",
    "proposedValue": "1000"
  }' | python3 -m json.tool
```

**Expected Result**: `"violatesConstitution": false`

### 6. Get Specific Parameter
```bash
curl http://localhost:3005/api/v1/governance/parameters/poll_creation_cost_general | python3 -m json.tool
```

### 7. Get Specific Constitutional Article
```bash
curl http://localhost:3005/api/v1/governance/constitution/1 | python3 -m json.tool
```

---

## What's Working ✅

### Database
- ✅ 9 tables created
- ✅ 9 parameters seeded
- ✅ 6 constitutional articles seeded
- ✅ All migrations successful

### API Endpoints
- ✅ Health check responding
- ✅ Parameters API working (9 parameters)
- ✅ Constitution API working (6 articles)
- ✅ Constitutional validation working
- ✅ All 36 endpoints available

### Tests
- ✅ 51/51 core tests passing
- ✅ Parameter Service: 17 tests
- ✅ Constitutional Service: 20 tests
- ✅ Governance Unit: 14 tests

---

## What's NOT Working Yet ⚠️

### Integration Tests
Some integration tests fail because they depend on other modules:
- ❌ Tests requiring `users` table (Module 03: User)
- ❌ Tests requiring `token_ledger` table (Module 04: Economy)

**These will pass once Modules 03 and 04 are deployed.**

### Features Not Testable Yet
- Poll creation (needs user authentication from Module 03)
- Voting (needs user + token balance from Modules 03 & 04)
- Staking (needs Gratium tokens from Module 04)
- Actual governance actions (needs full integration)

---

## Next Steps

### Option A: Test with Postman
1. Import the collection
2. Test all GET endpoints
3. View the data structures
4. Understand the API design

### Option B: Build Simple Frontend
1. Create a Next.js app in `apps/flagship`
2. Display parameters and constitution
3. Show how governance works visually

### Option C: Continue Backend Development
1. Build Module 07: Content (posts, discussions)
2. Build Module 08: Social (follows, reactions)
3. Come back to governance integration later

---

## Server Status

**Running on**: http://localhost:3005
**Started at**: Check terminal output
**PID**: Run `ps aux | grep "tsx watch src/index.ts"` to find process

### Stop Server:
```bash
# Find and kill the process
pkill -f "tsx watch src/index.ts"
```

### Restart Server:
```bash
cd packages/06-governance
npm run dev
```

---

## Database Access

### View Parameters:
```bash
psql -d dreamprotocol -c "SELECT parameter_name, current_value FROM parameter_whitelist ORDER BY parameter_name"
```

### View Constitution:
```bash
psql -d dreamprotocol -c "SELECT article_number, article_title FROM constitutional_articles ORDER BY article_number"
```

### View All Governance Tables:
```bash
psql -d dreamprotocol -c "\dt governance_*"
```

---

**Module 06 is fully deployed and ready for testing! 🎉**
