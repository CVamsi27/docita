# Docita - Deployment Guide

**Healthcare Management System**  
Production Deployment Instructions

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Build & Deploy](#build--deploy)
5. [Environment Variables](#environment-variables)
6. [Production Considerations](#production-considerations)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.x or higher
- **pnpm**: v8.x or higher
- **PostgreSQL**: v14.x or higher
- **Operating System**: Linux (Ubuntu 20.04+ recommended) or macOS

### Required Services

- PostgreSQL database server
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

## Database Configuration

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

### 2. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE docita;
CREATE USER docita_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE docita TO docita_user;

# Exit psql
\q
```

### 3. Configure Database URL

Create `.env` file in the root directory:

```env
DATABASE_URL="postgresql://docita_user:your_secure_password@localhost:5432/docita"
```

### 4. Run Migrations

```bash
cd packages/db
pnpm prisma migrate deploy
```

### 5. Seed Database (Optional)

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

---

## Build & Deploy

### Development Build

```bash
# Build all packages
pnpm build

# Start development server
pnpm dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start API server
cd apps/api
pm2 start dist/main.js --name docita-api

# Start web server
cd apps/web
pm2 start npm --name docita-web -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Using Docker

#### Build Docker Images

```bash
# Build API image
docker build -t docita-api -f apps/api/Dockerfile .

# Build Web image
docker build -t docita-web -f apps/web/Dockerfile .
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: docita
      POSTGRES_USER: docita_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    image: docita-api
    environment:
      DATABASE_URL: postgresql://docita_user:your_secure_password@postgres:5432/docita
      JWT_SECRET: your_jwt_secret
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  web:
    image: docita-web
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001/api
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

Start services:

```bash
docker-compose up -d
```

---

## Environment Variables

### API (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/docita"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="7d"

# Server
PORT=3001
NODE_ENV="production"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="Docita <noreply@docita.com>"

# SMS (Optional - Twilio example)
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# File Upload
MAX_FILE_SIZE="10485760"  # 10MB in bytes
UPLOAD_DIR="./uploads"

# CORS
CORS_ORIGIN="https://docita.buildora.work"
```

### Web (.env.local)

```env
# API URL
NEXT_PUBLIC_API_URL="https://docita-api.buildora.work/api"

# App Configuration
NEXT_PUBLIC_APP_NAME="Docita"
NEXT_PUBLIC_APP_URL="https://docita.buildora.work"
```

---

## Production Considerations

### Security

#### 1. HTTPS/SSL

Use Let's Encrypt for free SSL certificates:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 2. Nginx Configuration

Create `/etc/nginx/sites-available/docita`:

```nginx
# API Server
server {
    listen 80;
    server_name docita-api.buildora.work;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name docita-api.buildora.work;

    ssl_certificate /etc/letsencrypt/live/docita-api.buildora.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docita-api.buildora.work/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Web Server
server {
    listen 80;
    server_name docita.buildora.work www.docita.buildora.work;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name docita.buildora.work www.docita.buildora.work;

    ssl_certificate /etc/letsencrypt/live/docita.buildora.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docita.buildora.work/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/docita /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### 4. Database Security

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Change to require password authentication
# local   all   all   md5
# host    all   all   127.0.0.1/32   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Performance Optimization

#### 1. Enable Gzip Compression

Add to Nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

#### 2. Database Connection Pooling

Already configured in Prisma. Adjust in `schema.prisma` if needed:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

#### 3. Caching

Consider adding Redis for session storage and caching:

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis to start on boot
sudo systemctl enable redis-server
```

---

## Monitoring & Logging

### Application Logs

#### PM2 Logs

```bash
# View logs
pm2 logs docita-api
pm2 logs docita-web

# Save logs to file
pm2 install pm2-logrotate
```

#### Custom Logging

Logs are stored in:
- API: `apps/api/logs/`
- Web: `apps/web/logs/`

### System Monitoring

#### Install Monitoring Tools

```bash
# Install htop for system monitoring
sudo apt install htop

# Install netdata for real-time monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

Access Netdata dashboard: http://your-server-ip:19999

### Database Monitoring

```bash
# Check database size
sudo -u postgres psql -d docita -c "SELECT pg_size_pretty(pg_database_size('docita'));"

# Check active connections
sudo -u postgres psql -d docita -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Backup & Recovery

### Database Backup

#### Automated Daily Backup

Create backup script `/usr/local/bin/backup-docita.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/docita"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="docita_backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
sudo -u postgres pg_dump docita > $BACKUP_DIR/$FILENAME

# Compress backup
gzip $BACKUP_DIR/$FILENAME

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME.gz"
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-docita.sh
```

#### Schedule with Cron

```bash
# Edit crontab
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-docita.sh >> /var/log/docita-backup.log 2>&1
```

### Database Restore

```bash
# Restore from backup
gunzip -c /var/backups/docita/docita_backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql docita
```

### File Backup

Backup uploaded documents:

```bash
# Sync to remote storage (e.g., AWS S3)
aws s3 sync /path/to/docita/uploads s3://your-bucket/docita-uploads/

# Or use rsync to another server
rsync -avz /path/to/docita/uploads/ user@backup-server:/backups/docita-uploads/
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U docita_user -d docita -h localhost
```

**Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Build Fails**
```bash
# Clear cache and rebuild
pnpm clean
rm -rf node_modules
pnpm install
pnpm build
```

**PM2 Not Starting**
```bash
# Check PM2 logs
pm2 logs

# Restart all processes
pm2 restart all

# Delete and restart
pm2 delete all
pm2 start ecosystem.config.js
```

---

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Run migrations
cd packages/db
pnpm prisma migrate deploy

# Rebuild
cd ../..
pnpm build

# Restart services
pm2 restart all
```

### Database Maintenance

```bash
# Vacuum database (reclaim storage)
sudo -u postgres psql -d docita -c "VACUUM ANALYZE;"

# Reindex database
sudo -u postgres psql -d docita -c "REINDEX DATABASE docita;"
```

---

## Support

For deployment support:
- **Email**: devops@docita.com
- **Documentation**: https://docs.docita.com
- **Issues**: https://github.com/CVamsi27/docita/issues

---

**Last Updated**: January 2024  
**Version**: 1.0
