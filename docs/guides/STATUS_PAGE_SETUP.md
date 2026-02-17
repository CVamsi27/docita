# Status Page Setup Guide

**Purpose:** Public-facing status page for Docita service availability  
**Referenced in:** `INCIDENT_RESPONSE.md`, `PROJECT_AUDIT.md` §5.7, §10.1  
**Priority:** PRE-LAUNCH (P-4)  
**Estimated Setup Time:** 30 minutes

---

## Overview

A status page provides:
- **Public transparency:** Users see real-time service health
- **Incident communication:** Automated updates during outages
- **Trust building:** Proactive communication reduces support load
- **Compliance:** Referenced in incident response procedures

---

## Option 1: UptimeRobot Public Status Page (Recommended)

**Cost:** Free  
**Setup Time:** 15 minutes  
**Best For:** Quick launch, minimal maintenance

### Prerequisites
- UptimeRobot account (already configured per `MONITORING_SETUP_GUIDE.md`)
- Monitors set up for all critical endpoints

### Setup Steps

#### 1. Create Public Status Page

1. Log in to [UptimeRobot Dashboard](https://uptimerobot.com/dashboard)
2. Navigate to **Status Pages** → **Add Status Page**
3. Configure basic settings:
   ```
   Title: Docita Service Status
   Custom Domain: status.docita.work (or subdomain of your choice)
   Logo: Upload Docita logo (from apps/landing/public/)
   Timezone: Asia/Kolkata (IST)
   ```

#### 2. Select Monitors to Display

Add all production monitors:
- ✅ **@docita/app** (Main Application) - `https://app.docita.work`
- ✅ **@docita/admin** (Admin Portal) - `https://admin.docita.work`
- ✅ **@docita/landing** (Marketing Site) - `https://docita.work`
- ✅ **API Health** - `https://api.docita.work/api/health`
- ✅ **Database Health** - `https://api.docita.work/api/health/db`
- ✅ **Redis Health** - `https://api.docita.work/api/health/redis`

Display settings:
```
Monitor grouping: By service (Apps / API / Infrastructure)
Show uptime percentage: Yes (90 days)
Show response times: Yes
Show incident history: Yes (last 30 days)
```

#### 3. Configure Custom Domain (Optional)

**Using Vercel/Custom DNS:**

1. In UptimeRobot Status Page settings, note the CNAME target (e.g., `stats.uptimerobot.com`)
2. Add DNS record in your domain provider:
   ```
   Type: CNAME
   Name: status
   Value: stats.uptimerobot.com
   TTL: 3600
   ```
3. Wait for DNS propagation (5-30 minutes)
4. Verify: `https://status.docita.work`

**Using Default UptimeRobot URL:**
- Format: `https://yourname.betteruptime.com`
- No DNS setup required
- Update `INCIDENT_RESPONSE.md` with actual URL

#### 4. Customize Appearance

```
Theme: Light (match Docita branding)
Header Background: #FFFFFF
Accent Color: #2563EB (Docita primary blue)
Footer Text: "Having issues? Contact support@docita.work"
```

#### 5. Enable Subscriber Notifications (Optional)

Allow users to subscribe to status updates:
```
Email notifications: Enabled
SMS notifications: Disabled (cost)
Webhook notifications: Disabled
```

#### 6. Test the Status Page

1. Visit the public URL
2. Verify all monitors are displayed correctly
3. Check historical uptime data appears
4. Test "Subscribe to updates" form (if enabled)
5. Simulate an incident (pause one monitor briefly) and verify it displays correctly

---

## Option 2: Custom Status Page (Advanced)

**Cost:** Free (self-hosted)  
**Setup Time:** 2-3 hours  
**Best For:** Full branding control, custom features

### Using Cachet (Open Source)

**Tech Stack:**
- Laravel-based status page system
- MySQL/PostgreSQL database
- Can be deployed on Railway alongside API

#### Quick Deploy to Railway

1. Create new Railway project: `docita-status`
2. Add service from GitHub: `CachetHQ/Cachet`
3. Add PostgreSQL database
4. Configure environment variables:
   ```env
   APP_URL=https://status.docita.work
   DB_DRIVER=pgsql
   DB_HOST=${PGHOST}
   DB_DATABASE=${PGDATABASE}
   DB_USERNAME=${PGUSER}
   DB_PASSWORD=${PGPASSWORD}
   APP_KEY=<generate via `php artisan key:generate`>
   ```
5. Deploy and run migrations
6. Configure components matching UptimeRobot monitor list

### Using Statuspage.io (Atlassian)

**Cost:** $29/month (paid option)  
**Best For:** Enterprise features, integrations with Jira/Opsgenie

- Advanced incident templates
- Scheduled maintenance announcements
- SMS notifications
- Custom branding
- API for automation

---

## Integration with Incident Response

After creating the status page, update the following files:

### 1. Update INCIDENT_RESPONSE.md

Replace placeholder with actual URL:

```markdown
**Status Page:** https://status.docita.work  
**Update Frequency:** Real-time (UptimeRobot auto-updates every 5 minutes)
```

### 2. Update ON_CALL_RUNBOOK.md

Add status page to incident checklist:

```markdown
During Incident:
- [ ] Update status page with incident details
- [ ] Post initial update within 15 minutes
- [ ] Post updates every 30 minutes until resolved
```

### 3. Add to Navigation (Optional)

Link from main app footer:

```tsx
// apps/app/components/footer.tsx
<a href="https://status.docita.work" target="_blank" rel="noopener noreferrer">
  Service Status
</a>
```

### 4. Link from Error Pages

```tsx
// apps/app/app/error.tsx
Having trouble? Check our <a href="https://status.docita.work">service status</a>
```

---

## Maintenance Announcements

### Scheduled Maintenance Template (UptimeRobot)

When deploying updates:

1. Create "Scheduled Maintenance" announcement 24 hours in advance:
   ```
   Title: Scheduled Maintenance - Database Migration
   Affected Services: Main Application, API
   Start Time: Feb 20, 2026 02:00 IST
   End Time: Feb 20, 2026 04:00 IST
   Impact: Service will be unavailable during this window
   ```

2. Post update when maintenance begins
3. Post completion update when service is restored

---

## Monitoring Integration

### Auto-Update from UptimeRobot Monitors

UptimeRobot status page automatically reflects monitor status:
- ✅ **Up** (green) - Monitor responding normally
- ⚠️ **Degraded** (yellow) - Partial outage or slow response
- ❌ **Down** (red) - Monitor failing
- 🔧 **Maintenance** (blue) - Scheduled maintenance mode

### Manual Incident Updates

For incidents not caught by monitors (e.g., data issues, performance degradation):

1. Log in to UptimeRobot
2. Go to Status Pages → Incidents
3. Create incident:
   ```
   Incident Type: Performance Issues
   Affected Monitors: API Health
   Status: Investigating / Identified / Monitoring / Resolved
   Description: Users may experience slow response times...
   ```

---

## Verification Checklist

Before launch:

- [ ] Status page is publicly accessible
- [ ] All 6 critical monitors are displayed
- [ ] Uptime history is visible (will show 0% until launch)
- [ ] Custom domain is working (if configured)
- [ ] Branding matches Docita design
- [ ] `INCIDENT_RESPONSE.md` updated with actual URL
- [ ] `ON_CALL_RUNBOOK.md` references status page
- [ ] Footer/error pages link to status page (optional but recommended)

---

## Post-Launch

### Week 1: Monitor and Tune

- Review status page analytics (subscriber count, page views)
- Verify auto-updates are working correctly
- Test incident workflow with simulated outage
- Add any missing monitors identified during launch week

### Monthly: Review and Update

- Check uptime % trends
- Review incident history
- Update affected services list if architecture changes
- Verify subscriber notification delivery

---

## Troubleshooting

### Status page shows "Down" but service is working

**Cause:** Monitor configuration issue (wrong URL, SSL validation, timeout too short)

**Fix:**
1. Check monitor URL is correct (include `/api` prefix for API endpoints)
2. Verify SSL certificate is valid
3. Increase timeout if legitimate requests take >30 seconds
4. Check monitor location (use multiple regions for reliability)

### Custom domain not resolving

**Cause:** DNS propagation delay or incorrect CNAME

**Fix:**
1. Verify CNAME record: `dig status.docita.work` should show UptimeRobot target
2. Wait 30-60 minutes for DNS propagation
3. Clear browser DNS cache
4. Test from different network/device

### Incident updates not showing

**Cause:** Cache or visibility settings

**Fix:**
1. In UptimeRobot, verify incident is set to "Public"
2. Refresh status page (Ctrl+Shift+R for hard refresh)
3. Check incident date range filter

---

## Next Steps

After creating the status page:

1. ✅ Mark P-4 as complete in `PROJECT_AUDIT.md` Section 0.1
2. Share status page URL with team in deployment checklist
3. Include status page link in launch announcement
4. Add status page to customer support templates
5. Train support team on incident communication workflow

---

**Setup Owner:** DevOps Lead  
**Maintenance Owner:** On-Call Engineer (per `ON_CALL_RUNBOOK.md`)  
**Review Cadence:** Monthly  

**Related Docs:**
- `INCIDENT_RESPONSE.md` - Incident communication procedures
- `ON_CALL_RUNBOOK.md` - On-call playbook
- `MONITORING_SETUP_GUIDE.md` - UptimeRobot monitor setup
- `PROJECT_AUDIT.md` §5.7 - Status page requirement context
