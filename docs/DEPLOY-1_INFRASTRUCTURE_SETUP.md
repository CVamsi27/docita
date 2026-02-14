# DEPLOY-1: Infrastructure & Staging Setup Guide

**Status:** 🔴 CRITICAL - Ready to Begin  
**Date:** February 14, 2026  
**Target Duration:** 1-2 days  
**Estimated Completion:** February 15-16, 2026

---

## Overview

DEPLOY-1 focuses on setting up the production infrastructure on Vercel (frontend) and Railway (backend), configuring staging environments, and ensuring all systems are ready for production deployment.

### Success Criteria
- ✅ All 3 frontend apps deployed to Vercel
- ✅ API server deployed to Railway
- ✅ PostgreSQL database configured
- ✅ Redis instance configured
- ✅ All environment variables set
- ✅ Health checks passing
- ✅ Staging environment operational
- ✅ Pre-production testing complete

---

## Phase 1: Vercel Frontend Deployment (Parallel Tasks)

### Task 1.1: Set Up Main App on Vercel

**Actions:**
```bash
# 1. Go to https://vercel.com/dashboard
# 2. Click "Add New" → "Project"
# 3. Select repository with docita code
# 4. Name project: "docita-app" (or "docita-main-app")
# 5. Configure:
#    - Framework: Next.js
#    - Root Directory: apps/app
#    - Node Version: 18.x (or current LTS)
```

**Configuration in Vercel UI:**

1. **Section: Build and Output Settings**
   - Framework: Next.js
   - Build Command: `pnpm build` (or defaults)
   - Output Directory: `.next`

2. **Section: Environment Variables**
   ```
   NEXT_PUBLIC_API_URL = https://api.yourdomain.com/api
   NEXT_PUBLIC_SENTRY_DSN = https://xxx@sentry.io/xxx
   NEXT_PUBLIC_APP_NAME = Docita App
   ```

3. **Section: Domains**
   - Production Domain: `app.yourdomain.com`
   - Auto-assign preview domains: ✅ Enabled

4. **Deploy!**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Verify: Visit deployment URL

**Verification:**
```bash
curl -s https://app.yourdomain.com | grep "<title>" 
# Should show proper title
```

---

### Task 1.2: Set Up Admin App on Vercel

**Same process as Main App:**
```
Project Name: docita-admin
Root Directory: apps/admin
Production Domain: admin.yourdomain.com

Environment Variables:
NEXT_PUBLIC_API_URL = https://api.yourdomain.com/api
NEXT_PUBLIC_SENTRY_DSN = <same as main app>
```

---

### Task 1.3: Set Up Landing Page on Vercel

**Same process as Main App:**
```
Project Name: docita-landing
Root Directory: apps/landing
Production Domain: www.yourdomain.com (or docita.com)

Environment Variables:
NEXT_PUBLIC_API_URL = https://api.yourdomain.com/api
NEXT_PUBLIC_SENTRY_DSN = <same as main app>
```

---

### Task 1.4: Configure Vercel Deployment Settings (All Apps)

For each app, enable in Vercel project settings:

1. **Preview Deployments**
   - ✅ Automatically deploy on PR
   - Set comment on PR with deployment URL

2. **Production Deployment**
   - ✅ Auto-deploy on main branch merge
   - ✅ Require status checks before deploy

3. **Performance Analytics**
   - ✅ Enable Web Analytics
   - ✅ Enable Performance Insights

4. **Security**
   - ✅ Protect preview URLs (if production data)
   - ✅ Configure allowed domains for CORS

---

## Phase 2: Railway Backend Deployment

### Task 2.1: Create Railway Project

**Actions:**
```bash
# 1. Go to https://railway.app/dashboard
# 2. Click "Create New" → "Project"
# 3. Choose "Deploy from GitHub"
#    - Select docita repository
#    - Select `main` branch
# 4. Choose: apps/api (if prompted for workspace)
```

**Wait for initial deployment** (Railway will auto-deploy after git push)

---

### Task 2.2: Create PostgreSQL Database

**In Railway Dashboard:**

1. **Add Service**
   - Click "Add" → "Database" → "PostgreSQL"
   - Production Postgres instance will be created

2. **Configure Database**
   - Name: `docita-postgres` (optional)
   - Postgres Version: 15 (or latest stable)
   - Wait for instance to start (2-3 minutes)

3. **Note the CONNECTION STRING**
   - Copy the DATABASE_URL from Railway
   - Format: `postgresql://user:pass@host:port/dbname`
   - **Save this - you'll need it**

---

### Task 2.3: Create Redis Instance

**In Railway Dashboard:**

1. **Add Service**
   - Click "Add" → "Database" → "Redis"
   - Production Redis instance will be created

2. **Configure Redis**
   - Name: `docita-redis` (optional)
   - Redis Version: 7 (or latest)
   - Password: ✅ Generate (Railway generates automatically)

3. **Note the CONNECTION STRING**
   - Copy the REDIS_URL from Railway
   - Format: `redis://:password@host:port`
   - **Save this - you'll need it**

---

### Task 2.4: Configure API Environment Variables

**In Railway API service settings:**

1. **Go to: Variables** tab in Railway

2. **Add all required variables:**
   ```env
   # Database
   DATABASE_URL = postgresql://...copied from Railway...
   
   # Redis
   REDIS_URL = redis://:...copied from Railway...
   
   # Authentication
   JWT_SECRET = <generate: openssl rand -hex 32>
   JWT_EXPIRES_IN = 7d
   
   # Encryption
   ENCRYPTION_KEY = <generate: openssl rand -hex 32 (must be exactly 64 hex chars)>
   
   # Payment (Razorpay)
   RAZORPAY_KEY_ID = <from Razorpay dashboard>
   RAZORPAY_KEY_SECRET = <from Razorpay dashboard>
   
   # WhatsApp
   WHATSAPP_BUSINESS_ACCOUNT_ID = <from Meta Business Manager>
   WHATSAPP_PHONE_NUMBER_ID = <from Meta>
   WHATSAPP_API_TOKEN = <from Meta>
   
   # Email (if configured)
   EMAIL_SERVICE = <sendgrid, mailgun, etc>
   EMAIL_FROM = noreply@yourdomain.com
   
   # Sentry
   SENTRY_DSN = https://xxx@sentry.io/xxx
   SENTRY_ENVIRONMENT = production
   
   # Monitoring
   NODE_ENV = production
   LOG_LEVEL = info
   
   # Frontend URLs
   FRONTEND_URL = https://app.yourdomain.com
   ADMIN_URL = https://admin.yourdomain.com
   LANDING_URL = https://www.yourdomain.com
   
   # AWS (if needed for file uploads)
   AWS_S3_BUCKET = docita-prod-uploads
   AWS_REGION = us-east-1
   AWS_ACCESS_KEY_ID = <from AWS IAM>
   AWS_SECRET_ACCESS_KEY = <from AWS IAM>
   
   # CORS
   CORS_ORIGIN = https://app.yourdomain.com,https://admin.yourdomain.com
   ```

3. **Generate Required Secrets:**
   ```bash
   # JWT_SECRET (32 hex chars = 128 bits)
   openssl rand -hex 32
   
   # ENCRYPTION_KEY (32 hex chars = 128 bits or 64 for AES-256)
   openssl rand -hex 32  # for AES-128
   # OR
   openssl rand -hex 64  # for AES-256 (recommended)
   ```

4. **Redeploy API**
   - Click "Redeploy" after saving variables
   - Wait for deployment (1-2 minutes)

---

### Task 2.5: Run Database Migrations

**Two options:**

**Option A: Via Railway CLI**
```bash
# 1. Install Railway CLI
brew install railway

# 2. Login to Railway
railway login

# 3. Link to your Railway project
railway service api

# 4. Run migrations
railway run pnpm db:migrate:deploy

# 5. Verify
railway run pnpm db:seed

# (This will run migration against production database)
```

**Option B: Via Vercel CLI + SSH**
```bash
# Use Railway's connection string to connect remotely:
DATABASE_URL="..." pnpm db:migrate:deploy
```

**Verification:**
```bash
# After migration, test:
# - Query a table: SELECT COUNT(*) FROM "User";
# - Check schema: SELECT * FROM information_schema.tables;
```

---

## Phase 3: Staging Environment Setup

### Task 3.1: Create Staging Vercel Deployments

**For each app (main, admin, landing):**

1. **Add staging domain in Vercel**
   ```
   Production: app.yourdomain.com
   Staging: staging-app.yourdomain.com
   ```

2. **Create staging branch**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

3. **Configure auto-deployment from staging branch**
   - In Vercel project settings
   - Under "Git integrations"
   - Add rule: `staging` branch → `staging-app` domain

---

### Task 3.2: Create Staging Railway Deployment

**Two approaches:**

**Approach A: Separate Railway Project (Recommended)**
```
1. Create new Railway project: "docita-staging"
2. Create staging PostgreSQL & Redis instances
3. Deploy apps/api to staging project
4. Set environment to "staging" in env vars
5. Use separate database/redis to avoid production data contamination
```

**Approach B: Same Project, Separate Database**
```
1. In same Railway project
2. Create second Postgres: "docita-postgres-staging"
3. Create second Redis: "docita-redis-staging"
4. Keep API single, but with staging branch deployment
```

**Recommendation: Approach A** (better isolation and safety)

---

### Task 3.3: Configure Staging Environment Variables

In Railway staging project, set:
```env
NODE_ENV = staging
SENTRY_ENVIRONMENT = staging
LOG_LEVEL = debug

# Use staging URLs for frontend
FRONTEND_URL = https://staging-app.yourdomain.com
ADMIN_URL = https://staging-admin.yourdomain.com

# Staging database & redis (different from prod)
DATABASE_URL = postgresql://user:pass@staging-db:5432/docita_staging
REDIS_URL = redis://:pass@staging-redis:6379

# All other env vars same as production
# (JWT_SECRET, ENCRYPTION_KEY, etc can be same or different)
```

---

## Phase 4: Environment Variable Management

### Task 4.1: Create Environment Variable Documentation

**Create `.env.production.example`:**
```bash
# This file documents all required production environment variables
# Never commit actual secrets to git!

# Database
DATABASE_URL=postgresql://user:password@host:5432/docita

# Redis
REDIS_URL=redis://:password@host:6379

# Authentication
JWT_SECRET=<128-bit hex string>
JWT_EXPIRES_IN=7d

# Encryption (for PII data)
ENCRYPTION_KEY=<256-bit hex string>

# Payment Processing
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx

# WhatsApp Integration
WHATSAPP_BUSINESS_ACCOUNT_ID=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_API_TOKEN=xxx

# Email
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@yourdomain.com
EMAIL_API_KEY=xxx

# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Frontend URLs
FRONTEND_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# CORS
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com

# File Storage
AWS_S3_BUCKET=docita-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

### Task 4.2: Secret Management Best Practices

**Rules:**
- ✅ Never commit `.env` files with secrets
- ✅ Use Vercel Secrets for frontend env vars
- ✅ Use Railway Variables for backend env vars
- ✅ Rotate secrets every 90 days
- ✅ Use different secrets for staging vs production
- ✅ Log which team member set each secret (for audit trail)

---

## Phase 5: Health Check & Connectivity Verification

### Task 5.1: Verify API Health Endpoints

**Test from command line or browser:**

```bash
# 1. Basic health check
curl https://api.yourdomain.com/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-02-15T10:00:00Z",
#   "uptime": 1234,
#   "version": "1.0.0"
# }

# 2. Database connectivity
curl https://api.yourdomain.com/api/health/db

# Expected: { "status": "ok", "database": "connected" }

# 3. Redis connectivity
curl https://api.yourdomain.com/api/health/redis

# Expected: { "status": "ok", "redis": "connected" }

# 4. Metrics
curl https://api.yourdomain.com/api/health/metrics

# Should show various metrics
```

---

### Task 5.2: Frontend to Backend Connectivity

**Test API calls from frontend:**

1. **From Main App:**
   ```bash
   # Navigate to app.yourdomain.com/login
   # Open DevTools → Network tab
   # Attempt login with test credentials
   # Check: API request goes to correct URL
   # Check: Response is valid (no 403/404)
   ```

2. **From Admin App:**
   ```bash
   # Navigate to admin.yourdomain.com/login
   # Same test as above
   ```

3. **Check Console for Errors:**
   - No CORS errors
   - No certificate warnings
   - No 404s for API routes

---

### Task 5.3: Test Database Connectivity

**From API server:**

```bash
# Via Railway CLI
railway service api
railway run "pnpm node -e 'console.log(process.env.DATABASE_URL)'"

# Or via direct connection (if accessible)
psql $DATABASE_URL -c "SELECT NOW();"

# Should return current timestamp
```

---

## Phase 6: Security & Access Control

### Task 6.1: Configure CORS

**In API (main.ts or app.module.ts):**

```typescript
// apps/api/src/main.ts
const app = await NestFactory.create(AppModule);

app.enableCors({
  origin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com',
    'https://staging-app.yourdomain.com',
    'https://staging-admin.yourdomain.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await app.listen(process.env.PORT || 3001);
```

**Verify in production by checking CORS headers:**
```bash
curl -H "Origin: https://app.yourdomain.com" -v https://api.yourdomain.com/api/health

# Should show: Access-Control-Allow-Origin: https://app.yourdomain.com
```

---

### Task 6.2: Configure HTTPS & SSL Certificates

**Vercel:** Automatically generates SSL certificates (automatic)

**Railway:** Automatically handles HTTPS (automatic with custom domain)

**Verify:**
```bash
# Should return HTTPS connection
curl -v https://api.yourdomain.com/api/health 2>&1 | grep "SSL"

# Should show SSL certificate details
```

---

### Task 6.3: Configure Rate Limiting

**Add to API:**

```typescript
// apps/api/src/main.ts
import { RateLimitGuard } from '@nestjs/throttler';

app.useGlobalGuards(new RateLimitGuard());
```

**Or via middl ware:**

```typescript
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);
```

---

## Phase 7: Monitoring & Alerting Setup

### Task 7.1: Configure Sentry for Monitoring

**Already integrated, but verify in production:**

```bash
# 1. Log in to https://sentry.io
# 2. Navigate to project settings
# 3. Under "Alerts" → Create new alert:
#    - Rule: Error level = error or higher
#    - Action: Send email to team@yourdomain.com
#    - Action: Send to Slack #alerts channel
```

### Task 7.2: Configure Railway Monitoring

**In Railway Dashboard:**

1. **Enable Environment Insights**
   - Shows CPU, Memory, Requests/sec
   - Set alerts for high CPU (>80%) or Memory (>90%)

2. **Configure Log Streaming**
   - Railway provides logs automatically
   - Export to external service if needed (DataDog, LogRocket, etc)

### Task 7.3: Enable Uptime Monitoring

**Choose a service (free or paid):**
- UptimeRobot (free tier available)
- Pingdom (has free trial)
- Freshping
- StatusPage.io

**Configure monitors:**
```
Primary: https://api.yourdomain.com/api/health
Secondary: https://app.yourdomain.com (home page)
Secondary: https://admin.yourdomain.com (home page)

Alert on:
- Downtime > 5 minutes
- Response time > 3 seconds
- SSL/TLS errors

Notification: Email + Slack
```

---

## Phase 8: Pre-Production Testing

### Task 8.1: Test All Critical Workflows

In staging environment, test:

1. **Patient Workflow**
   - [ ] Patient registration
   - [ ] Clinic assignment
   - [ ] Appointment booking
   - [ ] Medical history access

2. **Doctor Workflow**
   - [ ] Doctor login
   - [ ] Dashboard view
   - [ ] Patient search
   - [ ] Appointment management
   - [ ] Prescription creation

3. **Admin Workflow**
   - [ ] Admin login
   - [ ] User management
   - [ ] Clinic management
   - [ ] System monitoring

4. **Payment Workflow** (if applicable)
   - [ ] Invoice generation
   - [ ] Payment processing
   - [ ] Payment confirmation

### Task 8.2: Performance Testing

**Load test the staging API:**

```bash
# Using Apache Bench (ab command):
ab -n 1000 -c 10 https://api-staging.yourdomain.com/api/health

# Or using wrk:
wrk -t12 -c400 -d30s https://api-staging.yourdomain.com/api/health

# Expected:
# - Response time: < 500ms (average)
# - Requests/sec: > 100
# - Error rate: 0%
```

### Task 8.3: Test Error Scenarios

**In staging, intentionally test errors:**

1. [ ] Database downtime (manual kill connection)
2. [ ] Redis downtime (manual kill connection)
3. [ ] Rate limiting (send > 100 requests/min)
4. [ ] Invalid tokens (use expired JWT)
5. [ ] Malformed requests (send invalid JSON)

**Verify:**
- [ ] Errors are logged in Sentry
- [ ] Alerts trigger in Slack/Email
- [ ] Frontend shows appropriate error messages
- [ ] No sensitive data in error responses

---

## Phase 9: Production Readiness Checklist

**Before deploying to production, verify:**

### Infrastructure
- ✅ Vercel projects created for all 3 apps
- ✅ Railway projects created for API
- ✅ PostgreSQL database in production
- ✅ Redis instance in production
- ✅ All environment variables set
- ✅ Custom domains configured
- ✅ SSL certificates active
- ✅ CORS configured
- ✅ Rate limiting enabled
- ✅ Health checks passing

### Testing
- ✅ All workflows tested in staging
- ✅ Performance meets targets
- ✅ Error handling verified
- ✅ Security scans passed
- ✅ Database migrations successful

### Monitoring
- ✅ Sentry configured for errors
- ✅ Railway monitoring enabled
- ✅ Uptime monitoring configured
- ✅ Alert channels verified
- ✅ Team can respond to alerts

### Documentation
- ✅ Runbooks written for common issues
- ✅ Escalation procedures documented
- ✅ Emergency contacts listed
- ✅ Rollback procedures documented

---

## Troubleshooting Common Issues

### Issue: CORS Errors in Production

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
```typescript
// Update CORS configuration in API
app.enableCors({
  origin: ['https://app.yourdomain.com', 'https://admin.yourdomain.com'],
  credentials: true,
});

// Redeploy to Railway
railway deploy --with-output
```

---

### Issue: Database Migration Fails

**Symptoms:**
```
Error: Migration "xxx_migration" failed
```

**Solution:**
```bash
# 1. Check migration file for syntax errors
# 2. Verify DATABASE_URL is correct
# 3. Run migration locally first:
DATABASE_URL=<staging-url> pnpm db:migrate:dev

# 4. If all good, deploy:
DATABASE_URL=<production-url> pnpm db:migrate:deploy

# 5. If urgent rollback:
pnpm db:migrate:resolve --rolled-back <migration-name>
```

---

### Issue: Secret Not Found Error

**Symptoms:**
```
Error: JWT_SECRET is not defined
```

**Solution:**
1. Check variable name spelling (case-sensitive!)
2. Verify in Railway Variables tab
3. Restart the service to pick up new variables:
   ```bash
   railway service api
   railway restart
   ```

---

### Issue: Slow API Response Times

**Symptoms:**
```
Average response time > 1 second
```

**Solution:**
1. Check database slow query logs
2. Verify indices are created
3. Check Redis connectivity
4. Review API logs for bottlenecks
5. Consider adding caching

---

## Success Metrics

After DEPLOY-1 completion, you should have:

- ✅ **3 frontend apps** deployed to Vercel
- ✅ **1 backend API** deployed to Railway
- ✅ **Database + Redis** running in production
- ✅ **All health checks** passing (green)
- ✅ **API response time** < 500ms average
- ✅ **Uptime monitoring** active
- ✅ **Error tracking** (Sentry) working
- ✅ **Staging environment** ready for testing
- ✅ **All critical workflows** tested and working
- ✅ **Team trained** on deployment & monitoring

---

## Next Steps (DEPLOY-2)

After DEPLOY-1 is complete and verified:

1. **DEPLOY-2: Production Deployment Guide**
   - Final pre-production checks
   - Deployment procedure
   - Rollback procedures
   - Go-live checklist

2. **Post-Launch Monitoring**
   - Real-time error tracking
   - Performance monitoring
   - User behavior analysis
   - Incident response procedures

---

**Timeline:** 1-2 days for full DEPLOY-1 completion  
**Success Criteria:** All infrastructure verified and tested  
**Next Phase:** DEPLOY-2 Production Deployment (when satisfied with staging)

---

Generated: February 14, 2026  
Phase: Deploy-1 Infrastructure Setup  
Pre-Launch Status: 84% → Ready for next phase
