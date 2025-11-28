# Docita - Deployment Guide

**Healthcare Management System**  
Production Deployment Instructions

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration (Neon)](#database-configuration-neon)
4. [RDS Migration Path](#rds-migration-path)
5. [Build & Deploy](#build--deploy)
6. [Environment Variables](#environment-variables)
7. [Production Considerations](#production-considerations)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.x or higher
- **pnpm**: v8.x or higher
- **Database**: Neon Serverless PostgreSQL (transitioning to AWS RDS)
- **Backend Hosting**: AWS EC2 (Ubuntu 22.04+ recommended)
- **Frontend Hosting**: Vercel

### Required Services

- **Neon** account (serverless PostgreSQL)
- **AWS** account (EC2 for backend)
- **Vercel** account (frontend hosting)
- SMTP server (for email notifications)
- SMS gateway (optional, for SMS reminders)
- Cloud storage (optional, for document storage)

---

## Environment Setup

### 1. Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should show v18.x.x
```

### 2. Install pnpm

```bash
npm install -g pnpm

# Verify installation
pnpm --version  # Should show v8.x.x
```

### 3. Clone Repository

```bash
git clone https://github.com/CVamsi27/docita.git
cd docita
```

### 4. Install Dependencies

```bash
pnpm install
```

---

## Database Configuration (Neon)

### Why Neon?

Neon provides serverless PostgreSQL with:

- **Instant setup**: No manual database installation
- **Auto-scaling**: Scales compute automatically
- **Branching**: Git-like database branches for development
- **Automatic backups**: Point-in-time recovery built-in
- **Cost-effective**: Pay only for what you use
- **Global availability**: Multiple regions available

### 1. Create Neon Account

Visit [neon.tech](https://neon.tech) and sign up for a free account.

### 2. Create Production Project

```bash
# Via Neon Dashboard:
1. Click "New Project"
2. Project name: docita-production
3. Region: us-east-1 (or closest to your EC2 region)
4. PostgreSQL version: 15 (recommended)
5. Click "Create Project"
```

### 3. Get Connection String

From the Neon dashboard:

1. Navigate to your project
2. Click "Connection Details"
3. Copy the connection string

Format:

```
postgresql://username:password@ep-random-string.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 4. Configure Environment

Create `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 5. Run Migrations

```bash
cd packages/db
pnpm prisma migrate deploy
```

### 6. Seed Database (Optional)

```bash
pnpm prisma db seed
```

This creates:

- Default clinic
- Sample users (doctor, receptionist)
- Sample patients
- Sample appointments

**Default Login Credentials:**

- Email: `doctor@docita.com`
- Password: `password123`

> ⚠️ **IMPORTANT**: Change these credentials immediately in production!

### 7. Neon Features for Development

#### Database Branching

Create branches for testing:

```bash
# Install Neon CLI
npm install -g neonctl

# Login
neonctl auth

# Create branch
neonctl branches create --project-id your-project-id --name staging

# Get branch connection string
neonctl connection-string staging

# Use for staging environment
export DATABASE_URL="branch-connection-string"
```

#### Connection Pooling

Neon provides built-in connection pooling:

```env
# Pooled connection (recommended for serverless)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# Direct connection (for migrations)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

---

## RDS Migration Path

When your application scales, migrate to AWS RDS for:

- Dedicated resources
- Custom performance tuning
- VPC isolation
- Direct control over backups

### Migration Steps

#### 1. Provision AWS RDS

```bash
# Via AWS Console:
1. Go to RDS Dashboard
2. Create Database
3. Engine: PostgreSQL 15
4. Template: Production
5. DB Instance: db.t3.medium (minimum)
6. Storage: 100GB gp3
7. VPC: Same as EC2
8. Public access: No (use VPC security groups)
9. Create database
```

#### 2. Export from Neon

```bash
# Install PostgreSQL client tools
sudo apt install postgresql-client

# Export database
pg_dump "postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require" > docita_export.sql

# Verify export
ls -lh docita_export.sql
```

#### 3. Import to RDS

```bash
# Import to RDS
psql "postgresql://admin:password@docita-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/docita" < docita_export.sql

# Verify import
psql "postgresql://admin:password@docita-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/docita" -c "\dt"
```

#### 4. Update Configuration

```bash
# Update .env on EC2
sudo nano ~/docita/.env

# Change DATABASE_URL to RDS endpoint
DATABASE_URL="postgresql://admin:password@docita-prod.xxxxx.us-east-1.rds.amazonaws.com:5432/docita"
```

#### 5. Test and Switch

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# Restart backend
docker restart docita-api

# Monitor logs
docker logs -f docita-api
```

#### 6. Cleanup

After successful migration:

- Keep Neon project for staging/development branches
- Or delete Neon project if no longer needed

---

## Build & Deploy

### Architecture Overview

```
┌─────────────────┐
│   Vercel        │
│  (Frontend)     │
│  - Landing      │
│  - App          │
│  - Admin        │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│   AWS EC2       │
│  (Backend API)  │
│  - NestJS       │
│  - Docker       │
│  - Port 3001    │
└────────┬────────┘
         │
         │ PostgreSQL
         │
┌────────▼────────┐
│   Neon DB       │
│  (PostgreSQL)   │
│  - Serverless   │
│  - Auto-scale   │
└─────────────────┘
```

### Frontend Deployment (Vercel)

Vercel provides automatic deployments from Git.

#### Initial Setup

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

2. **Configure Projects** (create 3 separate projects):

##### Landing Page

```
Project Name: docita-landing
Framework: Next.js
Root Directory: apps/landing
Build Command: cd ../.. && pnpm build --filter @docita/landing
Output Directory: .next
Install Command: pnpm install
```

Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://app.your-domain.com
```

##### Main App

```
Project Name: docita-app
Framework: Next.js
Root Directory: apps/app
Build Command: cd ../.. && pnpm build --filter @docita/app
Output Directory: .next
Install Command: pnpm install
```

Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

##### Admin Dashboard

```
Project Name: docita-admin
Framework: Next.js
Root Directory: apps/admin
Build Command: cd ../.. && pnpm build --filter @docita/admin
Output Directory: .next
Install Command: pnpm install
```

Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

#### Custom Domains

1. Go to Project Settings → Domains
2. Add your custom domains:
   - Landing: `www.your-domain.com`
   - App: `app.your-domain.com`
   - Admin: `admin.your-domain.com`

#### Automatic Deployments

Vercel automatically deploys:

- **Production**: On push to `main` branch
- **Preview**: On push to any branch (PR previews)

### Backend Deployment (AWS EC2)

#### Prerequisites

- AWS account
- Docker Hub account (or AWS ECR)
- Domain name for API (e.g., `api.your-domain.com`)

#### Step 1: Build Docker Image

```bash
# Clone repository locally
git clone https://github.com/CVamsi27/docita.git
cd docita

# Build image
docker build -f apps/api/Dockerfile -t docita-api:latest .

# Test locally
docker run -p 3001:3001 \
  -e DATABASE_URL="your-neon-connection-string" \
  -e JWT_SECRET="test-secret" \
  docita-api:latest
```

#### Step 2: Push to Registry

**Option A: Docker Hub**

```bash
# Login
docker login

# Tag
docker tag docita-api:latest your-username/docita-api:latest

# Push
docker push your-username/docita-api:latest
```

**Option B: AWS ECR**

```bash
# Create repository
aws ecr create-repository --repository-name docita-api --region us-east-1

# Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag docita-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/docita-api:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/docita-api:latest
```

#### Step 3: Launch EC2 Instance

1. **Go to EC2 Dashboard**
2. **Launch Instance**:
   - Name: `docita-api-prod`
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: `t3.medium` (2 vCPU, 4 GB RAM)
   - Key pair: Create new or use existing
   - Network settings:
     - VPC: Default (or your VPC)
     - Auto-assign public IP: Enable
   - Configure security group:
     - SSH (22) from My IP
     - HTTP (80) from Anywhere
     - HTTPS (443) from Anywhere
     - Custom TCP (3001) from Anywhere
   - Storage: 30 GB gp3
3. **Launch instance**

#### Step 4: Configure EC2

```bash
# Connect to EC2
ssh -i "your-key.pem" ubuntu@<ec2-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Reconnect to apply group changes
exit
ssh -i "your-key.pem" ubuntu@<ec2-public-ip>

# Verify Docker
docker --version
```

#### Step 5: Deploy Container

```bash
# Create app directory
mkdir -p ~/docita
cd ~/docita

# Create environment file
nano .env
```

Add environment variables:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.your-domain.com,https://admin.your-domain.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=Docita <noreply@your-domain.com>

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

```bash
# Pull image
docker pull your-username/docita-api:latest

# Run container
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  -v ~/docita/uploads:/app/uploads \
  your-username/docita-api:latest

# Check logs
docker logs -f docita-api

# Verify it's running
curl http://localhost:3001/api/health
```

#### Step 6: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/docita-api
```

Add:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    client_max_body_size 20M;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Save and enable:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx
```

#### Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (make sure DNS is pointing to EC2)
sudo certbot --nginx -d api.your-domain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Step 8: Run Database Migrations

```bash
# Run migrations in container
docker exec -it docita-api npx prisma migrate deploy

# Or from local machine
DATABASE_URL="your-neon-connection" pnpm prisma migrate deploy
```

#### Step 9: Verify Deployment

```bash
# Test API
curl https://api.your-domain.com/api/health

# Expected response:
# {"status":"ok","database":"connected"}

# Check logs
docker logs --tail 100 docita-api
```

---

## Environment Variables

### Backend API (.env on EC2)

```env
# Database (Neon)
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-must-be-at-least-32-characters-long"
JWT_EXPIRATION="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS (Vercel domains)
CORS_ORIGIN="https://app.your-domain.com,https://admin.your-domain.com,https://www.your-domain.com"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"
SMTP_FROM="Docita <noreply@your-domain.com>"

# SMS (Optional - Twilio)
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# File Upload
MAX_FILE_SIZE="10485760"  # 10MB in bytes
UPLOAD_DIR="/app/uploads"

# Monitoring (Optional)
SENTRY_DSN="your-sentry-dsn"
```

### Frontend Apps (.env.local on Vercel)

#### Landing Page

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://api.your-domain.com/api"
NEXT_PUBLIC_APP_URL="https://app.your-domain.com"

# App Information
NEXT_PUBLIC_APP_NAME="Docita"
```

#### Main App

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://api.your-domain.com/api"

# App Information
NEXT_PUBLIC_APP_NAME="Docita"
NEXT_PUBLIC_APP_URL="https://app.your-domain.com"

# Stripe (if using)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxx"
```

#### Admin Dashboard

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://api.your-domain.com/api"

# App Information
NEXT_PUBLIC_APP_NAME="Docita Admin"
```

---

## Production Considerations

### Security

#### 1. HTTPS/SSL

SSL is configured via Let's Encrypt (done in Step 7 above).

Verify SSL configuration:

```bash
# Test SSL
curl -I https://api.your-domain.com/api/health

# Should return 200 OK with secure connection
```

#### 2. Firewall Configuration (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (from your IP only - replace X.X.X.X)
sudo ufw allow from X.X.X.X to any port 22

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to application port
sudo ufw deny 3001/tcp

# Check status
sudo ufw status
```

#### 3. AWS Security Groups

Configure EC2 Security Group:

```
Inbound Rules:
- SSH (22): Your IP only
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0

Outbound Rules:
- All traffic: 0.0.0.0/0 (for Neon connection)
```

#### 4. Database Security (Neon)

Neon security features:

- **SSL required**: All connections use SSL
- **IP allowlist**: Configure in Neon dashboard
- **Role-based access**: Create read-only users for analytics

```bash
# Create read-only user (run in Neon SQL editor)
CREATE ROLE analytics WITH LOGIN PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE neondb TO analytics;
GRANT USAGE ON SCHEMA public TO analytics;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics;
```

#### 5. Environment Variable Security

```bash
# Secure .env file on EC2
chmod 600 ~/docita/.env

# Never commit .env to Git
echo ".env" >> .gitignore

# Use AWS Secrets Manager (optional, for enhanced security)
aws secretsmanager create-secret \
  --name docita/production/database-url \
  --secret-string "your-neon-connection-string"
```

#### 6. Application Security

```bash
# Enable rate limiting in NestJS (already configured)
# Update apps/api/src/main.ts if needed

# Install helmet for security headers
cd apps/api
pnpm add helmet
```

Add to `main.ts`:

```typescript
import helmet from "helmet";

app.use(helmet());
```

### Performance Optimization

#### 1. Enable Gzip Compression (Nginx)

Edit `/etc/nginx/nginx.conf`:

```nginx
http {
    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json application/javascript;
}
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

#### 2. Database Connection Pooling (Neon)

Neon provides built-in connection pooling. Use pooled connections:

```env
# In .env - use pgbouncer parameter
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=10"
```

Adjust Prisma connection pool:

```prisma
// packages/db/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 5  // Lower for Neon
}
```

#### 3. Caching with Redis (Optional)

For session storage and caching:

```bash
# On EC2, install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping  # Should return PONG
```

Update API to use Redis:

```typescript
// apps/api/src/app.module.ts
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: "localhost",
      port: 6379,
      ttl: 600, // 10 minutes
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

#### 4. EC2 Instance Optimization

```bash
# Monitor resource usage
htop

# Check Docker stats
docker stats docita-api

# If needed, upgrade instance type:
# t3.medium -> t3.large for more resources
```

#### 5. CDN for Static Assets (Vercel)

Vercel automatically provides:

- Global CDN for static assets
- Automatic image optimization
- Edge caching

No additional configuration needed!

---

## Monitoring & Logging

### Backend Monitoring (EC2)

#### Docker Logs

```bash
# View real-time logs
docker logs -f docita-api

# View last 100 lines
docker logs --tail 100 docita-api

# View logs since timestamp
docker logs --since 2024-01-01T00:00:00 docita-api

# Save logs to file
docker logs docita-api > ~/docita/logs/api-$(date +%Y%m%d).log
```

#### System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop

# Monitor Docker container resources
docker stats docita-api

# Check disk usage
df -h
du -sh ~/docita/*
```

#### CloudWatch Integration (Optional)

Install CloudWatch agent:

```bash
# Download CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure (follow prompts)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
```

### Frontend Monitoring (Vercel)

Vercel provides built-in monitoring:

1. **Analytics**: View in Vercel dashboard
   - Page views
   - Unique visitors
   - Top pages
   - Real User Monitoring (RUM)

2. **Logs**: View deployment and function logs
   - Go to Project → Deployments → View Function Logs

3. **Performance**: Core Web Vitals
   - Automatically tracked
   - View in Vercel Analytics

### Database Monitoring (Neon)

Neon dashboard provides:

1. **Metrics**:
   - Database size
   - Active connections
   - Query performance
   - Storage usage

2. **Query Insights**:
   - Slow queries
   - Most frequent queries
   - Connection pool usage

3. **Alerts**: Configure in Neon dashboard
   - Storage threshold alerts
   - Connection limit alerts

### Application Performance Monitoring (APM)

#### Option 1: Sentry (Recommended)

```bash
# Install Sentry SDK
cd apps/api
pnpm add @sentry/node @sentry/tracing
```

Configure in `main.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Option 2: New Relic

```bash
# Install New Relic agent
pnpm add newrelic

# Configure newrelic.js
```

### Health Checks

Create health check endpoint (should already exist):

```bash
# Test health endpoint
curl https://api.your-domain.com/api/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "uptime": 123456
}
```

Setup monitoring with UptimeRobot or similar:

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://api.your-domain.com/api/health`
   - Interval: 5 minutes
3. Configure alerts (email, SMS, Slack)

---

## Backup & Recovery

### Database Backup (Neon)

#### Neon Built-in Backups

Neon automatically provides:

- **Continuous backup**: Every change is backed up
- **Point-in-time recovery**: Restore to any point in the last 7 days (Free tier) or 30 days (Pro tier)
- **No manual backup needed** for disaster recovery

#### Manual Database Export (for migration/archival)

```bash
# Export database
pg_dump "postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  > docita_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip docita_backup_*.sql

# Upload to S3 (optional)
aws s3 cp docita_backup_*.sql.gz s3://your-backup-bucket/docita/
```

#### Automated Backup Script

Create backup script on EC2:

```bash
# Create backup directory
mkdir -p ~/docita/backups

# Create backup script
nano ~/docita/backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/docita/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="docita_backup_$DATE.sql"

# Load environment
source $HOME/docita/.env

# Create backup
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$FILENAME"

# Compress
gzip "$BACKUP_DIR/$FILENAME"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/$FILENAME.gz" s3://your-backup-bucket/docita/

# Delete local backups older than 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME.gz"
```

Make executable and schedule:

```bash
# Make executable
chmod +x ~/docita/backup.sh

# Test backup
~/docita/backup.sh

# Schedule with cron (daily at 2 AM)
crontab -e

# Add line:
0 2 * * * /home/ubuntu/docita/backup.sh >> /home/ubuntu/docita/backup.log 2>&1
```

### Database Restore

#### From Neon Point-in-time Recovery

1. Go to Neon dashboard
2. Select project
3. Click "Restore" tab
4. Choose timestamp
5. Create new branch or restore to main

#### From Manual Backup

```bash
# Download from S3 (if stored there)
aws s3 cp s3://your-backup-bucket/docita/docita_backup_YYYYMMDD_HHMMSS.sql.gz .

# Decompress
gunzip docita_backup_YYYYMMDD_HHMMSS.sql.gz

# Restore
psql "$DATABASE_URL" < docita_backup_YYYYMMDD_HHMMSS.sql
```

### Application Files Backup (EC2)

#### Uploaded Documents

```bash
# Sync uploads to S3
aws s3 sync ~/docita/uploads s3://your-bucket/docita-uploads/ \
  --delete \
  --exclude "temp/*"

# Or use rsync to another server
rsync -avz ~/docita/uploads/ backup-server:/backups/docita/uploads/
```

#### Automated Upload Backup

Create backup script:

```bash
nano ~/docita/backup-uploads.sh
```

Add:

```bash
#!/bin/bash
aws s3 sync ~/docita/uploads s3://your-bucket/docita-uploads/ \
  --delete \
  --exclude "temp/*"

echo "Upload backup completed: $(date)"
```

Schedule:

```bash
chmod +x ~/docita/backup-uploads.sh

# Run every 6 hours
crontab -e

# Add:
0 */6 * * * /home/ubuntu/docita/backup-uploads.sh >> /home/ubuntu/docita/upload-backup.log 2>&1
```

### Disaster Recovery Plan

#### Database Recovery

1. **Neon Issue**:
   - Use Neon's point-in-time recovery
   - Or restore from manual backup to new Neon project
   - Update DATABASE_URL in EC2

2. **Data Corruption**:
   - Restore from latest manual backup
   - Run migrations if needed
   - Verify data integrity

#### Backend Recovery (EC2)

1. **Container Issue**:

   ```bash
   docker stop docita-api
   docker rm docita-api
   docker pull your-username/docita-api:latest
   docker run -d --name docita-api --restart unless-stopped \
     -p 3001:3001 --env-file ~/docita/.env \
     your-username/docita-api:latest
   ```

2. **EC2 Instance Failure**:
   - Launch new EC2 instance (same size/config)
   - Install Docker
   - Restore .env file from backup
   - Pull and run container
   - Update DNS to new EC2 IP

3. **Complete System Failure**:
   - Restore database from backup
   - Deploy fresh EC2 instance
   - Restore uploaded files from S3
   - Update all environment variables
   - Redeploy frontend on Vercel (automatic from Git)

#### Frontend Recovery (Vercel)

Vercel provides automatic:

- Git-based deployments (no manual recovery needed)
- Instant rollback to previous deployments
- Global CDN (high availability)

To rollback:

1. Go to Vercel dashboard
2. Select project
3. Go to "Deployments"
4. Find previous working deployment
5. Click "Promote to Production"

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

**Symptoms**: API logs show "Can't reach database server"

**Solutions**:

```bash
# 1. Check Neon connection string
echo $DATABASE_URL

# 2. Test connection from EC2
psql "$DATABASE_URL" -c "SELECT version();"

# 3. Verify SSL is enabled (sslmode=require)
# Make sure DATABASE_URL includes: ?sslmode=require

# 4. Check Neon dashboard for database status
# Visit neon.tech dashboard

# 5. Verify EC2 has outbound internet access
curl -I https://neon.tech
```

#### Container Won't Start

**Symptoms**: Docker container exits immediately

**Solutions**:

```bash
# 1. Check logs
docker logs docita-api

# 2. Verify environment variables
docker exec docita-api env | grep DATABASE_URL

# 3. Check if .env file exists
cat ~/docita/.env

# 4. Restart container with verbose logging
docker stop docita-api
docker rm docita-api
docker run -d --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file ~/docita/.env \
  your-username/docita-api:latest

# 5. Run migrations
docker exec -it docita-api npx prisma migrate deploy
```

#### Port Already in Use

**Symptoms**: "Port 3001 is already in use"

**Solutions**:

```bash
# Find process using port
sudo lsof -i :3001

# Kill existing container
docker stop docita-api
docker rm docita-api

# Or kill the process
kill -9 <PID>
```

#### Nginx 502 Bad Gateway

**Symptoms**: API returns 502 error

**Solutions**:

```bash
# 1. Check if container is running
docker ps | grep docita-api

# 2. Check container logs
docker logs --tail 50 docita-api

# 3. Test direct connection
curl http://localhost:3001/api/health

# 4. Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# 5. Restart services
docker restart docita-api
sudo systemctl restart nginx
```

#### SSL Certificate Issues

**Symptoms**: SSL certificate errors or warnings

**Solutions**:

```bash
# 1. Check certificate expiry
sudo certbot certificates

# 2. Renew certificates
sudo certbot renew

# 3. Force renewal (if near expiry)
sudo certbot renew --force-renewal

# 4. Test nginx config
sudo nginx -t

# 5. Restart nginx
sudo systemctl restart nginx
```

#### Build Fails on Vercel

**Symptoms**: Vercel deployment fails during build

**Solutions**:

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set
3. **Check build command**:
   ```bash
   cd ../.. && pnpm build --filter @docita/app
   ```
4. **Clear build cache** in Vercel project settings
5. **Test build locally**:
   ```bash
   cd apps/app
   pnpm build
   ```

#### High Memory Usage (EC2)

**Symptoms**: EC2 instance running slow

**Solutions**:

```bash
# 1. Check memory usage
free -h
docker stats

# 2. Check for memory leaks
docker logs docita-api | grep "Out of memory"

# 3. Restart container
docker restart docita-api

# 4. Upgrade instance type
# In AWS console: Stop instance -> Change type -> Start

# 5. Add swap space (temporary fix)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Slow Database Queries

**Symptoms**: API responses are slow

**Solutions**:

1. **Check Neon dashboard** for slow queries
2. **Add indexes**:
   ```sql
   -- Run in Neon SQL editor
   CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, date);
   CREATE INDEX idx_patients_email ON patients(email);
   ```
3. **Use connection pooling**:
   ```env
   DATABASE_URL="...?pgbouncer=true"
   ```
4. **Optimize Prisma queries** (add includes strategically)

#### Uploads Not Working

**Symptoms**: File uploads fail

**Solutions**:

```bash
# 1. Check upload directory exists
docker exec docita-api ls -la /app/uploads

# 2. Check volume mount
docker inspect docita-api | grep Mounts -A 10

# 3. Create volume if missing
docker stop docita-api
docker rm docita-api
docker run -d --name docita-api \
  -v ~/docita/uploads:/app/uploads \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file ~/docita/.env \
  your-username/docita-api:latest

# 4. Check disk space
df -h
```

---

## Maintenance

### Regular Updates

#### Update Application

```bash
# On local machine
git pull origin main
pnpm install
pnpm build

# Build new Docker image
docker build -f apps/api/Dockerfile -t your-username/docita-api:latest .

# Push to registry
docker push your-username/docita-api:latest

# On EC2
ssh ubuntu@your-ec2-ip
cd ~/docita

# Pull new image
docker pull your-username/docita-api:latest

# Stop old container
docker stop docita-api
docker rm docita-api

# Run migrations (if any)
docker run --rm --env-file .env your-username/docita-api:latest npx prisma migrate deploy

# Start new container
docker run -d --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  -v ~/docita/uploads:/app/uploads \
  your-username/docita-api:latest

# Verify
docker logs -f docita-api
curl http://localhost:3001/api/health
```

#### Update Dependencies

```bash
# Update pnpm
npm install -g pnpm@latest

# Update dependencies
pnpm update --recursive

# Check for outdated packages
pnpm outdated

# Update specific package
pnpm update @nestjs/core --recursive
```

#### Database Maintenance (Neon)

Neon handles maintenance automatically:

- No manual vacuuming needed
- Automatic statistics updates
- Auto-scaling storage

For manual operations:

```bash
# Analyze database (run in Neon SQL editor)
ANALYZE;

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### EC2 Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up Docker
docker system prune -a --volumes -f

# Check disk space
df -h

# Clean old logs
find ~/docita/logs -name "*.log" -mtime +30 -delete

# Update SSL certificates (automatic, but can force)
sudo certbot renew

# Reboot if kernel updated
sudo reboot
```

#### Frontend Updates (Vercel)

Vercel automatically deploys on Git push:

1. **Commit changes** to Git
2. **Push to main** branch
3. **Vercel deploys automatically**
4. **Monitor deployment** in Vercel dashboard

To rollback:

1. Go to Vercel dashboard
2. Select deployment to rollback to
3. Click "Promote to Production"

### Security Updates

```bash
# Check for security vulnerabilities
pnpm audit

# Fix automatically (if possible)
pnpm audit --fix

# For Docker images
docker scan your-username/docita-api:latest

# Update base image in Dockerfile
# Change FROM node:18-alpine to latest LTS
```

### Performance Monitoring

```bash
# Monitor EC2 performance
htop

# Monitor Docker stats
docker stats

# Check API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.your-domain.com/api/health

# Create curl-format.txt:
cat > curl-format.txt << EOF
    time_namelookup:  %{time_namelookup}
       time_connect:  %{time_connect}
    time_appconnect:  %{time_appconnect}
   time_pretransfer:  %{time_pretransfer}
      time_redirect:  %{time_redirect}
 time_starttransfer:  %{time_starttransfer}
                    ----------
         time_total:  %{time_total}
EOF

# Check Neon metrics
# Visit Neon dashboard for query performance
```

---

## Scaling Strategy

### Current Setup Limits

- **EC2 t3.medium**: ~50-100 concurrent users
- **Neon Free/Pro**: Up to 5 connections (Free) / 50 (Pro)
- **Vercel**: Handles millions of requests (auto-scales)

### Scaling Path

#### Phase 1: Vertical Scaling (Current)

- Upgrade EC2: t3.medium → t3.large → t3.xlarge
- Upgrade Neon: Free → Pro → Business

#### Phase 2: Horizontal Scaling

1. **Load Balancer**: Add AWS ALB
2. **Multiple EC2 Instances**: 2-3 instances behind ALB
3. **Redis**: Session storage across instances
4. **RDS**: Migrate from Neon for dedicated resources

#### Phase 3: Microservices (Future)

- Split API into services
- Use AWS ECS/EKS
- Separate database per service
- Event-driven architecture

---

## Cost Optimization

### Current Estimated Costs (Monthly)

- **Neon Free**: $0 (1 GB storage, 0.25 compute units)
- **EC2 t3.medium**: ~$30/month (on-demand)
- **Vercel Free/Pro**: $0-$20/month
- **Total**: ~$30-50/month

### Optimization Tips

1. **Use EC2 Reserved Instances** (1-year): Save 30-40%
2. **Stop EC2 during low usage** (if applicable)
3. **Neon Pro with usage-based**: Only pay for actual usage
4. **Optimize Docker images**: Smaller = faster deploys
5. **CDN caching**: Reduce Vercel bandwidth costs

---

## Support

For deployment support:

- **Documentation**: https://github.com/CVamsi27/docita
- **Issues**: https://github.com/CVamsi27/docita/issues
- **Email**: devops@docita.com

### Service Provider Support

- **Neon**: https://neon.tech/docs
- **AWS**: https://aws.amazon.com/support
- **Vercel**: https://vercel.com/support

---

## Checklist

### Pre-Deployment

- [ ] Neon database created
- [ ] EC2 instance launched and configured
- [ ] Docker installed on EC2
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Vercel projects connected to Git

### Post-Deployment

- [ ] API health check passes
- [ ] Frontend loads correctly
- [ ] Database connection verified
- [ ] SSL working (HTTPS)
- [ ] Monitoring setup (logs, metrics)
- [ ] Backups scheduled
- [ ] DNS configured
- [ ] Test user authentication
- [ ] Test file uploads
- [ ] Security group configured

### Production Readiness

- [ ] Default passwords changed
- [ ] Firewall configured
- [ ] Error monitoring (Sentry)
- [ ] Uptime monitoring
- [ ] Backup verification
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team access configured

---

**Last Updated**: November 2024  
**Version**: 2.0  
**Deployment Strategy**: Neon DB + AWS EC2 + Vercel
