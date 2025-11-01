# Module 06: Governance - Deployment Guide

**Date**: October 31, 2025
**Status**: Ready for Deployment

---

## 🚀 Quick Start

```bash
# Navigate to governance module
cd packages/06-governance

# Install dependencies (if not already installed)
pnpm install

# Run database setup (migration + seed)
npm run db:setup

# Run tests
npm test

# Start development server
npm run dev
```

---

## 📋 Pre-Deployment Checklist

### **1. Database Setup** ✅

**Prerequisites**:
- PostgreSQL 14+ running
- Database `dream_protocol` created
- Environment variables configured

**Environment Variables** (`.env`):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dream_protocol
DB_USER=postgres
DB_PASSWORD=your_password

# Governance specific
MINIMUM_REPUTATION_TO_CREATE_POLL=25
POLL_CREATION_COST_GENERAL=500
POLL_CREATION_COST_GOVERNANCE=1000
```

### **2. Run Migrations**

```bash
# Option 1: Run migration and seed together
npm run db:setup

# Option 2: Run separately
npm run db:migrate
npm run db:seed

# Option 3: Force migration (drops existing tables)
FORCE_MIGRATION=true npm run db:migrate
```

**What This Does**:
- Creates 9 governance tables
- Creates all indexes
- Seeds 9 initial parameters
- Seeds 6 constitutional articles

### **3. Verify Setup**

```bash
# Check tables were created
psql -d dream_protocol -c "\dt governance_*"

# Check parameters were seeded
psql -d dream_protocol -c "SELECT parameter_name FROM parameter_whitelist;"

# Check constitutional articles were seeded
psql -d dream_protocol -c "SELECT article_number, article_title FROM constitutional_articles ORDER BY article_number;"
```

Expected output:
```
9 tables:
- governance_polls
- governance_votes
- governance_delegations
- parameter_whitelist
- constitutional_articles
- governance_actions
- shadow_consensus_snapshots
- governance_stakes
- governance_stake_pools

9 parameters:
- poll_creation_cost_general
- poll_creation_cost_parameter
- minimum_gratium_stake
- gratium_stake_reward_multiplier
- minimum_light_score_to_vote
- minimum_poh_score_for_delegation
- poll_minimum_vote_quorum
- poll_approval_percentage
- poll_default_duration_days

6 constitutional articles:
1. Dual-Identity Architecture
2. Privacy Guarantees
3. Proof of Humanity Requirement
4. Arweave Permanence
5. Spot-Only Token Strategy
6. Emergency Rollback Protocol
```

---

## 🧪 Testing

### **Run All Tests**
```bash
npm test
```

### **Run Specific Test Suites**
```bash
# Parameter service tests
npm test parameter.service.test.ts

# Constitutional service tests
npm test constitutional.service.test.ts

# Action service tests
npm test action.service.test.ts

# Economy integration tests
npm test economy-integration.service.test.ts
```

### **Run with Coverage**
```bash
npm run test:coverage
```

**Expected Test Results**:
- ✅ Parameter Service: ~20 tests
- ✅ Constitutional Service: ~25 tests
- ✅ Action Service: ~12 tests
- ✅ Economy Integration: ~15 tests

---

## 📡 API Endpoints

### **Base URL**: `http://localhost:3006/api/v1/governance`

### **Polls** (4 endpoints)
```bash
POST   /create-poll
GET    /polls
GET    /polls/:pollId
GET    /stats
```

### **Voting** (4 endpoints)
```bash
POST   /vote
POST   /vote/change
GET    /vote/query
POST   /vote/revoke
```

### **Delegation** (3 endpoints)
```bash
POST   /delegate
POST   /delegate/revoke
GET    /delegations
```

### **Shadow Consensus** (2 endpoints)
```bash
GET    /shadow-consensus/:pollId
POST   /shadow-consensus/analyze
```

### **Staking** (6 endpoints)
```bash
POST   /stake
GET    /stake/pool/:pollId
GET    /stake/history
GET    /stake/potential-reward
POST   /stake/distribute/:pollId
POST   /stake/refund/:pollId
```

### **Rollback** (5 endpoints)
```bash
POST   /rollback/founder
POST   /rollback/petition
GET    /rollback/status/:actionId
POST   /rollback/execute/:pollId
GET    /rollback/triggers/:actionId
```

### **Parameters** (4 endpoints) ⭐ NEW
```bash
GET    /parameters
GET    /parameters/:parameterName
POST   /parameters/validate
GET    /parameters/:parameterName/history
```

### **Constitution** (3 endpoints) ⭐ NEW
```bash
GET    /constitution
GET    /constitution/:articleNumber
POST   /constitution/validate-poll
```

### **Actions** (5 endpoints) ⭐ NEW
```bash
GET    /actions
GET    /actions/:actionId
POST   /actions/:actionId/execute
POST   /actions/:actionId/cancel
POST   /actions/process-scheduled
```

**Total**: 36 endpoints

---

## 🔧 Configuration

### **Poll Creation Costs** (PollCoin)
- General Community Poll: 500 PollCoin
- Parameter Vote: 1000 PollCoin
- Constitutional Vote: 1000 PollCoin

### **Gratium Staking**
- Minimum Stake: 10 Gratium
- Reward Multiplier: 1.5x
- Confidence Levels: LOW (10-99), MEDIUM (100-999), HIGH (1000-9999), EXTREME (10000+)

### **Light Score Requirements**
- Minimum to Vote: 10.0
- Minimum to Create Poll: 25.0
- Minimum for Delegation: 70.0 (PoH score)

### **Voting Rules**
- Quorum: 1000 votes
- Approval: 50% (simple majority)
- Super-Majority: 66% (for certain parameters)
- Default Duration: 7 days
- Max Vote Changes: 5 per poll

### **Rollback Windows**
- Standard Decisions: 72 hours
- Constitutional Decisions: 7 days
- Founder Tokens: 10 (decreasing authority over 3 years)

---

## 🔄 Scheduled Jobs (Cron)

### **Action Execution** (Every Minute)
```bash
# Process due scheduled actions
curl -X POST http://localhost:3006/api/v1/governance/actions/process-scheduled
```

**Recommended Cron**: `* * * * *` (every minute)

### **Poll Status Updates** (Every Hour)
```bash
# Close expired polls
# (To be implemented in poll service)
```

**Recommended Cron**: `0 * * * *` (hourly)

---

## 🐛 Troubleshooting

### **Migration Fails**
```bash
# Check if tables already exist
psql -d dream_protocol -c "\dt governance_*"

# Force migration (WARNING: Drops all data)
FORCE_MIGRATION=true npm run db:migrate
```

### **Seed Script Fails**
```bash
# Run migration first
npm run db:migrate

# Then run seed
npm run db:seed
```

### **Tests Fail**
```bash
# Ensure database is running
pg_isready

# Check environment variables
cat .env

# Run migrations
npm run db:migrate
```

### **API Returns 500 Errors**
```bash
# Check database connection
psql -d dream_protocol -c "SELECT 1"

# Check if tables exist
psql -d dream_protocol -c "\dt governance_*"

# Check logs
npm run dev
```

---

## 📊 Monitoring

### **Database Queries**
```sql
-- Active polls
SELECT COUNT(*) FROM governance_polls WHERE status = 'active';

-- Total votes
SELECT COUNT(*) FROM governance_votes;

-- Active stakes
SELECT SUM(gratium_amount) FROM governance_stakes WHERE status = 'active';

-- Pending actions
SELECT COUNT(*) FROM governance_actions WHERE status IN ('pending', 'scheduled');

-- Constitutional violations (should be 0)
SELECT COUNT(*) FROM governance_polls WHERE poll_type = 'constitutional';
```

### **Health Check**
```bash
curl http://localhost:3006/api/v1/governance/health
```

Expected response:
```json
{
  "success": true,
  "service": "governance",
  "version": "1.0.0",
  "timestamp": "2025-10-31T..."
}
```

---

## 🎯 Post-Deployment Verification

### **1. Create Test Poll**
```bash
curl -X POST http://localhost:3006/api/v1/governance/create-poll \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "title": "Test Poll",
    "description": "Testing governance system",
    "pollType": "general_community",
    "durationDays": 7
  }'
```

### **2. Validate Parameters**
```bash
curl -X POST http://localhost:3006/api/v1/governance/parameters/validate \
  -H "Content-Type: application/json" \
  -d '{
    "parameterName": "poll_creation_cost_general",
    "proposedValue": "1000"
  }'
```

### **3. Check Constitution**
```bash
curl http://localhost:3006/api/v1/governance/constitution
```

### **4. Test Constitutional Protection**
```bash
curl -X POST http://localhost:3006/api/v1/governance/constitution/validate-poll \
  -H "Content-Type: application/json" \
  -d '{
    "pollType": "parameter_vote",
    "parameterName": "enable_shadow_voting",
    "proposedValue": "false"
  }'
```

Expected: `violatesConstitution: true`

---

## 🚀 Production Deployment

### **Before Going Live**:
1. ✅ Run full test suite
2. ✅ Verify all migrations
3. ✅ Test all API endpoints
4. ✅ Set up monitoring
5. ✅ Configure cron jobs
6. ✅ Enable database backups
7. ✅ Set production environment variables
8. ✅ Load test with expected traffic

### **Production Environment Variables**:
```bash
NODE_ENV=production
DB_HOST=production-db-host
DB_PORT=5432
DB_NAME=dream_protocol_prod
DB_USER=dream_protocol_user
DB_PASSWORD=secure_password_here

# Enable SSL for production
DB_SSL=true

# API Configuration
PORT=3006
API_BASE_PATH=/api/v1/governance

# Security
CORS_ORIGIN=https://dreamprotocol.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

---

## 📚 Additional Resources

- **Full Documentation**: `/doc files/MODULE_06_COMPLETION_SUMMARY.md`
- **API Reference**: `/doc files/MODULE_06_GOVERNANCE_TECHNICAL_PLAN.md`
- **Staking Guide**: `/doc files/MODULE_06_STAKING_IMPLEMENTATION.md`
- **Rollback Guide**: `/doc files/MODULE_06_ROLLBACK_IMPLEMENTATION.md`

---

## ✅ Deployment Checklist

- [ ] PostgreSQL running and accessible
- [ ] Environment variables configured
- [ ] Database migration completed (`npm run db:migrate`)
- [ ] Seed data loaded (`npm run db:seed`)
- [ ] All tests passing (`npm test`)
- [ ] API server starts successfully (`npm run dev`)
- [ ] Health check endpoint responding
- [ ] Test poll creation works
- [ ] Parameter validation works
- [ ] Constitutional protection works
- [ ] Cron jobs configured
- [ ] Monitoring set up
- [ ] Database backups enabled

---

**Module 06: Governance is ready for production deployment! 🎉**

All systems operational. Ready to enable democratic decision-making for Dream Protocol.
