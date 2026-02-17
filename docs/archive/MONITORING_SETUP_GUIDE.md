# 📊 Enhanced Monitoring Setup Guide (Option B)

**Target Completion:** Before Feb 19, 2026 Launch  
**Estimated Time:** 2 hours  
**Monitoring Stack:** Sentry + UptimeRobot + Slack + Railway

---

## 🎯 Overview

This guide walks you through setting up **Option B: Enhanced Monitoring** for Docita — the industry-standard monitoring setup for production SaaS applications.

### What's Included
- ✅ Sentry error tracking (frontend + backend)
- ✅ UptimeRobot uptime monitoring
- ✅ Slack integration for real-time alerts
- ✅ Railway metrics dashboards
- ✅ Performance tracking

### Why Option B?
- Industry standard for production SaaS
- Perfect balance of coverage vs. setup time
- Real-time alerts for critical issues
- Peace of mind without complexity
- Free tiers available for all services

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Docita API deployed to Railway (or staging URL)
- [ ] Admin access to Docita Slack workspace
- [ ] Email for alert notifications
- [ ] Sentry account (free tier available)
- [ ] UptimeRobot account (free tier available)

---

## 1️⃣ Configure Sentry Alerts (30 minutes)

### Step 1.1: Access Sentry Dashboard
```bash
# Navigate to: https://sentry.io
# Login with your Docita Sentry account
# Select your project: docita-api (backend) and docita-app (frontend)
```

### Step 1.2: Configure Error Rate Alerts
```bash
# For Backend (docita-api):
# 1. Go to Alerts → Create Alert Rule
# 2. Choose "Issues" alert type
# 3. Configure:
   - When: An event is seen
   - Filter: error.type equals Error
   - Frequency: 10 errors in 1 minute
   - Action: Send email + Slack notification
   
# Name: "High Error Rate - Backend"
# Save alert
```

### Step 1.3: Configure Critical Error Alerts
```bash
# For Both Projects:
# 1. Go to Alerts → Create Alert Rule
# 2. Choose "Issues" alert type
# 3. Configure:
   - When: An event is seen
   - Filter: level equals fatal OR http.status_code equals 500
   - Frequency: 1 error
   - Action: Send email + Slack notification (immediate)
   
# Name: "Critical Error - Immediate Alert"
# Save alert
```

### Step 1.4: Configure Performance Degradation Alerts
```bash
# For Backend (docita-api):
# 1. Go to Alerts → Create Alert Rule
# 2. Choose "Metric" alert type
# 3. Configure:
   - Metric: p95(transaction.duration)
   - When: Above threshold
   - Threshold: 2000ms (2 seconds)
   - Time window: 10 minutes
   - Action: Send email notification
   
# Name: "Performance Degradation - P95"
# Save alert
```

### Step 1.5: Verify Sentry Configuration
```bash
# Test error tracking:
# Backend: Trigger a test error
curl -X POST https://api.docita.work/api/health/test-error \
  -H "Content-Type: application/json"

# Frontend: Open browser console
# Navigate to: https://app.docita.work
# In console: throw new Error("Sentry test error")

# Expected: Error appears in Sentry dashboard within 30 seconds
```

**✅ Checkpoint:** Sentry dashboard shows test errors

---

## 2️⃣ Set Up UptimeRobot (15 minutes)

### Step 2.1: Create Account
```bash
# Navigate to: https://uptimerobot.com
# Sign up for free account (50 monitors included)
# Verify email
```

### Step 2.2: Create API Health Monitor
```bash
# 1. Click "+ Add New Monitor"
# 2. Configure:
   - Monitor Type: HTTPS
   - Friendly Name: "Docita API - Health Check"
   - URL: https://api.docita.work/api/health
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds
   
# 3. Click "Create Monitor"
```

### Step 2.3: Create Database Health Monitor
```bash
# 1. Click "+ Add New Monitor"
# 2. Configure:
   - Monitor Type: HTTPS
   - Friendly Name: "Docita API - Database Health"
   - URL: https://api.docita.work/api/health/db
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds
   - Keyword: "status":"up"
   
# 3. Click "Create Monitor"
```

### Step 2.4: Create Redis Health Monitor
```bash
# 1. Click "+ Add New Monitor"
# 2. Configure:
   - Monitor Type: HTTPS
   - Friendly Name: "Docita API - Redis Health"
   - URL: https://api.docita.work/api/health/redis
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds
   - Keyword: "status":"up"
   
# 3. Click "Create Monitor"
```

### Step 2.5: Create Frontend Monitor
```bash
# 1. Click "+ Add New Monitor"
# 2. Configure:
   - Monitor Type: HTTPS
   - Friendly Name: "Docita App - Frontend"
   - URL: https://app.docita.work
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds
   
# 3. Click "Create Monitor"
```

### Step 2.6: Configure Alert Contacts
```bash
# 1. Go to "My Settings" → "Alert Contacts"
# 2. Add Email:
   - Type: Email
   - Email: your-team-email@docita.work
   - Verify email
   
# 3. Add Slack (we'll get webhook in next section)
# 4. Apply to all monitors
```

**✅ Checkpoint:** 4 monitors created and showing "Up" status

---

## 3️⃣ Configure Slack Integration (30 minutes)

### Step 3.1: Create Slack Channel
```bash
# In Slack:
# 1. Create channel: #docita-alerts
# 2. Set description: "Production monitoring alerts for Docita"
# 3. Invite team members
```

### Step 3.2: Set Up Sentry → Slack Integration
```bash
# In Sentry:
# 1. Go to Settings → Integrations
# 2. Find "Slack" → Click "Add to Slack"
# 3. Authorize Sentry app
# 4. Choose channel: #docita-alerts
# 5. Configure notification preferences:
   - Send alerts for: Critical issues, High error rates
   - Frequency: Real-time (no batching)
   
# 6. Test integration:
# Settings → Integrations → Slack → "Send Test Notification"
```

### Step 3.3: Set Up UptimeRobot → Slack Integration
```bash
# In Slack:
# 1. Go to #docita-alerts channel
# 2. Click channel name → Integrations → "Add an App"
# 3. Search "Incoming WebHooks" → Add
# 4. Copy Webhook URL (looks like: https://hooks.slack.com/services/xxx/yyy/zzz)

# In UptimeRobot:
# 1. Go to "My Settings" → "Alert Contacts"
# 2. Click "Add Alert Contact"
# 3. Choose "Webhook"
# 4. Configure:
   - Friendly Name: "Slack - #docita-alerts"
   - URL: [Paste Slack webhook URL]
   - POST Value:
     {
       "text": "*Monitor: *name** *status*\n*Reason:* *alertDetails*\n*Time:* *alertDateTime*"
     }
   
# 5. Save and apply to monitors
```

### Step 3.4: Set Up Railway → Slack (Optional)
```bash
# If Railway supports webhooks:
# 1. In Railway project → Settings → Webhooks
# 2. Add webhook URL: [Slack webhook URL]
# 3. Configure events: Deployment failures, Service crashes
```

### Step 3.5: Create Alert Runbook in Slack
```markdown
# Post this message in #docita-alerts (pinned):

🚨 **DOCITA ALERTS - RUNBOOK** 🚨

**Alert Types:**
1. 🔴 **Critical Error** (Sentry) - Immediate action required
   - Severity: CRITICAL
   - Response time: < 15 minutes
   - Action: Check Sentry dashboard, investigate error

2. 🟡 **High Error Rate** (Sentry)
   - Severity: HIGH
   - Response time: < 1 hour
   - Action: Review error patterns, check for deployment issues

3. ⚫ **Service Down** (UptimeRobot)
   - Severity: CRITICAL
   - Response time: < 5 minutes
   - Action: Check Railway dashboard, verify deployments

4. 🟠 **Performance Degradation** (Sentry)
   - Severity: MEDIUM
   - Response time: < 4 hours
   - Action: Review slow queries, check resource usage

**On-Call Rotation:** [Add your team schedule]
**Escalation Path:** [Add escalation contacts]
**Incident Response:** See INCIDENT_RESPONSE.md
```

**✅ Checkpoint:** Test alerts received in #docita-alerts channel

---

## 4️⃣ Set Up Railway Dashboards (30 minutes)

### Step 4.1: Access Railway Metrics
```bash
# Navigate to Railway dashboard
# Select project: docita-api
# Go to "Metrics" tab
```

### Step 4.2: Configure CPU Usage Alert
```bash
# In Railway:
# 1. Metrics → CPU Usage
# 2. Click "Set Alert"
# 3. Configure:
   - Threshold: 80%
   - Duration: 5 minutes
   - Alert method: Email
   - Email: your-team-email@docita.work
   
# 4. Save alert
```

### Step 4.3: Configure Memory Usage Alert
```bash
# In Railway:
# 1. Metrics → Memory Usage
# 2. Click "Set Alert"
# 3. Configure:
   - Threshold: 85%
   - Duration: 5 minutes
   - Alert method: Email
   
# 4. Save alert
```

### Step 4.4: Configure Disk Space Alert
```bash
# In Railway:
# 1. Metrics → Disk Usage
# 2. Click "Set Alert"
# 3. Configure:
   - Threshold: 90%
   - Duration: 10 minutes
   - Alert method: Email
   
# 4. Save alert
```

### Step 4.5: Create Custom Dashboard
```bash
# In Railway:
# 1. Go to "Metrics" → "Create Dashboard"
# 2. Add widgets:
   - Request Rate (requests/second)
   - Response Time (p50, p95, p99)
   - Error Rate (%)
   - CPU Usage (%)
   - Memory Usage (%)
   - Active Connections
   
# 3. Name: "Docita Production Overview"
# 4. Save and pin to favorites
```

### Step 4.6: Configure Request Latency Monitoring
```bash
# If Railway supports custom metrics:
# 1. Metrics → Response Time
# 2. Set threshold alert:
   - p95 > 500ms for 10 minutes → Email alert
   - p99 > 1000ms for 5 minutes → Email alert
```

**✅ Checkpoint:** Railway dashboard showing all metrics

---

## 5️⃣ Test All Alerts (15 minutes)

### Step 5.1: Test Sentry Error Alert
```bash
# Trigger test error in backend:
curl -X POST https://api.docita.work/api/health/test-error \
  -H "Content-Type: application/json"

# Expected:
# - Error appears in Sentry within 30 seconds
# - Alert posted to #docita-alerts within 1 minute
# - Email received (if configured)
```

### Step 5.2: Test UptimeRobot Down Alert
```bash
# Temporarily stop API service (in Railway):
# 1. Go to Railway dashboard
# 2. Select docita-api service
# 3. Click "Stop" (or scale to 0 instances)
# 4. Wait 5-10 minutes

# Expected:
# - UptimeRobot shows "Down" status
# - Alert posted to #docita-alerts
# - Email received

# 5. Restart service immediately
```

### Step 5.3: Test Performance Alert
```bash
# Trigger slow query (if test endpoint exists):
curl -X GET https://api.docita.work/api/health/slow-query

# Or run load test:
k6 run scripts/k6-baseline.js

# Expected:
# - Sentry shows increased p95 response time
# - If threshold exceeded, alert sent
```

### Step 5.4: Verify Alert Delivery
```bash
# Checklist:
# ✅ Sentry alerts appear in Slack
# ✅ UptimeRobot alerts appear in Slack
# ✅ Email alerts received
# ✅ Alerts include actionable information
# ✅ Alert frequency is appropriate (not too noisy)
```

**✅ Checkpoint:** All alert channels working correctly

---

## 6️⃣ Post-Setup Verification

### Verification Checklist
```bash
# Sentry:
✅ Error tracking active for frontend + backend
✅ 3 alert rules configured (critical, high rate, performance)
✅ Slack integration working
✅ Email alerts configured
✅ Test error captured successfully

# UptimeRobot:
✅ 4 monitors created (API, DB, Redis, Frontend)
✅ 5-minute check interval
✅ Keyword monitoring for health endpoints
✅ Slack webhook configured
✅ Email alerts configured
✅ Test downtime alert received

# Slack:
✅ #docita-alerts channel created
✅ Sentry → Slack working
✅ UptimeRobot → Slack working
✅ Alert runbook posted and pinned
✅ Team members invited

# Railway:
✅ Metrics dashboard created
✅ CPU alert (80% threshold)
✅ Memory alert (85% threshold)
✅ Disk alert (90% threshold)
✅ All metrics visible

# End-to-End:
✅ Test error sent → Sentry → Slack (< 1 min)
✅ Service downtime → UptimeRobot → Slack (< 5 min)
✅ All alerts include actionable information
✅ Team can access all dashboards
```

---

## 📊 Monitoring Dashboard Overview

### Quick Links
```markdown
**Sentry Dashboards:**
- Backend: https://sentry.io/organizations/docita/projects/docita-api
- Frontend: https://sentry.io/organizations/docita/projects/docita-app

**UptimeRobot:**
- Dashboard: https://uptimerobot.com/dashboard
- Public Status Page: [Optional - can create]

**Railway:**
- Metrics: https://railway.app/project/[project-id]/metrics
- Logs: https://railway.app/project/[project-id]/logs

**Slack:**
- Alerts: #docita-alerts
```

### Daily Monitoring Routine
```markdown
**Morning Check (5 minutes):**
1. Check UptimeRobot - all monitors "Up"?
2. Review Sentry - any new critical errors?
3. Check Railway - CPU/Memory within normal range?
4. Scan #docita-alerts - any overnight issues?

**Weekly Review (30 minutes):**
1. Sentry: Review error trends, top issues
2. UptimeRobot: Check uptime percentage (target: >99.9%)
3. Railway: Review performance trends
4. Document recurring issues
5. Plan fixes for common errors
```

---

## 🚨 Alert Response Procedures

### Critical Error (Sentry)
```markdown
1. Acknowledge alert in Slack (add 👀 reaction)
2. Open Sentry dashboard → View full error details
3. Check error frequency (1 occurrence vs. many?)
4. Review stack trace and context
5. If affecting users: Post status update
6. Fix and deploy within 15 minutes
7. Verify fix in Sentry
8. Close alert with summary
```

### Service Down (UptimeRobot)
```markdown
1. Acknowledge alert immediately (add 🚨 reaction)
2. Check Railway dashboard - service status?
3. Review recent deployments - deployment issue?
4. Check logs for crash/error
5. If service crashed: Restart immediately
6. If deployment issue: Rollback
7. Post status update when resolved
8. Root cause analysis within 24 hours
```

### Performance Degradation
```markdown
1. Acknowledge alert (add ⚡ reaction)
2. Check Railway metrics - which resource constraint?
3. Review Sentry - slow transactions list
4. Identify slow queries/endpoints
5. If temporary spike: Monitor for 30 minutes
6. If sustained: Scale resources or optimize code
7. Document findings
```

---

## 🎯 Success Metrics

### Week 1 Post-Launch
```markdown
Target Metrics:
- Uptime: >99.9% (UptimeRobot)
- Error rate: <1% (Sentry)
- P95 response time: <500ms (Sentry)
- Alert response time: <15 min
- False positive rate: <10%
```

### Monthly Goals
```markdown
- Zero critical bugs reaching production
- 99.95% uptime
- P95 response time <300ms
- Alert fatigue: <5 alerts/day
- Mean time to resolution (MTTR): <30 min
```

---

## 📚 Additional Resources

### Documentation
- [Sentry Documentation](https://docs.sentry.io)
- [UptimeRobot Documentation](https://uptimerobot.com/help)
- [Railway Monitoring](https://docs.railway.app/reference/monitoring)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)

### Docita-Specific
- [INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md) - To be created
- [ON_CALL_RUNBOOK.md](docs/ON_CALL_RUNBOOK.md) - To be created
- [PERFORMANCE_DEBUGGING.md](docs/PERFORMANCE_DEBUGGING.md) - To be created

---

## ✅ Setup Complete!

**Congratulations!** You've successfully set up **Option B: Enhanced Monitoring** for Docita.

### What You've Achieved:
- ✅ Real-time error tracking (Sentry)
- ✅ Uptime monitoring (UptimeRobot)
- ✅ Centralized alerts (Slack)
- ✅ Performance dashboards (Railway)
- ✅ Team notification system
- ✅ Production-ready monitoring stack

### Next Steps:
1. **Train team** on alert response procedures
2. **Create** incident response runbook
3. **Schedule** weekly monitoring reviews
4. **Document** on-call rotation
5. **Launch** with confidence! 🚀

---

**Setup Time:** ~2 hours  
**Maintenance:** ~15 min/day  
**Peace of Mind:** Priceless 😊

**Questions?** Review this guide or check platform documentation.

**Last Updated:** February 14, 2026  
**Status:** ✅ READY FOR PRODUCTION
