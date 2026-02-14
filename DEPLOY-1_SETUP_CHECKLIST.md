# DEPLOY-1: Infrastructure Setup Checklist

**Status:** 🟡 NOT STARTED  
**Target Completion:** February 15-16, 2026  
**Estimated Duration:** 1-2 days

---

## Phase 1: Vercel Frontend Deployments

### Main App (docita-app)

- [ ] **1.0** Create Vercel project
  - URL: https://vercel.com/dashboard
  - Action: "Add New" → "Project"
  - Repository: docita
  - Connect Git account if needed

- [ ] **1.1** Configure Main App deployment
  - Project Name: `docita-app`
  - Root Directory: `apps/app`
  - Framework: Next.js
  - Build Command: `pnpm build`
  - Output Directory: `.next`

- [ ] **1.2** Set environment variables
  - [ ] `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api`
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` = (from Sentry project)
  - [ ] `NEXT_PUBLIC_APP_NAME` = `Docita App`
  - [ ] Any additional vars from `.env.example`

- [ ] **1.3** Configure custom domain
  - Production domain: `app.yourdomain.com`
  - Enable auto SSL

- [ ] **1.4** Deploy and verify
  - [ ] Deployment completes (status: Ready)
  - [ ] Visit URL and verify page loads
  - [ ] Check console for no build errors
  - [ ] Verify title displays correctly

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Admin App (docita-admin)

- [ ] **2.0** Create Vercel project
  - Same process as Main App

- [ ] **2.1** Configure Admin App deployment
  - Project Name: `docita-admin`
  - Root Directory: `apps/admin`
  - Framework: Next.js
  - Build Command: `pnpm build`

- [ ] **2.2** Set environment variables
  - [ ] `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api`
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` = (same as main app)
  - [ ] `NEXT_PUBLIC_APP_NAME` = `Docita Admin`

- [ ] **2.3** Configure custom domain
  - Production domain: `admin.yourdomain.com`

- [ ] **2.4** Deploy and verify
  - [ ] Deployment completes (status: Ready)
  - [ ] Visit URL and verify page loads
  - [ ] Test login functionality

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Landing Page (docita-landing)

- [ ] **3.0** Create Vercel project
  - Same process as Main App

- [ ] **3.1** Configure Landing deployment
  - Project Name: `docita-landing`
  - Root Directory: `apps/landing`
  - Framework: Next.js
  - Build Command: `pnpm build`

- [ ] **3.2** Set environment variables
  - [ ] `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com/api`
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` = (same as main app)

- [ ] **3.3** Configure custom domain
  - Production domain: `www.yourdomain.com` or `yourdomain.com`

- [ ] **3.4** Deploy and verify
  - [ ] Deployment completes (status: Ready)
  - [ ] Visit URL and verify page loads
  - [ ] Check responsive design on mobile

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Vercel Global Configuration

- [ ] **4.0** Configure PR preview deployments
  - [ ] In each Vercel project: Settings → Git
  - [ ] Enable automatic preview deployments
  - [ ] Configure PR comments with deployment links

- [ ] **4.1** Enable analytics & insights
  - [ ] Web Analytics enabled on all 3 projects
  - [ ] Performance Insights enabled
  - [ ] Real Experience Scores collected

- [ ] **4.2** Configure deployment protection
  - [ ] Set production environment as protected
  - [ ] Require approvals for production deployments
  - [ ] Set up team notifications

- [ ] **4.3** Test Vercel deployment pipeline
  - [ ] Create test branch
  - [ ] Push commit
  - [ ] Verify preview deployment created
  - [ ] Merge to main
  - [ ] Verify production deployment triggered

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 2: Railway Backend Deployment

### Create Railway Project

- [ ] **5.0** Create new Railway project
  - URL: https://railway.app/dashboard
  - Action: "Create New" → "Project"
  - Connect GitHub or deploy from repo

- [ ] **5.1** Configure API deployment
  - [ ] Select docita repository
  - [ ] Select `main` branch
  - [ ] Set root directory: `apps/api`
  - [ ] Node version: 18.x or latest LTS
  - [ ] Wait for initial deployment

- [ ] **5.2** Verify API deployment
  - [ ] Railway shows "Deployed" status
  - [ ] Service is running
  - [ ] Check logs for no startup errors

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Create PostgreSQL Database

- [ ] **6.0** Add PostgreSQL service
  - [ ] In Railway project: "Add" → "Database" → "PostgreSQL"
  - [ ] Wait for database to initialize (~2-3 minutes)

- [ ] **6.1** Capture PostgreSQL credentials
  - [ ] Copy `DATABASE_URL` from Railway Variables
  - [ ] Format check: `postgresql://user:pass@host:port/dbname`
  - [ ] Save securely - **DO NOT COMMIT TO GIT**
  - [ ] Store in: `~/.env.production.local` (local machine only)

- [ ] **6.2** Verify database connectivity
  - [ ] Test connection from local machine (if applicable)
  - [ ] Connect via pgAdmin or psql if familiar

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Create Redis Instance

- [ ] **7.0** Add Redis service
  - [ ] In Railway project: "Add" → "Database" → "Redis"
  - [ ] Wait for Redis to initialize (~1-2 minutes)

- [ ] **7.1** Capture Redis credentials
  - [ ] Copy `REDIS_URL` from Railway Variables
  - [ ] Format check: `redis://:password@host:port`
  - [ ] Save securely - **DO NOT COMMIT TO GIT**
  - [ ] Verify password is auto-generated by Railway

- [ ] **7.2** Verify Redis connectivity
  - [ ] Test connection string if possible
  - [ ] Verify service is running in Railway dashboard

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Configure Environment Variables

- [ ] **8.0** Generate encryption keys
  - [ ] Generate `JWT_SECRET`: `openssl rand -hex 32`
  - [ ] Copy output: `___________________________`
  - [ ] Generate `ENCRYPTION_KEY`: `openssl rand -hex 32`
  - [ ] Copy output: `___________________________`

- [ ] **8.1** Add environment variables to Railway
  - [ ] Go to API service: Variables tab
  - [ ] Add all required variables (see list below)

**Database:**
- [ ] `DATABASE_URL` = (copied from PostgreSQL)
- [ ] `REDIS_URL` = (copied from Redis)

**Authentication:**
- [ ] `JWT_SECRET` = (generated above)
- [ ] `JWT_EXPIRES_IN` = `7d`

**Encryption:**
- [ ] `ENCRYPTION_KEY` = (generated above)

**Payment Processing (if configured):**
- [ ] `RAZORPAY_KEY_ID` = (from Razorpay dashboard)
- [ ] `RAZORPAY_KEY_SECRET` = (from Razorpay dashboard)

**WhatsApp Integration (if configured):**
- [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID` = 
- [ ] `WHATSAPP_PHONE_NUMBER_ID` = 
- [ ] `WHATSAPP_API_TOKEN` = 

**Email Configuration (if configured):**
- [ ] `EMAIL_SERVICE` = `sendgrid` (or other)
- [ ] `EMAIL_FROM` = `noreply@yourdomain.com`
- [ ] `EMAIL_API_KEY` = (from service)

**Error Tracking:**
- [ ] `SENTRY_DSN` = (from https://sentry.io)
- [ ] `SENTRY_ENVIRONMENT` = `production`

**Frontend URLs:**
- [ ] `FRONTEND_URL` = `https://app.yourdomain.com`
- [ ] `ADMIN_URL` = `https://admin.yourdomain.com`
- [ ] `LANDING_URL` = `https://www.yourdomain.com`

**CORS:**
- [ ] `CORS_ORIGIN` = `https://app.yourdomain.com,https://admin.yourdomain.com`

**Monitoring:**
- [ ] `NODE_ENV` = `production`
- [ ] `LOG_LEVEL` = `info`

**File Storage (if applicable):**
- [ ] `AWS_S3_BUCKET` = `docita-prod-uploads`
- [ ] `AWS_REGION` = `us-east-1`
- [ ] `AWS_ACCESS_KEY_ID` = (from AWS)
- [ ] `AWS_SECRET_ACCESS_KEY` = (from AWS)

- [ ] **8.2** Redeploy API
  - [ ] Click "Redeploy" button in Railway
  - [ ] Wait for deployment (~1-2 minutes)
  - [ ] Verify no startup errors in logs

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

### Run Database Migrations

- [ ] **9.0** Prepare migration command
  - [ ] Have `DATABASE_URL` handy
  - [ ] Verify Prisma schema is up-to-date locally

- [ ] **9.1** Run migrations via Railway CLI
  ```bash
  # Install Railway CLI if needed
  brew install railway
  
  # Login
  railway login
  
  # Select project and service
  railway service api
  
  # Run migrations
  railway run pnpm db:migrate:deploy
  ```
  - [ ] Command completes successfully
  - [ ] No migration errors
  - [ ] All migrations applied

- [ ] **9.2** Verify database schema
  - [ ] Tables created successfully
  - [ ] Indices created
  - [ ] Constraints applied
  - Command: `railway run "psql \\dt"` (or similar)

- [ ] **9.3** Optional: Seed database
  - [ ] If seed data needed: `railway run pnpm db:seed`
  - [ ] Verify seed data inserted

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 3: Staging Environment Setup

### Create Staging Deployments

- [ ] **10.0** Create staging Git branch
  - [ ] `git checkout -b staging`
  - [ ] `git push origin staging`

- [ ] **10.1** Configure Vercel staging deployments
  - [ ] For each app (main, admin, landing):
    - [ ] Add staging domain in Vercel project settings
    - [ ] Example: `staging-app.yourdomain.com`
    - [ ] Configure auto-deploy from `staging` branch
    - [ ] Set environment variables (same as production, but pointing to staging API)

- [ ] **10.2** Create staging Railway project
  - [ ] Option A (Recommended): Create separate Railway project for staging
    - [ ] New project: `docita-staging`
    - [ ] Deploy from `staging` branch
    - [ ] Create staging PostgreSQL and Redis instances
  - [ ] Option B: Same Railway project, different database
    - [ ] Add staging PostgreSQL instance
    - [ ] Add staging Redis instance
    - [ ] Configure API routes to staging branch

- [ ] **10.3** Configure staging environment variables
  - [ ] `NODE_ENV` = `staging`
  - [ ] `SENTRY_ENVIRONMENT` = `staging`
  - [ ] `LOG_LEVEL` = `debug` (more logs for debugging)
  - [ ] `DATABASE_URL` = (staging database)
  - [ ] `REDIS_URL` = (staging redis)
  - [ ] `FRONTEND_URL` = `https://staging-app.yourdomain.com`
  - [ ] All other vars same as production

- [ ] **10.4** Deploy staging environment
  - [ ] All staging services deployed
  - [ ] No errors in logs
  - [ ] All three frontend apps accessible on staging domains
  - [ ] API responding on staging endpoint

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 4: Environment Variable Management

- [ ] **11.0** Create `.env.production.example`
  - [ ] File created with all required variables
  - [ ] No actual secrets included
  - [ ] Documented each variable purpose

- [ ] **11.1** Implement secret management policy
  - [ ] No `.env.production` files in git
  - [ ] All secrets in Vercel/Railway dashboards only
  - [ ] Team trained on secret rotation
  - [ ] Audit trail maintained

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 5: Health Check & Connectivity

- [ ] **12.0** Test API health endpoints
  - [ ] `curl https://api.yourdomain.com/api/health`
  - [ ] Expected: `{ "status": "ok" }`

- [ ] **12.1** Test database health
  - [ ] `curl https://api.yourdomain.com/api/health/db`
  - [ ] Expected: database connection successful

- [ ] **12.2** Test Redis health
  - [ ] `curl https://api.yourdomain.com/api/health/redis`
  - [ ] Expected: redis connection successful

- [ ] **12.3** Test frontend to API connectivity
  - [ ] Navigate to `app.yourdomain.com/login`
  - [ ] Open DevTools Network tab
  - [ ] Attempt API call (e.g., login attempt)
  - [ ] Verify: API endpoint called correctly
  - [ ] Verify: No CORS errors
  - [ ] Verify: Response received

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 6: Security Configuration

- [ ] **13.0** Configure CORS
  - [ ] In API codebase, verified CORS origins:
    - [ ] `https://app.yourdomain.com`
    - [ ] `https://admin.yourdomain.com`
  - [ ] Test CORS headers:
    ```bash
    curl -H "Origin: https://app.yourdomain.com" -v https://api.yourdomain.com/api/health
    ```
  - [ ] Verify: `Access-Control-Allow-Origin` header present

- [ ] **13.1** Verify SSL/TLS certificates
  - [ ] Both Vercel and Railway auto-provide SSL
  - [ ] Test HTTPS: `curl -v https://api.yourdomain.com/api/health`
  - [ ] Verify: SSL certificate is valid (not self-signed)

- [ ] **13.2** Configure rate limiting
  - [ ] API implements rate limiting
  - [ ] Rate limit middleware/guard configured
  - [ ] Test: Send > 100 requests/minute
  - [ ] Verify: 429 (Too Many Requests) response after limit exceeded

- [ ] **13.3** Enable security headers
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Strict-Transport-Security: max-age=31536000`
  - [ ] Verify headers present in response

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 7: Monitoring & Alerting

- [ ] **14.0** Configure Sentry
  - [ ] Sentry account created
  - [ ] Projects created for main app, admin app, API
  - [ ] DSN configured in all apps
  - [ ] Alert notifications configured (email/Slack)

- [ ] **14.1** Configure Railway monitoring
  - [ ] Environment Insights enabled
  - [ ] Alerts set for:
    - [ ] CPU > 80%
    - [ ] Memory > 90%
    - [ ] Error rate increase
  - [ ] Notifications configured

- [ ] **14.2** Configure uptime monitoring
  - [ ] Service chosen (UptimeRobot, Pingdom, etc)
  - [ ] Monitors created for:
    - [ ] API health: `https://api.yourdomain.com/api/health`
    - [ ] Main app: `https://app.yourdomain.com`
    - [ ] Admin app: `https://admin.yourdomain.com`
  - [ ] Alert thresholds set
  - [ ] Notification channels configured

- [ ] **14.3** Test alerting system
  - [ ] Manually trigger a Sentry error
  - [ ] Verify Slack/email notification received
  - [ ] Total alert latency: < 2 minutes

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 8: Pre-Production Testing

### Patient Workflow Testing

- [ ] **15.0** Patient Registration
  - [ ] Navigate to `app.yourdomain.com`
  - [ ] Register new patient with email
  - [ ] Verify: Confirmation email received
  - [ ] Verify: Patient can login

- [ ] **15.1** Clinic Assignment
  - [ ] Patient joins a clinic
  - [ ] Verify: Clinic appears in dashboard
  - [ ] Verify: Patient can view clinic details

- [ ] **15.2** Appointment Booking
  - [ ] Patient books appointment with doctor
  - [ ] Verify: Appointment appears in patient calendar
  - [ ] Verify: Doctor receives notification

- [ ] **15.3** Medical History Access
  - [ ] Patient uploads medical history document
  - [ ] Verify: Document saved to database
  - [ ] Verify: Doctor can access document

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

### Doctor Workflow Testing

- [ ] **16.0** Doctor Login
  - [ ] Navigate to `app.yourdomain.com`
  - [ ] Doctor logs in with credentials
  - [ ] Verify: Dashboard loads correctly

- [ ] **16.1** Dashboard View
  - [ ] Verify: Appointments displayed
  - [ ] Verify: Patient list accessible
  - [ ] Verify: Real-time updates

- [ ] **16.2** Patient Management
  - [ ] Doctor searches for patient
  - [ ] Verify: Patient found and record displayed
  - [ ] Verify: Medical history visible

- [ ] **16.3** Appointment Management
  - [ ] Doctor views appointments
  - [ ] Doctor marks appointment complete
  - [ ] Verify: Status updated in system
  - [ ] Verify: Patient notified

- [ ] **16.4** Prescription Creation
  - [ ] Doctor creates prescription
  - [ ] Verify: Prescription saved
  - [ ] Verify: Patient can view prescription

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

### Admin Workflow Testing

- [ ] **17.0** Admin Login
  - [ ] Navigate to `admin.yourdomain.com`
  - [ ] Admin logs in
  - [ ] Verify: Admin dashboard loads

- [ ] **17.1** User Management
  - [ ] View users list
  - [ ] Add new user
  - [ ] Edit user details
  - [ ] Deactivate user
  - [ ] Verify: All changes reflected

- [ ] **17.2** Clinic Management
  - [ ] View clinics list
  - [ ] Add new clinic
  - [ ] Edit clinic details
  - [ ] Verify: Changes saved

- [ ] **17.3** System Monitoring
  - [ ] View system metrics
  - [ ] Check logs
  - [ ] Verify: No errors in system

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

### Performance Testing

- [ ] **18.0** Load test API
  ```bash
  # Using wrk or Apache Bench
  wrk -t12 -c400 -d30s https://api.yourdomain.com/api/health
  ```
  - [ ] Requests/sec: > 100
  - [ ] Error rate: 0%
  - [ ] Average response time: < 500ms

- [ ] **18.1** Frontend performance
  - [ ] Navigate to main app
  - [ ] DevTools Lighthouse score: > 80
  - [ ] Page load time: < 3 seconds

- [ ] **18.2** Database query performance
  - [ ] Verify: No slow queries (> 1 second)
  - [ ] Check: Indices created on frequently queried fields
  - [ ] Test: Pagination works for large datasets

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

### Error Scenario Testing

- [ ] **19.0** Test database downtime handling
  - [ ] Simulate database connection loss
  - [ ] Verify: API returns appropriate error
  - [ ] Verify: Error logged in Sentry
  - [ ] Verify: User sees nice error message (not 500)

- [ ] **19.1** Test rate limiting
  - [ ] Send > 100 requests per minute
  - [ ] Verify: Requests rejected with 429
  - [ ] Verify: X-RateLimit headers present

- [ ] **19.2** Test invalid token handling
  - [ ] Try API call with expired JWT
  - [ ] Verify: 401 response
  - [ ] Verify: Frontend redirects to login

- [ ] **19.3** Test malformed requests
  - [ ] Send invalid JSON to API
  - [ ] Verify: 400 Bad Request response
  - [ ] Verify: No 500 errors in logs

**Status:** ⭕ Not Started  
**Assignee:** ___________  
**Completed By:** ___________  

---

## Phase 9: Production Readiness Checklist

### Infrastructure Verification

- [ ] **20.0** Vercel deployment verification
  - [ ] All 3 apps deployed: ✓ app, ✓ admin, ✓ landing
  - [ ] All domains working: ✓ domain 1, ✓ domain 2, ✓ domain 3
  - [ ] SSL certificates active: ✓
  - [ ] All environment variables set: ✓

- [ ] **20.1** Railway deployment verification
  - [ ] API deployed: ✓
  - [ ] PostgreSQL running: ✓
  - [ ] Redis running: ✓
  - [ ] All migration scripts ran: ✓

- [ ] **20.2** Connectivity verification
  - [ ] Frontend ↔ Backend: ✓
  - [ ] API ↔ Database: ✓
  - [ ] API ↔ Redis: ✓
  - [ ] External services (Sentry, etc): ✓

### Testing Verification

- [ ] **20.3** Critical workflows tested
  - [ ] Patient onboarding: ✓
  - [ ] Doctor dashboard: ✓
  - [ ] Admin panel: ✓
  - [ ] Appointments: ✓
  - [ ] All workflows passing: ✓

- [ ] **20.4** Performance verified
  - [ ] API response time: < 500ms ✓
  - [ ] Page load time: < 3 seconds ✓
  - [ ] Lighthouse score: > 80 ✓

- [ ] **20.5** Security verified
  - [ ] CORS configured: ✓
  - [ ] SSL active: ✓
  - [ ] Rate limiting: ✓
  - [ ] No sensitive data in logs: ✓

### Monitoring Verification

- [ ] **20.6** Monitoring active
  - [ ] Sentry receiving errors: ✓
  - [ ] Uptime monitoring active: ✓
  - [ ] Alerts configured: ✓
  - [ ] Team tested alert channels: ✓

### Documentation Verification

- [ ] **20.7** Documentation complete
  - [ ] Runbooks written: ✓
  - [ ] Escalation procedures documented: ✓
  - [ ] Emergency contacts listed: ✓
  - [ ] Rollback procedures documented: ✓

---

## Final Sign-Off

**DEPLOY-1 Infrastructure Setup Complete**

- ✅ All frontend apps deployed to Vercel
- ✅ Backend API deployed to Railway
- ✅ Database and Redis configured
- ✅ All systems verified and tested
- ✅ Monitoring and alerting active
- ✅ Team trained on deployment procedures

**Date Completed:** _______________  
**Completed By:** _______________  
**Reviewed By:** _______________  

**Status:** 🟢 READY FOR PRODUCTION DEPLOYMENT (DEPLOY-2)

---

**Next Phase:** DEPLOY-2: Production Deployment Guide  
**Timeline:** February 16-17, 2026  
**Target Pre-Launch Completion:** 86%

