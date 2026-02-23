# 🚨 Docita Incident Response Guide

**Version:** 1.0  
**Last Updated:** February 14, 2026  
**Status:** Production Ready

---

## 📋 Quick Reference

### Severity Levels

| Level     | Description              | Response Time | Escalation      |
| --------- | ------------------------ | ------------- | --------------- |
| **SEV-1** | Service Down / Data Loss | < 15 minutes  | Immediate       |
| **SEV-2** | Degraded Performance     | < 1 hour      | Within 2 hours  |
| **SEV-3** | Non-Critical Bug         | < 4 hours     | Within 24 hours |
| **SEV-4** | Minor Issue              | < 24 hours    | As needed       |

### On-Call Contacts

```
Primary On-Call: [Team Member Name] - [Phone] - [Email]
Secondary On-Call: [Backup Name] - [Phone] - [Email]
Engineering Lead: [Lead Name] - [Phone] - [Email]
CEO/Escalation: [Name] - [Phone] - [Email]
```

### Critical Links

```
Sentry: https://sentry.io/organizations/docita/
Railway: https://railway.app/project/[project-id]
UptimeRobot: https://uptimerobot.com/dashboard
Slack: #docita-alerts, #docita-incidents
Status Page: [To be created]
```

---

## 1️⃣ SEV-1: Service Down / Critical Outage

### Definition

- Complete service unavailability
- Database connection failure
- Data loss or corruption
- Security breach
- Authentication system down

### Immediate Response (< 5 minutes)

**Step 1: Acknowledge & Triage**

```bash
# 1. Acknowledge in Slack
# - Post in #docita-incidents: "SEV-1 acknowledged - investigating"
# - Add 🚨 reaction to triggering alert

# 2. Verify scope
# Check UptimeRobot - which services down?
# Check Railway - service status?
# Check Sentry - error spike?
```

**Step 2: Assess Impact**

```bash
# Questions to answer:
- How many users affected? (All / Some / Specific clinic)
- What functionality broken? (Complete / Partial)
- Is data at risk? (Yes / No)
- When did it start? (Timestamp)
```

**Step 3: Initial Communication (< 5 min)**

```markdown
# Post to #docita-incidents:

🚨 **SEV-1 INCIDENT DECLARED**

**Status:** Investigating
**Impact:** [Complete service down / Database unreachable / etc.]
**Affected Users:** [All users / Specific clinics / etc.]
**Started At:** [Timestamp]
**ETA:** Investigating - update in 15 minutes

**Team:** @[on-call engineer] investigating
**Monitoring:** [Sentry link] | [Railway link]
```

### Investigation & Recovery (< 15 minutes)

**Common Scenarios & Solutions:**

#### Scenario 1: Railway Service Crashed

```bash
# 1. Check Railway logs
# Navigate to: Railway → docita-api → Logs
# Look for: Crash reason, OOM errors, uncaught exceptions

# 2. Quick fix options:
# Option A: Restart service (if transient issue)
railway service restart

# Option B: Rollback deployment (if recent deploy caused it)
railway deployment rollback

# Option C: Scale up resources (if OOM)
# Railway → Settings → Increase memory limit

# 3. Verify recovery
curl https://api.docita.work/api/health
# Expected: 200 OK with status "up"
```

#### Scenario 2: Database Connection Lost

```bash
# 1. Check Railway database status
# Railway → PostgreSQL → Metrics
# Look for: Connection pool exhausted, disk full, crashed

# 2. Quick fixes:
# Option A: Database restart (use with caution)
# Railway → PostgreSQL → Restart

# Option B: Connection pool reset
# Railway → API service → Restart

# 3. Verify database health
curl https://api.docita.work/api/health/db
# Expected: {"status":"up","database":"connected"}
```

#### Scenario 3: Redis Connection Lost

```bash
# 1. Check Redis status
# Railway → Redis → Metrics

# 2. Quick fix:
# Restart Redis instance
# Railway → Redis → Restart

# 3. Verify recovery
curl https://api.docita.work/api/health/redis
# Expected: {"status":"up","redis":"connected"}
```

#### Scenario 4: Frontend Deploy Failed

```bash
# 1. Check Vercel deployment logs
# Vercel → Deployments → [Latest] → Logs

# 2. Quick fix:
# Rollback to last good deployment
vercel rollback

# Or re-deploy from main branch
vercel deploy --prod

# 3. Verify frontend loads
curl https://app.docita.work
# Expected: 200 OK with HTML content
```

### Recovery Verification (< 5 minutes)

```bash
# Run full health check suite:

# 1. API health
curl https://api.docita.work/api/health
# Expected: 200 OK

# 2. Database health
curl https://api.docita.work/api/health/db
# Expected: status "up"

# 3. Redis health
curl https://api.docita.work/api/health/redis
# Expected: status "up"

# 4. Frontend loads
curl https://app.docita.work
# Expected: 200 OK

# 5. Login flow works
# Manual test: Try logging in at app.docita.work

# 6. Check Sentry
# Verify: Error rate returned to normal
```

### Communication Updates

**During Investigation (every 15 minutes):**

```markdown
**UPDATE - [Timestamp]**
Status: [Investigating / Identified / Fixing / Recovering]
Details: [What we found / What we're doing]
ETA: [Updated estimate]
```

**Resolution Message:**

```markdown
🎉 **SEV-1 RESOLVED**

**Duration:** [X minutes]
**Root Cause:** [Brief explanation]
**Resolution:** [What we did]
**Prevention:** [What we'll do to prevent recurrence]

**Impact:**

- Users affected: [Number / All / Specific]
- Downtime: [Duration]
- Data loss: [None / Details]

**Next Steps:**

- [ ] Post-incident review scheduled: [Date/Time]
- [ ] RCA document: [Link when ready]

**Status:** All systems operational ✅
```

---

## 2️⃣ SEV-2: Degraded Performance

### Definition

- Slow response times (p95 > 2s)
- High error rate (5-10%)
- Partial feature unavailability
- Single region/clinic affected

### Response Process (< 1 hour)

**Step 1: Acknowledge & Assess**

```bash
# 1. Check Sentry performance
# Look for: Slow transactions, N+1 queries, high p95

# 2. Check Railway metrics
# Look for: CPU usage, memory usage, slow queries

# 3. Determine scope
# Is it: All users / Specific clinic / Specific feature?
```

**Step 2: Common Causes & Fixes**

#### High CPU Usage

```bash
# 1. Check Railway → Metrics → CPU
# If > 80%:

# Option A: Scale up
# Railway → Settings → Increase CPU allocation

# Option B: Identify expensive queries
# Check Sentry → Performance → Slowest transactions
# Review and optimize queries

# Option C: Add caching
# Implement Redis caching for expensive operations
```

#### Slow Database Queries

```bash
# 1. Check Sentry → Performance → Database queries
# Identify: Queries > 500ms

# 2. Quick fixes:
# - Add missing indexes
# - Optimize N+1 queries
# - Add Redis caching

# 3. Apply fix and monitor
```

#### Memory Leak

```bash
# 1. Check Railway → Memory usage trending up
# 2. Restart service (temporary fix)
railway service restart

# 3. Investigate code for leak
# Check: Event listeners, intervals, unclosed connections
```

**Step 3: Communication**

```markdown
⚠️ **SEV-2: PERFORMANCE DEGRADATION**

**Impact:** Slow response times for [affected area]
**Status:** Investigating / Fixing
**Workaround:** [If available]
**ETA:** [Estimate]
```

---

## 3️⃣ SEV-3: Non-Critical Bug

### Definition

- Feature bug affecting some users
- UI/UX issue
- Non-blocking error
- Workaround available

### Response Process (< 4 hours)

**Step 1: Triage**

```bash
# Assess:
1. How many users affected?
2. Is there a workaround?
3. Is it blocking any critical workflow?
4. Can it wait for next release?
```

**Step 2: Document**

```bash
# Create GitHub issue with:
- Description
- Steps to reproduce
- Affected users
- Workaround (if any)
- Priority label
```

**Step 3: Fix or Schedule**

```bash
# If urgent: Fix in hotfix release
# If can wait: Schedule for next sprint

# Apply appropriate label:
- bug/high - Fix in next hotfix
- bug/medium - Fix in next release
- bug/low - Backlog
```

---

## 4️⃣ SEV-4: Minor Issue

### Definition

- Cosmetic issues
- Documentation errors
- Minor feature requests
- Non-urgent improvements

### Response Process (< 24 hours)

```bash
# 1. Create ticket in backlog
# 2. Prioritize in next planning
# 3. No immediate action required
```

---

## 🔄 Post-Incident Review Process

### Required for SEV-1 and SEV-2

**Schedule:** Within 48 hours of incident resolution

**Attendees:**

- On-call engineer who responded
- Engineering lead
- Product manager
- Anyone affected by incident

**Agenda:**

1. **Incident Timeline** (10 min)
   - When detected
   - When acknowledged
   - Actions taken
   - When resolved

2. **Root Cause Analysis** (15 min)
   - What happened?
   - Why did it happen?
   - What was the contributing factor?

3. **Impact Assessment** (10 min)
   - Users affected
   - Revenue impact
   - Data impact
   - Reputation impact

4. **What Went Well** (10 min)
   - Quick detection?
   - Fast response?
   - Good communication?
   - Effective fix?

5. **What Could Be Better** (15 min)
   - Detection gaps?
   - Response gaps?
   - Missing playbooks?
   - Tool limitations?

6. **Action Items** (10 min)
   - Preventive measures
   - Monitoring improvements
   - Documentation updates
   - Process changes

### Post-Incident Report Template

```markdown
# Post-Incident Review: [Incident Title]

**Date:** [Incident Date]
**Severity:** SEV-[1/2]
**Duration:** [X hours Y minutes]
**Status:** Resolved

## Summary

[One paragraph explaining what happened]

## Timeline

- **[Time]** - Incident detected (UptimeRobot alert)
- **[Time]** - SEV-1 declared, team notified
- **[Time]** - Root cause identified
- **[Time]** - Fix deployed
- **[Time]** - Service recovered
- **[Time]** - Incident closed

## Root Cause

[Detailed explanation of what caused the incident]

## Impact

- **Users Affected:** [Number / Percentage]
- **Duration:** [Downtime in minutes]
- **Features Affected:** [List]
- **Data Loss:** [None / Details]
- **Revenue Impact:** [Estimate if applicable]

## Resolution

[What we did to fix it]

## Prevention

[What we'll do to prevent this from happening again]

## Action Items

- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]
- [ ] [Action 3] - Owner: [Name] - Due: [Date]

## Lessons Learned

**What Went Well:**

- [Point 1]
- [Point 2]

**What Could Be Better:**

- [Point 1]
- [Point 2]

## References

- Sentry: [Link]
- Railway Logs: [Link]
- Slack Thread: [Link]
```

---

## 📞 Escalation Procedures

### When to Escalate

**Escalate to Engineering Lead if:**

- Incident unresolved after 30 minutes
- Need additional engineering resources
- Unsure how to proceed
- Complex technical decision required

**Escalate to CEO/Founder if:**

- Data breach or security incident
- Potential legal/compliance issue
- Major customer impact (> 50% users)
- Incident duration > 2 hours
- Media/PR implications

### Escalation Contact Chain

```
1. On-Call Engineer (Primary responder)
   ↓ (if needed after 30 min)
2. Secondary On-Call / Engineering Lead
   ↓ (if SEV-1 or security/legal issue)
3. CTO / VP Engineering
   ↓ (if major business impact)
4. CEO / Founder
```

---

## 🛠️ Useful Commands & Scripts

### Health Check Script

```bash
#!/bin/bash
# File: scripts/health-check.sh

echo "🏥 Docita Health Check"
echo "====================="

# API Health
echo -n "API Health: "
curl -s https://api.docita.work/api/health | jq -r '.status'

# Database Health
echo -n "Database Health: "
curl -s https://api.docita.work/api/health/db | jq -r '.database'

# Redis Health
echo -n "Redis Health: "
curl -s https://api.docita.work/api/health/redis | jq -r '.redis'

# Frontend
echo -n "Frontend: "
curl -s -o /dev/null -w "%{http_code}" https://app.docita.work
echo ""
```

### Quick Rollback

```bash
#!/bin/bash
# File: scripts/emergency-rollback.sh

echo "🔄 Emergency Rollback"

# Backend (Railway)
echo "Rolling back API..."
railway deployment rollback

# Frontend (Vercel)
echo "Rolling back frontend..."
vercel rollback

echo "✅ Rollback complete"
echo "⏰ Wait 2 minutes for propagation"
```

### Database Connection Test

```bash
#!/bin/bash
# File: scripts/test-db-connection.sh

echo "🗄️ Testing Database Connection"

# Using psql
psql $DATABASE_URL -c "SELECT 1;"

# Or via API
curl https://api.docita.work/api/health/db
```

---

## 📚 Related Documentation

- [MONITORING_SETUP_GUIDE.md](MONITORING_SETUP_GUIDE.md) - Monitoring setup
- [LAUNCH_READY_FINAL.md](LAUNCH_READY_FINAL.md) - Launch procedures
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide
- [ON_CALL_RUNBOOK.md](docs/ON_CALL_RUNBOOK.md) - On-call procedures (to be created)

---

## ✅ Incident Response Checklist

### During Incident

- [ ] Acknowledged alert in Slack
- [ ] SEV level declared
- [ ] Initial status posted to #docita-incidents
- [ ] Impact assessed (users, features, data)
- [ ] On-call team notified
- [ ] Investigation started
- [ ] Updates posted every 15 min (SEV-1) or 30 min (SEV-2)
- [ ] Root cause identified
- [ ] Fix deployed
- [ ] Recovery verified
- [ ] All health checks passing
- [ ] Resolution message posted
- [ ] Customers notified (if needed)

### Post-Incident

- [ ] Post-incident review scheduled
- [ ] Timeline documented
- [ ] Root cause documented
- [ ] Impact quantified
- [ ] RCA document created
- [ ] Action items assigned
- [ ] Prevention measures planned
- [ ] Monitoring/alerting updated
- [ ] Documentation updated
- [ ] Team debrief completed

---

**Remember:** Stay calm, communicate clearly, and focus on recovery first. We've got this! 💪

---

**Last Updated:** February 14, 2026  
**Next Review:** After first production incident  
**Owner:** Engineering Team
