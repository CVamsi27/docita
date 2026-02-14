# 📞 Docita On-Call Runbook

**Version:** 1.0  
**Last Updated:** February 14, 2026  
**Purpose:** Quick reference guide for on-call engineers

---

## 🎯 On-Call Quick Start

### Your Responsibilities
- Monitor #docita-alerts channel 24/7
- Respond to incidents within 15 minutes
- Escalate when needed
- Document all incidents
- Maintain system health

### Tools You Need
- [ ] Laptop with VPN access
- [ ] Slack mobile app (notifications ON)
- [ ] Access to Railway dashboard
- [ ] Access to Sentry dashboard
- [ ] Access to Vercel dashboard
- [ ] Access to UptimeRobot
- [ ] Emergency contact list

---

## 🚨 When You Get Alerted

### Step 1: Acknowledge (< 2 minutes)
```markdown
1. See alert in #docita-alerts
2. Add 👀 emoji reaction (I'm looking)
3. Check: Sentry / UptimeRobot / Railway
4. Assess severity (SEV-1/2/3/4)
```

### Step 2: Respond (< 15 minutes)
```markdown
For SEV-1 (Service Down):
→ Follow INCIDENT_RESPONSE.md → SEV-1 section
→ Post status update immediately
→ Call secondary on-call if needed

For SEV-2 (Degraded):
→ Follow INCIDENT_RESPONSE.md → SEV-2 section
→ Post status update within 15 min

For SEV-3/4:
→ Create ticket
→ Acknowledge in Slack
→ Handle during business hours
```

---

## 📋 Common Alerts & Quick Fixes

### Alert: "Service Down" (UptimeRobot)

**Severity:** SEV-1  
**Response Time:** < 5 minutes

**Quick Diagnosis:**
```bash
# 1. Check which service
# UptimeRobot shows: API / Frontend / Database

# 2. Check Railway status
# Railway → docita-api → Status

# 3. Check recent deployments
# Railway → Deployments → Last 5
```

**Quick Fix:**
```bash
# Option 1: Service crashed → Restart
railway service restart

# Option 2: Bad deployment → Rollback
railway deployment rollback

# Option 3: Resource issue → Scale up
# Railway → Settings → Increase limits

# Verify fix:
curl https://api.docita.com/api/health
```

---

### Alert: "High Error Rate" (Sentry)

**Severity:** SEV-2  
**Response Time:** < 1 hour

**Quick Diagnosis:**
```bash
# 1. Open Sentry
# Check: Which error? How many affected?

# 2. Common issues:
# - Database connection errors
# - External API failures
# - Authentication errors
# - Validation errors
```

**Quick Fix:**
```bash
# If database errors:
# → Check Railway PostgreSQL status
# → Restart if needed

# If external API:
# → Check third-party status
# → Enable fallback/cache if available

# If authentication:
# → Check Redis status
# → Verify JWT_SECRET env var
```

---

### Alert: "Performance Degradation" (Sentry)

**Severity:** SEV-2  
**Response Time:** < 1 hour

**Quick Diagnosis:**
```bash
# 1. Check Sentry → Performance
# Look for: Slow transactions (> 2s)

# 2. Check Railway → Metrics
# CPU > 80%? Memory > 85%?

# 3. Check for:
# - Slow database queries
# - N+1 query problems
# - Memory leaks
```

**Quick Fix:**
```bash
# If high CPU/Memory:
railway service restart  # Temporary

# If slow queries:
# → Identify in Sentry
# → Add to backlog for optimization

# If memory leak:
# → Restart service (immediate)
# → Create ticket for investigation
```

---

### Alert: "Database Connection Lost" (API Health Check)

**Severity:** SEV-1  
**Response Time:** < 5 minutes

**Quick Diagnosis:**
```bash
# 1. Check Railway → PostgreSQL
# Status: Running / Crashed?

# 2. Test connection:
curl https://api.docita.com/api/health/db

# 3. Check connection pool:
# Railway → PostgreSQL → Connections
```

**Quick Fix:**
```bash
# Option 1: Connection pool exhausted
# → Restart API service
railway service restart

# Option 2: Database crashed
# → Restart PostgreSQL (use caution!)
# Railway → PostgreSQL → Restart

# Option 3: Connection limit reached
# → Increase connection limit
# Railway → PostgreSQL → Settings
```

---

### Alert: "Redis Connection Lost"

**Severity:** SEV-2  
**Response Time:** < 30 minutes

**Quick Diagnosis:**
```bash
# 1. Check Railway → Redis status
# 2. Test connection:
curl https://api.docita.com/api/health/redis
```

**Quick Fix:**
```bash
# Restart Redis:
# Railway → Redis → Restart

# Verify recovery:
curl https://api.docita.com/api/health/redis

# Note: Cache will rebuild automatically
```

---

### Alert: "Deployment Failed" (Vercel/Railway)

**Severity:** SEV-2  
**Response Time:** < 30 minutes

**Quick Diagnosis:**
```bash
# 1. Check deployment logs
# Vercel → Deployments → [Failed] → Logs
# or
# Railway → Deployments → [Failed] → Logs

# 2. Common issues:
# - Build error
# - Missing environment variables
# - TypeScript errors
# - Test failures
```

**Quick Fix:**
```bash
# Option 1: Rollback to last good deployment
vercel rollback  # or railway rollback

# Option 2: Fix and redeploy
# → Fix issue in code
# → Push to main branch

# Option 3: Manual deployment
vercel deploy --prod
```

---

## 🔍 Health Check Procedures

### Quick System Health Check (< 2 minutes)

```bash
#!/bin/bash
# Run this when you come on-call

echo "=== Docita Health Check ==="

# API
echo -n "API: "
curl -s https://api.docita.com/api/health | jq -r '.status'

# Database
echo -n "DB: "
curl -s https://api.docita.com/api/health/db | jq -r '.database'

# Redis
echo -n "Redis: "
curl -s https://api.docita.com/api/health/redis | jq -r '.redis'

# Frontend
echo -n "App: "
curl -s -o /dev/null -w "%{http_code}\n" https://app.docita.com

echo "==========================="
```

### Deep Health Check (< 5 minutes)

```bash
# 1. Check all monitors in UptimeRobot
# All should show "Up" (green)

# 2. Check Sentry error rate
# Last hour: < 10 errors

# 3. Check Railway metrics
# CPU: < 60%
# Memory: < 70%
# Disk: < 80%

# 4. Check recent deployments
# Last deployment: Successful?

# 5. Spot check: Try logging in
# Visit: https://app.docita.com
# Login with test account
# Verify dashboard loads
```

---

## 📞 Escalation Guide

### When to Escalate

**Escalate to Secondary On-Call if:**
- You're stuck after 30 minutes
- Need help with diagnosis
- Unfamiliar with affected system
- Need someone to verify your fix

**Escalate to Engineering Lead if:**
- Incident unresolved after 1 hour
- Need architectural decision
- Considering major change (schema, infrastructure)
- Multiple systems affected

**Escalate to CTO/CEO if:**
- Security breach suspected
- Data loss occurred
- Duration > 2 hours
- Major customer escalation
- Legal/compliance concerns

### How to Escalate

```markdown
# In Slack #docita-incidents:

🚨 **ESCALATION NEEDED**

@[person-to-escalate-to]

**Incident:** [Brief description]
**Duration:** [X minutes so far]
**Severity:** SEV-[1/2/3]
**Status:** [What you've tried]
**Blocker:** [Why you need help]
**Request:** [What you need]

[Link to Sentry] | [Link to Railway logs]
```

---

## 🛠️ Useful Tools & Commands

### Railway Quick Commands

```bash
# Login
railway login

# List projects
railway list

# Select project
railway link

# View logs (live)
railway logs -f

# Restart service
railway service restart

# Rollback deployment
railway deployment rollback

# Check environment variables
railway vars
```

### Vercel Quick Commands

```bash
# Login
vercel login

# List deployments
vercel list

# Rollback to previous
vercel rollback

# View logs
vercel logs

# Deploy current branch
vercel deploy --prod
```

### Database Quick Checks

```bash
# Connect to production database
psql $DATABASE_URL

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, state, wait_event 
FROM pg_stat_activity 
WHERE state != 'idle' 
AND query_start < NOW() - INTERVAL '5 seconds';

# Check database size
SELECT pg_size_pretty(pg_database_size('docita'));
```

### Log Analysis

```bash
# View Railway API logs (last 100 lines)
railway logs --lines 100

# Search for errors
railway logs | grep -i error

# Search for specific endpoint
railway logs | grep "/api/appointments"

# Export logs for analysis
railway logs --lines 1000 > incident-logs.txt
```

---

## 📊 Monitoring Dashboards

### Daily Check (Morning Routine - 5 minutes)

```markdown
**Every Morning Before Handoff:**

1. **UptimeRobot** - All monitors up?
   - API: ✅
   - Database: ✅
   - Redis: ✅
   - Frontend: ✅

2. **Sentry** - Error rate normal?
   - Last 24h: < 50 errors
   - No critical errors

3. **Railway** - Resource usage OK?
   - CPU: < 60%
   - Memory: < 70%
   - Disk: < 80%

4. **Overnight Alerts** - Any issues?
   - Check #docita-alerts
   - Resolve or document

5. **Handoff Notes** - Anything to share?
   - Post in #docita-oncall
```

### Weekly Review (15 minutes)

```markdown
**Weekly On-Call Summary:**

**Period:** [Start Date] - [End Date]
**On-Call Engineer:** [Your Name]

**Incidents:**
- SEV-1: [Count] - [Brief description]
- SEV-2: [Count] - [Brief description]
- SEV-3/4: [Count]

**Uptime:** [XX.XX%] (Target: 99.9%)

**Top Issues:**
1. [Issue 1] - [Frequency]
2. [Issue 2] - [Frequency]
3. [Issue 3] - [Frequency]

**Action Items:**
- [ ] [Item 1]
- [ ] [Item 2]

**Notes for Next On-Call:**
- [Any ongoing issues]
- [Scheduled maintenance]
- [Watch items]
```

---

## 🎯 On-Call Best Practices

### Do's ✅
- Acknowledge alerts within 15 minutes
- Document everything in Slack threads
- Update status every 15-30 minutes
- Ask for help when stuck
- Create tickets for recurring issues
- Keep recovery scripts updated
- Test your fixes in staging first (if time allows)
- Communicate clearly with users

### Don'ts ❌
- Don't ignore alerts
- Don't make database changes without backup
- Don't deploy untested fixes
- Don't skip documentation
- Don't forget to update status
- Don't suffer in silence - escalate!
- Don't leave incidents unresolved during handoff

---

## 📝 Incident Documentation Template

**For Every Incident (SEV-1 and SEV-2):**

```markdown
# Incident: [Brief Title]

**Date:** [YYYY-MM-DD]
**Time:** [HH:MM] - [HH:MM]
**Duration:** [X minutes]
**Severity:** SEV-[1/2/3]
**On-Call:** [Your Name]

## What Happened
[2-3 sentences describing the incident]

## Detection
- **How detected:** [UptimeRobot / Sentry / User report]
- **Alert link:** [Link]

## Timeline
- **[HH:MM]** - Alert received
- **[HH:MM]** - Investigation started
- **[HH:MM]** - Root cause identified
- **[HH:MM]** - Fix applied
- **[HH:MM]** - Verified recovery
- **[HH:MM]** - Incident closed

## Root Cause
[What caused it]

## Fix Applied
[What you did to fix it]

## Prevention
[What can prevent this in future]

## Links
- Sentry: [link]
- Railway logs: [link]
- Slack thread: [link]
```

---

## 🆘 Emergency Contacts

```
Primary On-Call: [Name] - [Phone] - [Email]
Secondary On-Call: [Name] - [Phone] - [Email]
Engineering Lead: [Name] - [Phone] - [Email]
CTO: [Name] - [Phone] - [Email]
CEO: [Name] - [Phone] - [Email]

External Support:
- Railway Support: support@railway.app
- Vercel Support: support@vercel.com
- Sentry Support: support@sentry.io
```

---

## 📚 Related Resources

- [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) - Detailed incident procedures
- [MONITORING_SETUP_GUIDE.md](MONITORING_SETUP_GUIDE.md) - Monitoring configuration
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment procedures
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

---

## ✅ On-Call Checklist

### Starting Your Shift
- [ ] Laptop charged and ready
- [ ] VPN working
- [ ] Slack mobile notifications ON
- [ ] Access to all dashboards verified
- [ ] Emergency contacts list updated
- [ ] Review handoff notes from previous on-call
- [ ] Run health check script
- [ ] Check #docita-alerts for any overnight issues
- [ ] Post in #docita-oncall: "On-call now through [end date]"

### During Your Shift
- [ ] Monitor #docita-alerts continuously
- [ ] Check dashboards 2x per day (morning/evening)
- [ ] Respond to all alerts within 15 minutes
- [ ] Document all incidents
- [ ] Create tickets for issues
- [ ] Keep team updated on any ongoing incidents

### Ending Your Shift
- [ ] Run final health check
- [ ] Document any ongoing issues
- [ ] Create handoff notes for next on-call
- [ ] Post weekly summary in #docita-oncall
- [ ] Transfer on-call badge in Slack
- [ ] Ensure next on-call acknowledges

---

**Remember: You're not alone! The team is here to help. When in doubt, escalate early.**

**Last Updated:** February 14, 2026  
**Next Review:** After 1 month of production  
**Owner:** Engineering Team
