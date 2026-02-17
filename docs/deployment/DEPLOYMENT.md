# Deployment Guide

**Last Updated:** February 15, 2026  
**Status:** Production Ready  
**Strategy:** Railway (Primary) | AWS EC2 (Alternative)

This guide covers deployment of the Docita monorepo to production infrastructure.

## Deployment Decision Summary

- **Primary path:** Vercel (frontend) + Railway (API, PostgreSQL, Redis)
- **Alternative path:** Vercel (frontend) + AWS EC2/RDS/ElastiCache
- **Decision basis:** faster setup and lower operational overhead on Railway for launch phase, with AWS retained for enterprise compliance and advanced infrastructure control.

The previous standalone decision document has been archived at `docs/archive/deployment/DEPLOYMENT_STRATEGY.md` to keep this file as the single canonical deployment guide.

## Architecture Overview

### Primary Deployment Stack (Railway - Recommended)

- **Frontend Applications (Next.js)**:
  - `apps/landing`: Public landing page
  - `apps/app`: Main clinic/patient dashboard
  - `apps/admin`: Super admin dashboard
  - **Platform**: Vercel (optimized for Next.js)

- **Backend API (NestJS)**:
  - `apps/api`: REST API & WebSocket server
  - **Platform**: Railway (managed containers)

- **Database & Cache**:
  - **PostgreSQL**: Railway managed PostgreSQL 15+
  - **Redis**: Railway managed Redis 7+
  - **Advantages**: Integrated platform, automatic backups, zero-config scaling

### Alternative Deployment Stack (AWS - Enterprise)

Available for organizations requiring AWS compliance or existing AWS infrastructure:

- **Backend**: AWS EC2 with Docker containers
- **Database**: AWS RDS PostgreSQL (multi-AZ)
- **Cache**: AWS ElastiCache Redis
- **CI/CD**: GitHub Actions → AWS ECR → EC2

See [Section 7: AWS EC2 Deployment](#7-aws-ec2-deployment-alternative) for details.

---

## Quick Start (Railway Deployment)

For detailed step-by-step instructions, see [DEPLOY-1_INFRASTRUCTURE_SETUP.md](./DEPLOY-1_INFRASTRUCTURE_SETUP.md)

```bash
# 1. Install Railway CLI
brew install railway

# 2. Login and link project
railway login
railway link

# 3. Deploy API to Railway
railway up

# 4. Deploy frontends to Vercel
vercel --prod
```

---

## 1. Railway Deployment (Primary Strategy)

Railway provides a streamlined deployment experience with managed PostgreSQL, Redis, and application hosting.

### 1.1 Prerequisites

- Railway account ([railway.app](https://railway.app))
- Railway CLI installed: `brew install railway`
- GitHub repository connected to Railway
- Vercel account for frontend apps

### 1.2 Initial Setup

#### Create Railway Project

```bash
# Login to Railway
railway login

# Create new project (or link existing)
railway init

# Link to your repository
railway link
```

#### Deploy API Service

Railway auto-detects the monorepo structure using `railway.json`:

```bash
# Deploy API
railway up

# View deployment logs
railway logs
```

#### Add PostgreSQL Database

```bash
# Add PostgreSQL service via Railway Dashboard or CLI
railway add --database postgresql

# Railway automatically sets DATABASE_URL environment variable
```

#### Add Redis Cache

```bash
# Add Redis service
railway add --database redis

# Railway automatically sets REDIS_URL environment variable
```

### 1.3 Environment Variables

Set these in Railway Dashboard → Variables tab:

```env
# Database (Auto-set by Railway)
DATABASE_URL=postgresql://...

# Redis (Auto-set by Railway)
REDIS_URL=redis://...

# Authentication
JWT_SECRET=<generate with: openssl rand -hex 32>
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>

# Payment (Razorpay)
RAZORPAY_KEY_ID=<from Razorpay dashboard>
RAZORPAY_KEY_SECRET=<from Razorpay dashboard>

# WhatsApp Business API
WHATSAPP_BUSINESS_ACCOUNT_ID=<from Meta Business Manager>
WHATSAPP_PHONE_NUMBER_ID=<from Meta>
WHATSAPP_API_TOKEN=<from Meta>

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
NODE_ENV=production
LOG_LEVEL=info

# Frontend URLs
FRONTEND_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
LANDING_URL=https://www.yourdomain.com

# CORS Origins
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com

# File Storage (if using AWS S3)
AWS_S3_BUCKET=docita-prod-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from AWS IAM>
AWS_SECRET_ACCESS_KEY=<from AWS IAM>
```

### 1.4 Database Migrations

```bash
# Run migrations via Railway CLI
railway run pnpm db:migrate:deploy

# Or set DATABASE_URL locally and run migrations
railway variables --json | jq -r '.DATABASE_URL' | xargs -I {} env DATABASE_URL={} pnpm db:migrate:deploy
```

### 1.5 Custom Domain Setup

**In Railway Dashboard:**

1. Go to your API service → Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Update DNS records as instructed by Railway
4. SSL certificate is automatically provisioned

### 1.6 Monitoring & Logs

```bash
# View real-time logs
railway logs --follow

# View specific service
railway logs --service api

# View metrics in Railway Dashboard
# Navigate to Metrics tab for CPU, memory, network usage
```

---

## 2. Frontend Deployment (Vercel)

Each Next.js application is deployed as a separate Vercel project with automatic deployments from Git.

### 2.1 Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- GitHub repository connected to Vercel
- Vercel CLI (optional): `pnpm add -g vercel`

### 2.2 Deploy Applications

Vercel auto-detects the monorepo structure. For each app:

#### Landing Page (`apps/landing`)

**In Vercel Dashboard:**

1. **New Project** → Import from GitHub → Select repository
2. **Configure Project:**
   - Framework: Next.js
   - Root Directory: `apps/landing`
   - Build Command: (auto-detected)
   - Output Directory: (auto-detected)

3. **Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

4. **Domain Settings:**
   - Production: `www.yourdomain.com` or `yourdomain.com`
   - Auto-deploy: Enable for `main` branch

#### Main App (`apps/app`)

**Configure Project:**
- Root Directory: `apps/app`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Domain:**
- Production: `app.yourdomain.com`

#### Admin Dashboard (`apps/admin`)

**Configure Project:**
- Root Directory: `apps/admin`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Domain:**
- Production: `admin.yourdomain.com`

### 2.3 Important Notes

> **Critical**: `NEXT_PUBLIC_*` variables are embedded at **build time**. After updating environment variables, you must redeploy:
> 
> 1. Go to Deployments tab
> 2. Click "..." → "Redeploy"
> 3. **Uncheck** "Use existing Build Cache"
> 4. Click "Redeploy"

### 2.4 Monorepo Build Configuration

Vercel automatically detects Turborepo. If needed, customize in `vercel.json`:

```json
{
  "buildCommand": "turbo build --filter=@docita/app"
}
```

---

## 3. Database Migrations

### 3.1 Production Migrations (Railway)

```bash
# Option 1: Via Railway CLI
railway run pnpm db:migrate:deploy

# Option 2: Using connection string
export DATABASE_URL="<from Railway dashboard>"
pnpm --filter @workspace/db db:migrate:deploy

# Option 3: From package root
pnpm db:migrate
```

### 3.2 Verify Migrations

```bash
# Check migration status
railway run pnpm prisma migrate status

# View database schema
railway run pnpm prisma db pull
```

### 3.3 Seed Production Data

```bash
# Run seed scripts (use with caution in production)
railway run pnpm --filter @workspace/db db:seed

# Or run specific seed files
railway run pnpm prisma db seed
```

---

## 4. CI/CD Pipeline

### 4.1 Automatic Deployments

**Frontend (Vercel):**
- Automatically deploys on push to `main` branch
- Preview deployments for all pull requests
- Zero configuration needed

**Backend (Railway):**
- Automatically deploys on push to `main` branch
- Preview environments available with Railway Pro
- Configure in Railway dashboard → Deployments

### 4.2 Manual Deployments

**Frontend:**
```bash
# Deploy specific app to Vercel
cd apps/app
vercel --prod

# Or from root
vercel --prod --cwd apps/app
```

**Backend:**
```bash
# Deploy to Railway
railway up

# Deploy with specific service
railway up --service api
```

### 4.3 Deployment Checks

Before deploying to production:

```bash
# Run all tests
pnpm test

# Lint code
pnpm lint

# Build all apps
pnpm build

# Test API build specifically
pnpm build:api
```

---

## 5. Monitoring & Observability

### 5.1 Railway Monitoring

**View Metrics:**
- CPU, Memory, Network usage in Railway Dashboard
- Real-time logs: `railway logs --follow`
- Deployment history and rollbacks available

### 5.2 Sentry Error Tracking

**Backend (NestJS):**
- Configured in `apps/api/src/main.ts`
- Automatic error capture
- Performance monitoring enabled

**Frontend (Next.js):**
- Configured in `instrumentation.ts` files
- Client-side error tracking
- Server-side error tracking

**Sentry Dashboard:**
- View errors, stack traces, breadcrumbs
- Configure alerts for critical errors
- Monitor performance metrics

### 5.3 Health Checks

**API Endpoints:**
```bash
# Liveness check
curl https://api.yourdomain.com/api/health/live

# Readiness check (includes DB connection)
curl https://api.yourdomain.com/api/health/ready

# Metrics
curl https://api.yourdomain.com/api/health/metrics
```

**Railway Health Checks:**
- Configured automatically
- HTTP GET to `/api/health/live`
- Unhealthy containers automatically restarted

---

## 6. Production Checklist

Before going live:

### Infrastructure
- [ ] Railway API service deployed and running
- [ ] PostgreSQL database configured
- [ ] Redis cache configured
- [ ] All 3 Vercel projects deployed (landing, app, admin)
- [ ] Custom domains configured with SSL
- [ ] Environment variables set for all services
- [ ] CORS origins configured correctly

### Security
- [ ] JWT secrets generated and set (32+ characters)
- [ ] Encryption keys set (32+ characters)
- [ ] API keys for third-party services configured
- [ ] Database connection uses SSL
- [ ] Secrets stored in Railway/Vercel (not in code)

### Testing
- [ ] All unit tests passing (`pnpm test`)
- [ ] E2E tests passing
- [ ] Manual testing of critical flows
- [ ] Performance testing completed

### Monitoring
- [ ] Sentry configured for all apps
- [ ] Railway monitoring reviewed
- [ ] Health checks responding
- [ ] Alerts configured for critical errors

### Documentation
- [ ] Incident response plan documented
- [ ] On-call runbook prepared
- [ ] Team has access to all dashboards
- [ ] Rollback procedures documented

---
## 7. AWS EC2 Deployment (Alternative)

> **Note**: This is an alternative deployment strategy for organizations requiring AWS infrastructure compliance or existing AWS investments. The primary recommended approach is Railway (Section 1).

### 7.1 Prerequisites

- AWS Account with EC2 access
- Docker installed locally (for building/pushing)
- AWS RDS PostgreSQL or Neon database
- **AWS ECR Repository**: Must be created in **us-west-1** region (or update `AWS_REGION` in workflow)
  ```bash
  aws ecr create-repository --repository-name docita-api --region us-west-1
  ```
- **ECR Lifecycle Policy**: Recommended to prevent storage costs
  ```bash
  # Apply lifecycle policy (keeps last 5 images, expires untagged after 30 days)
  ./scripts/setup-ecr-lifecycle-policy.sh
  ```
- **Multi-arch Support**: Images built for `linux/amd64` and `linux/arm64`

### 7.2 Docker Build

Navigate to the project root and run:

```bash
# Build packages first (required for Docker build)
pnpm install
pnpm --filter @workspace/db run build
pnpm --filter @workspace/types run build
pnpm --filter @docita/api run build

# Build Docker image
docker build -f apps/api/Dockerfile -t docita-api .
```

> **Note**: The Dockerfile uses a **multi-stage build** process with aggressive caching for dependencies, resulting in ~120MB images and faster build times.

### 7.3 Running the Container

Ensure you provide the necessary environment variables.

```bash
docker run -d -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@host/docita?sslmode=require" \
  -e REDIS_URL="redis://host:6379" \
  -e JWT_SECRET="your-secret" \
  -e PORT=3001 \
  docita-api
```

### 7.4 AWS EC2 Deployment Steps

#### 1. Launch EC2 Instance

- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t3.medium (minimum) or t3.large (recommended)
- **Security Group**:
  - Allow SSH (port 22) from your IP
  - Allow HTTP (port 80) from anywhere
  - Allow HTTPS (port 443) from anywhere
- **Storage**: 30GB gp3 (minimum)
- **Key Pair**: Create/use existing for SSH access
- **Elastic IP**: Allocate and associate for consistent address (recommended)

#### 1a. Associate Elastic IP (Recommended)

Elastic IPs ensure your instance IP remains constant:

```bash
# In AWS Console:
# 1. Go to Elastic IPs in EC2 Dashboard
# 2. Allocate new address
# 3. Associate with your EC2 instance
# 4. Update your domain DNS records to point to the Elastic IP

# Or use AWS CLI:
aws ec2 allocate-address --domain vpc --region us-east-1
aws ec2 associate-address --instance-id i-xxxxx --allocation-id eipalloc-xxxxx --region us-east-1
```

#### 2. Connect to EC2

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

#### 3. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
```

### 7.5 Database Options for AWS Deployment

#### Option A: AWS RDS PostgreSQL (Enterprise)

**Best for**: Production workloads requiring high availability, automated backups, and AWS compliance.

**Setup:**
1. Create RDS PostgreSQL instance in AWS Console
   - Engine: PostgreSQL 15.x
   - Instance class: db.t3.medium (minimum)
   - Multi-AZ: Enable for production
   - Storage: 100GB gp3 (auto-scaling enabled)
   - Backup retention: 7 days minimum

2. Configure security groups
   - Allow PostgreSQL (5432) from EC2 security group
   - No public access

3. Get connection string
   ```
   postgresql://username:password@rds-endpoint.region.rds.amazonaws.com:5432/docita
   ```

**Costs:** ~$50-100/month for db.t3.medium with multi-AZ

#### Option B: Neon Serverless PostgreSQL (Cost-Effective)

**Best for**: Development, staging, and cost-conscious production deployments.

**Setup:**
1. Create Neon account at [neon.tech](https://neon.tech)
2. Create project: `docita-production`
3. Select region closest to your EC2 (e.g., `us-east-1`)
4. Get connection string from dashboard:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

**Benefits:**
- Instant provisioning
- Scales to zero when idle
- Database branching for testing
- Automatic point-in-time recovery
- Pay-per-use pricing (~$20-40/month typical usage)

**Migration from Neon to RDS:**
```bash
# Export from Neon
pg_dump -h ep-xxx.region.aws.neon.tech -U user dbname > backup.sql

# Import to RDS
psql -h rds-endpoint.region.rds.amazonaws.com -U user dbname < backup.sql

# Update DATABASE_URL and redeploy
```

#### Option C: Railway PostgreSQL (Hybrid)

**Best for**: Combining Railway database with AWS EC2 compute.

- Use Railway managed PostgreSQL
- Benefits: Simple management, automatic backups
- Connect EC2 to Railway database via public endpoint
- Costs: ~$10-30/month

### 7.6 Redis Cache Setup

#### Option A: AWS ElastiCache Redis

```bash
# Create ElastiCache Redis cluster via AWS Console
# - Engine: Redis 7.x
# - Node type: cache.t3.micro (minimum)
# - Security group: Allow Redis (6379) from EC2

# Connection string format:
REDIS_URL=redis://cache-endpoint.region.cache.amazonaws.com:6379
```

#### Option B: Railway Redis

```bash
# Use Railway managed Redis
# - Simpler management
# - Connect from EC2 via public endpoint
# - Get REDIS_URL from Railway dashboard
```

### 7.7 Database Migrations (AWS Deployment)

```bash
# Option 1: From local machine
export DATABASE_URL="<production-url>"
pnpm db:migrate:deploy

# Option 2: From EC2 instance
ssh -i "your-key.pem" ubuntu@your-ec2-ip
cd /path/to/docita
export DATABASE_URL="<production-url>"
pnpm db:migrate:deploy

# Option 3: Inside Docker container
docker exec -it docita-api npx prisma migrate deploy
```

### 7.8 GitHub Actions CI/CD (AWS)

The project includes pre-configured GitHub Actions workflows for AWS deployment:

**Available Workflows:**

1. **`deploy-api.yml`** (Primary)
   - Trigger: Push to `main` with API changes
   - Process: Test → Build → Push to ECR → Deploy to EC2
   - Features: Zero-downtime deployment, health checks, rollback on failure

2. **`rollback-api.yml`** (Emergency)
   - Trigger: Manual dispatch only
   - Reverts to specific image tag
   - Requires confirmation

3. **`deploy-app-runner.yml`** (Alternative)
   - Serverless container deployment
   - No EC2 management required
   - Auto-scaling, load balancing included

**Required GitHub Secrets:**

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `wJalr...` |
| `AWS_ACCOUNT_ID` | AWS Account ID | `123456789012` |
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` |
| `EC2_USERNAME` | EC2 SSH username | `ubuntu` |
| `EC2_SSH_KEY` | EC2 private key (full content) | `-----BEGIN...` |

**See:** [.github/workflows/README.md](../.github/workflows/README.md) for detailed workflow documentation.

### 7.9 AWS App Runner (Serverless Alternative)

> **Recommended** for removing EC2 operational overhead. Costs slightly more (~$15/mo) but includes auto-scaling, load balancing, and zero-maintenance infrastructure.

**Setup:**

1. Push image to ECR (same as EC2 deployment)
2. Create App Runner Service in AWS Console:
   - Source: Container Registry → Amazon ECR
   - Image URI: Select `docita-api` image (Region: `us-west-1`)
   - Deployment: Manual (GitHub Actions handles this)
   - Configuration:
     - CPU: 1 vCPU
     - Memory: 2 GB
     - Port: 3001
   - Environment variables: Add all required variables

3. Copy Service ARN: `arn:aws:apprunner:us-west-1:123456789012:service/docita-api/xyz`

4. Add to GitHub Secrets:
   - Name: `APP_RUNNER_SERVICE_ARN`
   - Value: Your Service ARN

**Deploy:**
```bash
# Via GitHub Actions
# Go to Actions → "Build & Deploy to App Runner" → Run workflow

# Or enable auto-deploy by uncommenting push trigger in workflow file
```

---

## 8. Deployment Comparison

| Feature | Railway (Primary) | AWS EC2 | AWS App Runner |
|---------|------------------|---------|----------------|
| **Setup Time** | 15 minutes | 2-3 hours | 1-2 hours |
| **Monthly Cost** | $20-50 | $30-80 | $15-60 |
| **Maintenance** | Zero | Medium | Low |
| **Scalability** | Auto (horizontal) | Manual | Auto (horizontal) |
| **Database** | Managed PostgreSQL | RDS or external | External required |
| **Redis** | Managed Redis | ElastiCache or external | External required |
| **CI/CD** | Built-in | GitHub Actions | GitHub Actions |
| **Monitoring** | Built-in | CloudWatch | CloudWatch |
| **SSL/HTTPS** | Auto (Let's Encrypt) | Manual (Nginx) | Auto (AWS) |
| **Health Checks** | Auto | Manual | Auto |
| **Zero-downtime** | Yes | Yes (with workflow) | Yes |
| **Best For** | Rapid deployment, startups | AWS compliance, enterprise | Serverless preference |

**Recommendation:**
- **Start with Railway**: Fastest path to production, excellent developer experience
- **Migrate to AWS later** if needed for compliance, existing infrastructure, or specific AWS services

---

## 9. Troubleshooting

### 9.1 CORS Errors

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

1. **Verify API CORS Configuration** (`apps/api/src/main.ts`):
```typescript
app.enableCors({
  origin: [
    "https://yourdomain.com",
    "https://app.yourdomain.com",
    "https://admin.yourdomain.com",
    "http://localhost:3000", // dev only
  ],
  credentials: true,
});
```

2. **Check Frontend Environment Variables:**
   - Ensure `NEXT_PUBLIC_API_URL` points to production API
   - Redeploy frontend after changing env vars (build-time embedding)

3. **Verify Domain Configuration:**
   - API domain: `api.yourdomain.com`
   - App domain: `app.yourdomain.com`
   - No mismatches in HTTP vs HTTPS

### 9.2 Database Connection Issues

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Solutions:**

**Railway:**
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test connection
railway run pnpm prisma db pull

# Check Railway database status in dashboard
```

**AWS:**
```bash
# Test RDS connection from EC2
psql $DATABASE_URL -c "SELECT 1"

# Check security groups allow port 5432
# Verify RDS instance is running

# Test from local machine (if public access enabled)
psql "postgresql://user:pass@rds-endpoint/dbname" -c "SELECT 1"
```

### 9.3 Build Failures

**Monorepo Build Issues:**

```bash
# Clean and rebuild
pnpm clean
rm -rf node_modules
rm -rf .turbo
pnpm install
pnpm build

# Build specific packages in order
pnpm --filter @workspace/db build
pnpm --filter @workspace/types build
pnpm --filter @docita/api build
```

**Docker Build Issues:**

```bash
# Clear Docker cache
docker builder prune -a

# Build with no cache
docker build --no-cache -f apps/api/Dockerfile -t docita-api .

# Check Dockerfile syntax
docker build --dry-run -f apps/api/Dockerfile .
```

### 9.4 Migration Failures

**Symptoms:**
```
Error: Migration "xxx_migration" failed
```

**Solutions:**

```bash
# 1. Check migration file for syntax errors
cat packages/db/prisma/migrations/xxx_migration/migration.sql

# 2. Verify DATABASE_URL is correct
echo $DATABASE_URL

# 3. Test migration locally first
DATABASE_URL=<staging-url> pnpm db:migrate:deploy

# 4. If migration is stuck, mark as applied
pnpm prisma migrate resolve --applied "xxx_migration"

# 5. For urgent rollback
pnpm prisma migrate resolve --rolled-back "xxx_migration"
```

### 9.5 Environment Variables Not Loading

**Railway:**
```bash
# List all variables
railway variables

# Restart service to pick up new variables
railway service api
railway restart

# Verify in logs
railway logs | grep -i "environment"
```

**Vercel:**
```bash
# List environment variables
vercel env ls

# Pull latest env vars
vercel env pull

# Remember: NEXT_PUBLIC_* requires rebuild!
```

---

## 10. Best Practices

### 10.1 Security

- [ ] Never commit secrets to Git
- [ ] Use environment variables for all secrets
- [ ] Rotate JWT secrets every 90 days
- [ ] Enable database SSL/TLS in production
- [ ] Use strong encryption keys (32+ characters)
- [ ] Implement rate limiting on API
- [ ] Configure CORS strictly (no wildcards)
- [ ] Enable Sentry for security alerts
- [ ] Regular security audits: `pnpm audit`

### 10.2 Performance

- [ ] Enable Redis caching for API responses
- [ ] Use database indexes for common queries
- [ ] Implement CDN for static assets
- [ ] Monitor API response times (< 200ms target)
- [ ] Set up database connection pooling
- [ ] Enable gzip compression
- [ ] Optimize Docker image size
- [ ] Use read replicas for heavy read workloads

### 10.3 Reliability

- [ ] Set up health check endpoints
- [ ] Configure automatic restarts on failure
- [ ] Implement graceful shutdown
- [ ] Database backups (daily minimum)
- [ ] Document rollback procedures
- [ ] Test disaster recovery plan
- [ ] Monitor error rates and uptime
- [ ] Set up alerting for critical errors

### 10.4 Monitoring

- [ ] Configure Sentry error tracking
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Monitor database performance
- [ ] Track API endpoint usage
- [ ] Set up log aggregation
- [ ] Create alerting rules
- [ ] Monitor resource usage (CPU, memory)
- [ ] Review dashboards regularly
- [ ] Maintain incident response runbook

### 10.5 Development Workflow

- [ ] Use staging environment for testing
- [ ] Test locally before deploying: `pnpm test`
- [ ] Review build output for warnings
- [ ] Test migrations on staging first
- [ ] Use feature flags for risky changes
- [ ] Document deployment steps
- [ ] Communicate deployments to team
- [ ] Have rollback plan ready

---

## 11. Quick Reference

### Railway Commands

```bash
# Deploy
railway up

# View logs
railway logs --follow

# Run migrations
railway run pnpm db:migrate:deploy

# Access database
railway connect postgres

# List variables
railway variables

# Restart service
railway restart
```

### Vercel Commands

```bash
# Deploy to production
vercel --prod

# Deploy specific app
vercel --prod --cwd apps/app

# View deployments
vercel ls

# View logs
vercel logs

# Pull environment variables
vercel env pull
```

### Database Commands

```bash
# Run migrations
pnpm db:migrate:deploy

# Check migration status
pnpm prisma migrate status

# Seed database
pnpm db:seed

# Generate Prisma client
pnpm db:generate

# View database in browser
pnpm prisma studio
```

### Docker Commands (AWS Deployment)

```bash
# Build image
docker build -f apps/api/Dockerfile -t docita-api .

# Run container
docker run -d -p 3001:3001 --env-file .env docita-api

# View logs
docker logs -f docita-api

# Stop container
docker stop docita-api

# Remove container
docker rm docita-api

# Clean up
docker system prune -a
```

---

## 12. Support & Resources

### Documentation

- [DEPLOY-1 Infrastructure Setup Guide](./DEPLOY-1_INFRASTRUCTURE_SETUP.md) - Detailed step-by-step setup
- [DEPLOY-1 Quick Reference](./DEPLOY-1_QUICK_REFERENCE.md) - Common CLI commands
- [Architecture Documentation](../ARCHITECTURE.md) - System architecture overview
- [Incident Response Guide](../INCIDENT_RESPONSE.md) - Handling production incidents
- [On-Call Runbook](../ON_CALL_RUNBOOK.md) - Emergency procedures

### External Resources

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Prisma**: [prisma.io/docs](https://prisma.io/docs)
- **NestJS**: [docs.nestjs.com](https://docs.nestjs.com)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)

### Monitoring Dashboards

- **Railway**: [railway.app/dashboard](https://railway.app/dashboard)
- **Vercel**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Sentry**: [sentry.io](https://sentry.io)
- **AWS Console**: [console.aws.amazon.com](https://console.aws.amazon.com)

---

## Appendix A: Environment Variables Reference

### Backend API (Railway/EC2)

```env
# === Database ===
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379

# === Authentication ===
JWT_SECRET=<32+ character secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# === Encryption ===
ENCRYPTION_KEY=<32+ character key for AES-256>

# === Payment (Razorpay) ===
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# === WhatsApp Business API ===
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxx
WHATSAPP_API_TOKEN=EAAxxxxx

# === Email (Resend) ===
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com

# === File Storage (AWS S3) ===
AWS_S3_BUCKET=docita-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxx
AWS_SECRET_ACCESS_KEY=xxxxx

# === Monitoring ===
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
NODE_ENV=production
LOG_LEVEL=info

# === Frontend URLs ===
FRONTEND_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
LANDING_URL=https://yourdomain.com

# === CORS ===
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com

# === Server ===
PORT=3001
HOST=0.0.0.0
```

### Frontend Apps (Vercel)

**apps/landing:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

**apps/app:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**apps/admin:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## Appendix B: Migration from Development to Production

### Pre-Migration Checklist

- [ ] All tests passing locally
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Third-party API keys obtained (Razorpay, WhatsApp, etc.)
- [ ] Domains registered and DNS configured
- [ ] SSL certificates ready (or auto-provisioned)
- [ ] Backups configured
- [ ] Monitoring tools set up

### Migration Steps

1. **Set up infrastructure** (Railway or AWS)
2. **Configure databases** (PostgreSQL, Redis)
3. **Run migrations** on production database
4. **Deploy backend** API service
5. **Verify backend** health checks passing
6. **Deploy frontends** to Vercel
7. **Configure DNS** to point to production
8. **Test end-to-end** all critical flows
9. **Enable monitoring** and alerts
10. **Document** runbooks and procedures

### Post-Migration Validation

```bash
# 1. Test API health
curl https://api.yourdomain.com/api/health/live
curl https://api.yourdomain.com/api/health/ready

# 2. Test authentication
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# 3. Check database connectivity
# Login to Railway/AWS and verify connection

# 4. Test frontend apps
# Visit https://yourdomain.com
# Visit https://app.yourdomain.com
# Visit https://admin.yourdomain.com

# 5. Verify monitoring
# Check Sentry for error tracking
# Check Railway/CloudWatch for metrics
```

---

**Last Updated:** February 15, 2026  
**Version:** 2.0  
**Status:** Production Ready

#### 4. Install Docker Compose (Optional)

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### 5. Push Image to Container Registry

Option A: **Amazon ECR**

##### ️ Important: ECR Login Method

**Modern Login Command (Recommended):**

```bash
# Works in scripts, GitHub Actions, and non-TTY environments
aws ecr get-login-password --region us-west-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-1.amazonaws.com
```

Error you might see with old method:

```
Error: "cannot perform an interactive login from a non-TTY device"
```

**Full ECR deployment steps:**

```bash
# IMPORTANT: Region must match workflow (us-west-1)
# Get your AWS Account ID first
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGION="us-west-1"
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$ECR_REGION.amazonaws.com"

# Login to ECR (use modern command)
aws ecr get-login-password --region $ECR_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Tag image
docker tag docita-api:latest $ECR_REGISTRY/docita-api:latest

# Push image
docker push $ECR_REGISTRY/docita-api:latest
```

> **Note:** Docker Hub can also be used as an alternative, but AWS ECR is recommended for production as it integrates better with AWS services and provides private image storage.

#### 6. Deploy on EC2

Create environment file on EC2:

```bash
# Create app directory
mkdir -p ~/docita
cd ~/docita

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/docita?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
EOF
```

Pull and run container:

```bash
# Set variables (must match workflow configuration)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGION="us-west-1"
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$ECR_REGION.amazonaws.com"

# Login to ECR first
aws ecr get-login-password --region $ECR_REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Pull image from ECR
docker pull $ECR_REGISTRY/docita-api:latest

# Run container
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  $ECR_REGISTRY/docita-api:latest

# Check logs
docker logs -f docita-api
```

#### 7. Setup Nginx Reverse Proxy

Nginx acts as a reverse proxy, forwarding traffic from port 80/443 to the API running on port 3001.

```bash
# Install Nginx
sudo apt install -y nginx

# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Create configuration
sudo nano /etc/nginx/sites-available/docita-api
```

Add HTTP configuration (before SSL setup):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.docita.work;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}
```

Enable site and test:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 7a. Setup SSL Certificate

```bash
# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (this will update nginx config automatically)
sudo certbot --nginx -d api.docita.work

# Verify auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

After Certbot configures SSL, verify your nginx config includes:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.docita.work;

    ssl_certificate /etc/letsencrypt/live/api.docita.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.docita.work/privkey.pem;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.docita.work;
    return 301 https://$server_name$request_uri;
}
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 8. Setup Auto-restart (Optional)

Create systemd service for better management:

```bash
sudo nano /etc/systemd/system/docita-api.service
```

Add:

```ini
[Unit]
Description=Docita API Container
Requires=docker.service
After=docker.service

[Service]
Restart=always
ExecStart=/usr/bin/docker start -a docita-api
ExecStop=/usr/bin/docker stop -t 2 docita-api

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl enable docita-api
sudo systemctl start docita-api
```

## 4. Database Migrations

Migrations should be run before deploying the new API version.

### Local Development

```bash
pnpm db:push  # or pnpm db:migrate
```

### Production (Neon)

Run migrations from your local machine or CI/CD:

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/docita?sslmode=require"

# Run migrations
cd packages/db
pnpm prisma migrate deploy
```

Or from EC2 container:

```bash
# Run migrations in container
docker exec -it docita-api npx prisma migrate deploy
```

### Using Neon Branches for Testing

```bash
# Create a branch for testing migrations
neonctl branches create --project-id your-project-id --name test-migration

# Get branch connection string
neonctl connection-string your-branch-id

# Test migration on branch
DATABASE_URL="branch-connection-string" pnpm prisma migrate deploy

# If successful, run on main branch
```

## 5. CI/CD Pipeline (GitHub Actions)

Recommended workflow for API-only deployment:

1. **Test**: Run `pnpm test` and `pnpm lint` on PRs.
2. **Build**: Verify `pnpm build` passes.
3. **Deploy Frontend**: Vercel automatically deploys on push to main.
4. **Deploy Backend**:
   - Build Docker image.
   - Push to AWS ECR.
   - SSH into EC2 to pull and restart container.

### GitHub Actions Deployment Workflow

The workflow is located at `.github/workflows/deploy-api.yml` and includes:

1. **Test Job**: Runs E2E tests (can be skipped for emergencies)
2. **Build Job**: Builds Docker image and pushes to AWS ECR
3. **Migrate Job**: Runs database migrations on Neon before deployment
4. **Deploy Job**: Zero-downtime deployment to EC2

Key features:

-  Tests run before deployment (gated)
-  Database migrations run before deployment
-  Zero-downtime deployment (blue-green style)
-  **Multi-architecture image builds** (linux/amd64 + linux/arm64)
-  Docker layer caching via ECR
-  Health check verification before switching traffic
-  Automatic old image cleanup
-  Rollback workflow available

Example workflow structure:

```yaml
name: Deploy API to Production

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/types/**'
      - 'packages/db/**'
      - 'apps/api/Dockerfile'
      - '.github/workflows/deploy-api.yml'
  workflow_dispatch:
    inputs:
      skip_tests:
        description: 'Skip tests (emergency deploy only)'
        required: false
        default: false
        type: boolean

env:
  AWS_REGION: us-west-1
  ECR_REPOSITORY: docita-api

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    if: ${{ github.event.inputs.skip_tests != 'true' }}
    # ... test steps ...

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [test]
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

  migrate:
    name: Run Database Migrations
    runs-on: ubuntu-latest
    needs: [build]
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10.4.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Prisma migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        working-directory: packages/db
        run: npx prisma migrate deploy

  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: [build, migrate]
    timeout-minutes: 15
    environment: production

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          platforms: linux/amd64,linux/arm64

      - name: Build, tag, and push image to Amazon ECR
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api/Dockerfile
          push: true
          platforms: linux/amd64,linux/arm64
          tags: |
            ${{ steps.login-ecr.outputs.registry }}/docita-api:latest
            ${{ steps.login-ecr.outputs.registry }}/docita-api:${{ github.sha }}
          cache-from: type=registry,ref=${{ steps.login-ecr.outputs.registry }}/docita-api:buildcache
          cache-to: type=registry,ref=${{ steps.login-ecr.outputs.registry }}/docita-api:buildcache,mode=max

  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: [build]
    environment: production

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-1

      - name: Get ECR Login Password
        id: ecr-login
        run: |
          echo "password=$(aws ecr get-login-password --region us-west-1)" >> $GITHUB_OUTPUT

      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@master
        env:
          ECR_PASSWORD: ${{ steps.ecr-login.outputs.password }}
          ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-west-1.amazonaws.com
          IMAGE_URI: ${{ needs.build.outputs.image_uri }}
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: 22
          timeout: 10m
          envs: ECR_PASSWORD,ECR_REGISTRY,IMAGE_URI
          script: |
            set -e

            # Export necessary AWS/ECR variables resolved on the runner
            export IMAGE_URI="${{ needs.build.outputs.image_uri }}"
            export AWS_ACCESS_KEY_ID="${{ secrets.AWS_ACCESS_KEY_ID }}"
            export AWS_SECRET_ACCESS_KEY="${{ secrets.AWS_SECRET_ACCESS_KEY }}"
            export AWS_REGION="${{ env.AWS_REGION }}"
            export ECR_REGISTRY="${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com"

            echo "Installing AWS CLI tools if needed..."
            which aws || (apk add --no-cache aws-cli 2>/dev/null || apt-get update && apt-get install -y awscli) || echo "AWS CLI not available, trying docker login with token"

            echo "Logging into ECR registry..."
            aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY" || \
            (echo "AWS CLI login failed, retrying with direct password..." && \
             ECR_PASSWORD=$(aws ecr get-login-password --region "$AWS_REGION") && \
             echo "$ECR_PASSWORD" | docker login --username AWS --password-stdin "$ECR_REGISTRY")

            echo "Removing old local cached images..."
            docker images -q "docita-api" | xargs -r docker rmi -f || true

            echo "Pulling new image from ECR..."
            docker pull "$IMAGE_URI"

            # 1. Start new container on temp port for verification
            docker rm -f docita-api-new || true
            docker run -d \
              --name docita-api-new \
              --restart unless-stopped \
              -p 3002:3001 \
              --env-file ~/docita/.env \
              "$IMAGE_URI"

            # 2. Verify health on temp port
            echo "Running health check on temp port 3002..."
            for i in {1..15}; do
              if docker exec docita-api-new curl -f -s http://localhost:3001/api/health/live >/dev/null 2>&1; then
                echo "Container is healthy!"
                HEALTHY=true
                break
              fi
              echo "Waiting... ($i/15)"
              sleep 2
            done

            if [ "$HEALTHY" != "true" ]; then
              echo "Health check failed! Keeping old container running."
              docker rm -f docita-api-new
              exit 1
            fi

            # 3. Health check passed - Swap containers
            echo "Health check passed. Swapping containers..."

            # Stop temp container
            docker rm -f docita-api-new

            # Stop old container (by name OR port)
            echo "Stopping old container..."
            docker stop docita-api || true
            docker rm docita-api || true

            # Find and stop any container using port 3001 (in case name mismatch)
            CONFLICT_ID=$(docker ps -q --filter "publish=3001")
            if [ ! -z "$CONFLICT_ID" ]; then
              echo "Found conflicting container $CONFLICT_ID on port 3001. Stopping..."
              docker stop $CONFLICT_ID || true
              docker rm $CONFLICT_ID || true
            fi

            # Start new container on production port
            docker run -d \
              --name docita-api \
              --restart unless-stopped \
              -p 3001:3001 \
              --env-file ~/docita/.env \
              "$IMAGE_URI"
            echo "Deployment successful."

            # Verify health check actually succeeded (with wait loop)
            echo "Verifying final deployment health..."
            FINAL_HEALTHY=false
            for i in {1..15}; do
              if docker exec docita-api curl -f -s http://localhost:3001/api/health/live >/dev/null 2>&1; then
                echo "Final container is healthy!"
                FINAL_HEALTHY=true
                break
              fi
              echo "Waiting for final startup... ($i/15)"
              sleep 2
            done

            if [ "$FINAL_HEALTHY" != "true" ]; then
              echo "ERROR: Container failed final health check. Capturing diagnostics..."
              docker ps -a || true
              docker logs --tail 500 docita-api || true
              exit 1
            fi
```

**Why use `aws-actions/amazon-ecr-login@v2`?**

-  Handles ECR login correctly without TTY requirements
-  Works seamlessly in GitHub Actions environments
-  No need for `aws ecr get-login` (deprecated command)
-  Automatically manages credentials
-  Better security practices

### Alternative: Direct SSH Deployment (Build on EC2)

If you prefer to build directly on the EC2 instance:

```yaml
name: Deploy API to Production (SSH Build)

on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/types/**"
  workflow_dispatch:

jobs:
  deploy-api:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: 22
          timeout: 30m
          script: |
            set -e

            echo " Starting deployment..."

            # Navigate to repo
            cd ~/docita-repo

            # Pull latest code
            echo " Pulling latest code..."
            git fetch origin main
            git reset --hard origin/main

            # Build Docker image
            echo " Building Docker image..."
            docker build -f apps/api/Dockerfile -t docita-api:latest .

            # Stop existing container
            echo " Stopping existing container..."
            docker stop docita-api || true
            docker rm docita-api || true

            # Run new container from docker app directory
            echo " Starting new container..."
            cd ~/docita
            docker run -d \
              --name docita-api \
              --restart unless-stopped \
              -p 3001:3001 \
              --health-cmd='curl -f http://localhost:3001/api/health/live || exit 1' \
              --health-interval=30s \
              --health-timeout=10s \
              --health-retries=3 \
              --env-file .env \
              docita-api:latest

            # Wait and verify
            sleep 10
            if docker ps | grep -q docita-api; then
              echo " Deployment successful"
            else
              echo " Deployment failed"
              docker logs docita-api
              exit 1
            fi
```

### Setup EC2 for Deployments

Prepare your EC2 instance for automated deployments:

```bash
# On EC2 instance, create deployment user (optional, more secure)
sudo adduser deploy
sudo usermod -aG docker deploy

# Or use existing ubuntu user
sudo usermod -aG docker ubuntu

# Create app directory
mkdir -p ~/docita
cd ~/docita

# Create .env file with secrets
cat > .env << EOF
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/docita?sslmode=require
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
EOF

chmod 600 .env

# If using direct SSH build, also clone repo
mkdir -p ~/docita-repo
cd ~/docita-repo
git clone https://github.com/your-org/docita.git .
```

### Required GitHub Secrets

| Secret                  | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | AWS IAM access key ID for ECR access                                     |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret access key for ECR access                                 |
| `AWS_ACCOUNT_ID`        | Your 12-digit AWS account ID (e.g., `123456789012`)                      |
| `DATABASE_URL`          | Neon connection string for production database (required for migrations) |
| `EC2_HOST`              | EC2 Elastic IP or domain name                                            |
| `EC2_USERNAME`          | SSH username (usually `ubuntu`)                                          |
| `EC2_SSH_KEY`           | Private SSH key for EC2 access                                           |
| `SLACK_WEBHOOK`         | (Optional) Slack webhook for notifications                               |

> **Note:** The ECR registry URL is constructed as `${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-west-1.amazonaws.com` in the workflow.

**Setup Instructions:**

**For AWS Credentials (ECR Access):**

1. Create IAM user with ECR permissions (use this production-ready policy):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowAuthorizationToken",
         "Effect": "Allow",
         "Action": ["ecr:GetAuthorizationToken"],
         "Resource": "*"
       },
       {
         "Sid": "AllowPushPullAndLayerOperations",
         "Effect": "Allow",
         "Action": [
           "ecr:GetDownloadUrlForLayer",
           "ecr:BatchGetImage",
           "ecr:BatchCheckLayerAvailability",
           "ecr:PutImage",
           "ecr:InitiateLayerUpload",
           "ecr:UploadLayerPart",
           "ecr:CompleteLayerUpload"
         ],
         "Resource": "arn:aws:ecr:us-west-1:<account-id>:repository/docita-api"
       },
       {
         "Sid": "AllowListing",
         "Effect": "Allow",
         "Action": ["ecr:DescribeRepositories", "ecr:ListImages"],
         "Resource": "*"
       }
     ]
   }
   ```

   > **Note:** Replace `<account-id>` with your 12-digit AWS account ID. Change `us-west-1` if using a different region.

2. Create access keys for this IAM user
3. Add to GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`: The access key ID
   - `AWS_SECRET_ACCESS_KEY`: The secret access key

**For AWS Account ID:**

```bash
# Get your AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $AWS_ACCOUNT_ID

# Add to GitHub Secrets as AWS_ACCOUNT_ID
# Example: 123456789012

# Verify ECR registry is accessible
aws ecr describe-repositories --repository-names docita-api --region us-west-1
```

**For DATABASE_URL (Neon Migrations):**

1. Get your Neon connection string:
   - Go to [Neon Console](https://console.neon.tech)
   - Select your project → Branches → Production
   - Copy the connection string (looks like: `postgresql://user:password@host/database`)

2. In GitHub repo → Settings → Secrets → New repository secret
   - Name: `DATABASE_URL`
   - Value: paste the full connection string
   - This is used by the migrate job in the deployment pipeline

**To generate EC2_SSH_KEY:**

1. Create key pair in AWS EC2 console or use existing
2. Get the private key content
3. In GitHub repo → Settings → Secrets → New repository secret
4. Name: `EC2_SSH_KEY`, Value: paste entire private key content
5. Make sure to include `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`

## 6. Troubleshooting Docker Architecture Issues

### "no matching manifest for linux/amd64" Error

This error occurs when pulling a Docker image on EC2 and the registry doesn't have a manifest for the AMD64 architecture:

```
latest: Pulling from docita-api
no matching manifest for linux/amd64 in the manifest list entries
```

**Root Causes:**

1. Image was built on macOS (ARM64) and pushed without multi-architecture support
2. CI/CD pipeline only builds for single architecture
3. Previous deployments didn't use Docker Buildx for multi-platform builds

**Automatic Fix (Going Forward):**

The GitHub Actions workflow now uses Docker Buildx to build for both architectures:

-  `linux/amd64` - for AWS EC2 instances
-  `linux/arm64` - for Apple Silicon and ARM systems

All new deployments will have manifests for both architectures, and Docker will automatically pull the correct one.

**Manual Fix (One-time on EC2):**

If you encounter this error on EC2, build the image natively on the instance:

```bash
# SSH into EC2
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Clone or update the repository
cd ~/docita-repo
git pull origin main

# Build Docker image natively (will be linux/amd64)
docker build -f apps/api/Dockerfile -t docita-api:latest .

# Navigate to deployment directory
cd ~/docita

# Stop existing container
docker stop docita-api || true
docker rm docita-api || true

# Run container
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --health-cmd='curl -f http://localhost:3001/api/health/live || exit 1' \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  --env-file .env \
  docita-api:latest

# Verify deployment
sleep 10
if docker ps | grep -q docita-api; then
  echo " Container is running"
  docker logs docita-api | tail -10
else
  echo " Container failed to start"
  docker logs docita-api
fi
```

**For Future Deployments:**

The workflow has been updated to build multi-architecture images. No additional action needed—just push to main and the workflow will handle building for both AMD64 and ARM64.

---

## 7. Troubleshooting ECR Push Errors

### "403 Forbidden" Error When Pushing to ECR

**Error Message:**

```
failed to push <account-id>.dkr.ecr.us-west-1.amazonaws.com/docita-api:...:
unexpected status from HEAD request to https://<account-id>.dkr.ecr.us-west-1.amazonaws.com/v2/docita-api/blobs/sha256:...:
403 Forbidden
```

**Common Causes:**

1. **ECR Repository Doesn't Exist**

   ```bash
   # Check if repository exists in correct region
   aws ecr describe-repositories --repository-names docita-api --region us-west-1

   # If not found, create it
   aws ecr create-repository --repository-name docita-api --region us-west-1
   ```

2. **Wrong AWS Region**
   - Workflow pushes to `us-west-1` but credentials configured for different region
   - Check `AWS_REGION` in `.github/workflows/deploy-api.yml` (should be `us-west-1`)
   - Ensure ECR repository is created in same region

3. **Insufficient IAM Permissions**

   ```json
   {
     "Effect": "Allow",
     "Action": [
       "ecr:GetDownloadUrlForLayer",
       "ecr:BatchGetImage",
       "ecr:BatchCheckLayerAvailability",
       "ecr:PutImage",
       "ecr:InitiateLayerUpload",
       "ecr:UploadLayerPart",
       "ecr:CompleteLayerUpload",
       "ecr:GetAuthorizationToken"
     ],
     "Resource": "arn:aws:ecr:us-west-1:<account-id>:repository/docita-api"
   }
   ```

4. **Expired or Invalid AWS Credentials**

   ```bash
   # Verify credentials
   aws sts get-caller-identity

   # Update GitHub secrets if credentials are expired
   # Go to: Settings → Secrets and variables → Actions
   # Update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   ```

**Resolution Steps:**

```bash
# 1. Verify AWS credentials work locally
aws sts get-caller-identity

# 2. Check ECR repository exists and is in correct region
aws ecr describe-repositories --region us-west-1

# 3. Create repository if needed
aws ecr create-repository --repository-name docita-api --region us-west-1

# 4. Test ECR login locally
aws ecr get-login-password --region us-west-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-1.amazonaws.com

# 5. If successful, verify GitHub secrets are set correctly:
#    - AWS_ACCESS_KEY_ID
#    - AWS_SECRET_ACCESS_KEY
#    - AWS_ACCOUNT_ID
#    - DATABASE_URL
#    - EC2_HOST
#    - EC2_USERNAME
#    - EC2_SSH_KEY

# 6. Re-run workflow
```

## 8. Important: ECR Repository Setup

Before deploying, ensure you have created the ECR repository in the correct AWS region:

```bash
# Create ECR repository in us-west-1
aws ecr create-repository \
  --repository-name docita-api \
  --region us-west-1

# Note: If you need a different region, update AWS_REGION in .github/workflows/deploy-api.yml
```

**Common Issues:**

- **403 Forbidden error**: Repository doesn't exist in the specified region or IAM permissions insufficient
- **Region mismatch**: Workflow uses `us-west-1`, but repository created in different region
- **404 Not Found**: ECR repository hasn't been created yet

## 9. Manual Deployment (If Automation Fails)

If GitHub Actions deployment fails or you need to deploy manually, SSH into EC2 and run:

```bash
# SSH into EC2
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Navigate to repo
cd ~/docita-repo

# Pull latest code
echo "Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# Build Docker image
echo "Building Docker image..."
docker build -f apps/api/Dockerfile -t docita-api:latest .

# Stop existing container
echo "Stopping existing container..."
docker stop docita-api || true
docker rm docita-api || true

# Navigate to app directory
cd ~/docita

# Run new container
echo "Starting new container..."
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --health-cmd='curl -f http://localhost:3001/api/health/live || exit 1' \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  --env-file .env \
  docita-api:latest

# Wait for container to start
echo "Waiting for container to start..."
sleep 10

# Check if container is running
if docker ps | grep -q docita-api; then
  echo "Container is running"
else
  echo "Container failed to start"
  docker logs docita-api
  exit 1
fi

# Verify health endpoint
if curl -f http://localhost:3001/api/health/live >/dev/null 2>&1; then
  echo "API health check passed"
else
  echo "Health check warning, checking logs..."
  docker logs docita-api | tail -20
fi

echo "Manual deployment completed successfully!"

# View logs
docker logs -f docita-api
```

### Troubleshooting Manual Deployments

**Container won't start:**

```bash
# Check logs
docker logs docita-api

# Check if port 3001 is already in use
sudo lsof -i :3001

# Check environment variables
cat ~/docita/.env
```

**Health check failing:**

```bash
# Test the health endpoint directly
curl http://localhost:3001/api/health/live

# Check container resource usage
docker stats docita-api

# Check API logs for errors
docker logs docita-api | tail -50
```

**Need to rebuild everything:**

```bash
# Remove old images
docker image prune -a --force

# Rebuild fresh
docker build -f apps/api/Dockerfile -t docita-api:latest .

# Restart container
docker stop docita-api || true
docker rm docita-api || true

cd ~/docita
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  docita-api:latest
```

**Revert to previous image:**

```bash
# Stop current container
docker stop docita-api

# Remove current container
docker rm docita-api

# Run with the previous image tag (if available)
cd ~/docita
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  docita-api:previous
```

## Troubleshooting: CORS and Localhost Errors

### Symptoms

```
Access to fetch at 'https://api.docita.work/...' from origin 'https://app.docita.work'
has been blocked by CORS policy
```

```
WebSocket connection to 'ws://localhost:3001/socket.io/...' failed
```

### Root Cause

The frontend apps are using `localhost:3001` instead of production URLs because `NEXT_PUBLIC_*` environment variables are **not set in Vercel**.

### Solution

#### 1. Set Vercel Environment Variables

In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

| Project        | Variable                 | Value                         |
| -------------- | ------------------------ | ----------------------------- |
| `apps/app`     | `NEXT_PUBLIC_API_URL`    | `https://api.docita.work/api` |
| `apps/app`     | `NEXT_PUBLIC_SOCKET_URL` | `https://api.docita.work`     |
| `apps/landing` | `NEXT_PUBLIC_API_URL`    | `https://api.docita.work/api` |
| `apps/landing` | `NEXT_PUBLIC_APP_URL`    | `https://app.docita.work`     |
| `apps/admin`   | `NEXT_PUBLIC_API_URL`    | `https://api.docita.work/api` |

#### 2. Redeploy Apps (Required!)

`NEXT_PUBLIC_*` variables are embedded at **build time**. After setting them:

1. Go to **Deployments** tab in each Vercel project
2. Click **"..."** → **"Redeploy"** → Uncheck "Use existing Build Cache" → **"Redeploy"**

#### 3. Verify

Open browser DevTools at `https://app.docita.work`:

- API calls should go to `https://api.docita.work/api/*`
- WebSocket should connect to `wss://api.docita.work/socket.io/*`

### Backend CORS Configuration

The API CORS is configured in `apps/api/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    "https://landing.docita.work",
    "https://app.docita.work",
    "https://admin.docita.work",
    "http://localhost:3003", // landing dev
    "http://localhost:3000", // app dev
    "http://localhost:3002", // admin dev
  ],
  credentials: true,
});
```

If you add a new domain, update this list and redeploy the API.

## 6. Alternative: AWS App Runner (Serverless Container)

> **Note**: This is a recommended alternative if you want to remove the operational overhead of managing EC2 and Nginx. It costs slightly more (~$15/mo) but includes automated scaling, load balancing, and zero-maintenance infrastructure.

### 1. One-time Setup

1.  **Push your image to ECR** (follow the ECR steps in section 3).
2.  **Create App Runner Service** in AWS Console:
    *   **Source**: Container Registry
    *   **Provider**: Amazon ECR
    *   **Image URI**: Select your `docita-api` image (Region: `us-west-1`)
    *   **Deployment settings**: Automatic or Manual (Manual is fine if using GitHub Actions)
    *   **Configuration**:
        *   **CPU**: 1 vCPU
        *   **Memory**: 2 GB
        *   **Environment variables**: Add `DATABASE_URL`, `JWT_SECRET`, etc.
        *   **Port**: 3001
3.  **Copy Service ARN**: It looks like `arn:aws:apprunner:us-west-1:1234567890:service/docita-api/xyz`.
4.  **Add Secret to GitHub**:
    *   Name: `APP_RUNNER_SERVICE_ARN`
    *   Value: Your Service ARN (e.g., `arn:aws:apprunner:...`)

### 2. Deployment Workflow

A dedicated workflow file exists at `.github/workflows/deploy-app-runner.yml`.

*   **Status**: Disabled (Manual Trigger Only)
*   **To Enable**:
    1.  Add `APP_RUNNER_SERVICE_ARN` to GitHub Secrets.
    2.  Go to "Actions" tab in GitHub -> "Build & Deploy to App Runner" -> "Run workflow".
    3.  (Optional) Uncomment the `push: branches: [main]` section in the YAML file to enable auto-deploy.
