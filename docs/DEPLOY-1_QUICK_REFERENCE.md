# DEPLOY-1: Quick Reference Commands

**Date:** February 14, 2026  
**Purpose:** Quick CLI reference for deployment operations

---

## Prerequisites Check

```bash
# Check Node.js version
node --version  # Should be 18.x or 20.x

# Check pnpm
pnpm --version

# Verify all apps can build
cd apps/app && pnpm build
cd ../admin && pnpm build
cd ../landing && pnpm build
cd ../../

# Verify API can run
cd apps/api && pnpm build
```

---

## Railway CLI Setup

```bash
# Install Railway CLI (macOS)
brew install railway

# Or use npx
npx @railway/cli --version

# Login to Railway
railway login
# (This opens browser for authentication)

# Verify login
railway whoami
```

---

## Environment Keys Generation

```bash
# Generate JWT_SECRET (128-bit hex = 32 chars)
openssl rand -hex 32
# Example output: 5a7c9e2f1b8d4c3a6f9e2d5c8a1b4e7f (save this)

# Generate ENCRYPTION_KEY (256-bit hex for AES-256)
openssl rand -hex 32
# Example output: a8c2d5e9f1b4c7a0d3e6f9a2c5d8e1b4 (save this)

# Alternative: Generate longer key for extra security
openssl rand -hex 64
```

---

## Vercel CLI Setup

```bash
# Install Vercel CLI
pnpm add -g vercel

# Or use npx (always latest)
npx vercel --version

# Link to Vercel account
vercel login

# Verify linked projects
vercel projects
```

---

## Database Migrations via Railway

```bash
# Select the Railway service
railway service api

# Run pending migrations
railway run pnpm db:migrate:deploy

# Verify migrations
railway run pnpm prisma migrate status

# View database
railway run pnpm db:inspect

# Seed database (optional)
railway run pnpm db:seed

# Reset database (DANGEROUS - staging only)
railway run pnpm db:reset
```

---

## Health Check Commands

```bash
# Basic health check
curl -s https://api.yourdomain.com/api/health | jq .

# Database connectivity
curl -s https://api.yourdomain.com/api/health/db | jq .

# Redis connectivity
curl -s https://api.yourdomain.com/api/health/redis | jq .

# Metrics (if endpoint exists)
curl -s https://api.yourdomain.com/api/health/metrics | jq .

# Test CORS headers
curl -H "Origin: https://app.yourdomain.com" -v https://api.yourdomain.com/api/health

# Check SSL certificate
curl -v https://api.yourdomain.com/api/health 2>&1 | grep SSL
```

---

## Testing Commands

```bash
# Run critical flows tests (requires API running on localhost:3001)
cd apps/app && pnpm test:critical-flows

# Run against staging/production
PLAYWRIGHT_TEST_BASE_URL=https://app-staging.yourdomain.com \
API_URL=https://api-staging.yourdomain.com/api \
pnpm test:critical-flows

# Run specific test file
pnpm test -- e2e/critical-flows.spec.ts

# Run with debugging
pnpm test -- --debug e2e/critical-flows.spec.ts

# Generate test report
pnpm test -- --reporter=html
# Open: $PWD/playwright-report/index.html
```

---

## Deployment Command Examples

### Deploy to Vercel (via Git)

```bash
# Create staging branch (auto-deploys to vercel)
git checkout -b staging
git push origin staging

# Merge to main (auto-deploys to production)
git checkout main
git merge staging
git push origin main
```

### Deploy to Railway (via Git)

```bash
# Railway auto-deploys on push to connected branch
# Ensure 'main' branch is connected in Railway project

# Or deploy manually via CLI
railway service api
railway deploy

# Or trigger redeploy with environment changes
railway service api
railway redeploy
```

---

## Secret Management

```bash
# In Vercel - Add environment variable
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://api.yourdomain.com/api
# Choose environment: production

# In Railway - View all variables
railway service api
railway env cat

# In Railway - Set variable
railway env set JWT_SECRET=<value>

# In Railway - Redeploy after changing secrets
railway service api
railway redeploy
```

---

## Database Backup & Restore

```bash
# Backup PostgreSQL database (local machine)
# First, get DATABASE_URL from Railway

DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Full backup
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup and compress
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Restore from backup (DANGEROUS - careful with production!)
psql "$DATABASE_URL" < backup-20260214-120000.sql
```

---

## Monitoring & Logs

```bash
# Tail Railway API logs (real-time)
railway service api
railway logs --follow

# Get recent logs
railway logs --limit 100

# Export logs to file
railway logs --limit 1000 > api-logs-$(date +%Y%m%d).log

# Check Sentry for errors
# Web: https://sentry.io/organizations/your-org/issues/

# Search errors by transaction
curl -s https://sentry.io/api/0/organizations/your-org/issues/ \
  -H "Authorization: Bearer <auth-token>" | jq '.[] | {title, count}'
```

---

## Performance Testing

```bash
# Install wrk (macOS)
brew install wrk

# Load test API (1000 req, 10 concurrent)
wrk -t12 -c10 -d10s https://api.yourdomain.com/api/health

# More intense test
wrk -t12 -c400 -d30s https://api.yourdomain.com/api/health

# With script (test specific endpoint)
wrk -c10 -t4 -d30s \
  -s request.lua \
  https://api.yourdomain.com/api/appointments
```

---

## Troubleshooting Commands

```bash
# Check if ports are listening locally
lsof -i -P -n | grep LISTEN

# Check processes
ps aux | grep node

# Kill process on port 3001
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart services
railway service api && railway restart

# View environment variables in Railway
railway service api && railway env cat | grep DATABASE_URL

# Check git branch
git branch --show-current

# Verify changes before deploying
git status
git log --oneline -5

# Create emergency rollback marker
git tag production-rollback-$(date +%Y%m%d-%H%M%S)
git push origin production-rollback-$(date +%Y%m%d-%H%M%S)
```

---

## Rollback Procedures

```bash
# Rollback Vercel deployment
vercel rollback production

# Rollback to specific deployment
vercel rollback production <deployment-id>

# Check deployment history
vercel deployments

# For Railway - redeploy previous git commit
git revert HEAD
git push origin main
# Railway will auto-deploy the revert

# Or manually revert to specific commit
git reset --hard <commit-hash>
git push origin main --force

# Verify rollback successful
curl -s https://api.yourdomain.com/api/health | jq '.version'
```

---

## Verification Checklist After Deployment

```bash
# 1. Test frontend apps load
curl -s -o /dev/null -w "%{http_code}" https://app.yourdomain.com
curl -s -o /dev/null -w "%{http_code}" https://admin.yourdomain.com

# 2. Test API health
curl -s https://api.yourdomain.com/api/health | jq '.status'

# 3. Test database connectivity
curl -s https://api.yourdomain.com/api/health/db | jq '.database'

# 4. Check Sentry for new errors
# Visit: https://sentry.io/organizations/your-org/issues/

# 5. Run critical flows test (staging)
cd apps/app && STAGING=true pnpm test:critical-flows

# 6. Check monitoring and alerts
# Uptime: UptimeRobot dashboard
# Errors: Sentry dashboard
# Performance: Vercel analytics
```

---

## Automated Deployment Script Example

```bash
#!/bin/bash
# deploy.sh - Semi-automated deployment

set -e

echo "🚀 Starting deployment to staging..."

# 1. Verify build
echo "📦 Building apps..."
pnpm build

# 2. Run tests
echo "🧪 Running tests..."
pnpm test:critical-flows

# 3. Create staging branch
echo "📝 Creating staging branch..."
git checkout -b staging-deploy-$(date +%s)

# 4. Push to trigger Vercel deployment
echo "🚀 Deploying to Vercel..."
git push origin staging-deploy-$(date +%s)

# 5. Wait for deployments
echo "⏳ Waiting 60 seconds for Vercel deployments..."
sleep 60

# 6. Test domains
echo "✅ Testing domains..."
curl -s -f https://staging-app.yourdomain.com > /dev/null && echo "✓ Main app"
curl -s -f https://staging-admin.yourdomain.com > /dev/null && echo "✓ Admin app"
curl -s -f https://api.yourdomain.com/api/health > /dev/null && echo "✓ API"

echo "✅ Staging deployment complete!"
```

---

## Environment Variable Reference

```bash
# Save this template as .env.production.example (NO SECRETS!)

# Database
DATABASE_URL=postgresql://user:password@host:5432/docita_prod

# Redis
REDIS_URL=redis://:password@host:6379

# Auth
JWT_SECRET=<hex_128_bits>
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=<hex_256_bits>

# Services
RAZORPAY_KEY_ID=rzp_live_key
RAZORPAY_KEY_SECRET=secret_key
WHATSAPP_BUSINESS_ACCOUNT_ID=123456
WHATSAPP_PHONE_NUMBER_ID=123456

# URLs
FRONTEND_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# Monitoring
SENTRY_DSN=https://key@sentry.io/project

# App Mode
NODE_ENV=production
LOG_LEVEL=info
```

---

## Common Issues & Solutions

### Issue: 502 Bad Gateway

```bash
# Check if API is running
curl -v https://api.yourdomain.com/api/health

# Check Railway logs
railway logs --follow

# Check if database is connected
railway run pnpm db:inspect

# Restart service
railway restart
```

### Issue: CORS Error

```bash
# Verify CORS headers
curl -H "Origin: https://app.yourdomain.com" \
  -v https://api.yourdomain.com/api/health 2>&1 | grep Access-Control

# Check API code for CORS configuration
grep -r "enableCors\|allowedHeaders" apps/api/src/

# Update and redeploy
git push origin main
```

### Issue: Database Connection Failed

```bash
# Check DATABASE_URL is set
railway service api && railway env cat | grep DATABASE_URL

# Test connection string directly
psql <paste-database-url-here>

# If fails, regenerate Railway database
# (Warning: This deletes data!)
```

---

**Quick Start Checklist:**

```
☐ Install Railway CLI: brew install railway
☐ Install Vercel CLI: pnpm add -g vercel
☐ Generate JWT_SECRET: openssl rand -hex 32
☐ Generate ENCRYPTION_KEY: openssl rand -hex 32
☐ Set environment in Vercel
☐ Set environment in Railway
☐ Run migrations: railway run pnpm db:migrate:deploy
☐ Test health: curl https://api.yourdomain.com/api/health
☐ Deploy staging: git push origin staging
☐ Deploy production: git push origin main
☐ Verify: Smoke tests pass
```

---

**For Help:**

- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs/
