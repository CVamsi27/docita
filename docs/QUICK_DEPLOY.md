# Quick Deployment Guide

**Docita Healthcare Management System**  
Fast-track production deployment

---

## Architecture

```
Frontend (Vercel) → Backend (EC2) → Database (Neon)
```

---

## Prerequisites

- [ ] Neon account (neon.tech)
- [ ] AWS account (EC2 access)
- [ ] Vercel account
- [ ] Docker Hub account
- [ ] Domain name

---

## Step 1: Database Setup (5 minutes)

1. **Create Neon project**:
   - Go to [neon.tech](https://neon.tech)
   - Click "New Project"
   - Name: `docita-production`
   - Region: `us-east-1` (or nearest)

2. **Copy connection string**:

   ```
   postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

3. **Run migrations**:
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   cd packages/db
   pnpm prisma migrate deploy
   pnpm prisma db seed  # Optional: creates sample data
   ```

---

## Step 2: Backend Deployment (20 minutes)

### Build & Push Docker Image

```bash
# Build
docker build -f apps/api/Dockerfile -t your-username/docita-api:latest .

# Login to Docker Hub
docker login

# Push
docker push your-username/docita-api:latest
```

### Launch EC2 Instance

**AWS Console**:

- AMI: Ubuntu 22.04 LTS
- Instance: t3.medium
- Storage: 30 GB
- Security Group: Allow 22, 80, 443

### Configure EC2

```bash
# SSH into EC2
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu
newgrp docker

# Create app directory
mkdir -p ~/docita && cd ~/docita

# Create environment file
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.your-domain.com,https://admin.your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=Docita <noreply@your-domain.com>
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads
EOF

# Pull and run
docker pull your-username/docita-api:latest
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  -v ~/docita/uploads:/app/uploads \
  your-username/docita-api:latest

# Verify
docker logs -f docita-api
curl http://localhost:3001/api/health
```

### Setup Nginx + SSL

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create config
sudo nano /etc/nginx/sites-available/docita-api
```

**Nginx config**:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

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
    }
}
```

```bash
# Enable and get SSL
sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d api.your-domain.com
```

---

## Step 3: Frontend Deployment (10 minutes)

### Setup Vercel Projects

Create 3 projects on [vercel.com](https://vercel.com):

#### 1. Landing Page

- **Import**: GitHub repo
- **Root Directory**: `apps/landing`
- **Build Command**: `cd ../.. && pnpm build --filter @docita/landing`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://api.your-domain.com
  NEXT_PUBLIC_APP_URL=https://app.your-domain.com
  ```

#### 2. Main App

- **Root Directory**: `apps/app`
- **Build Command**: `cd ../.. && pnpm build --filter @docita/app`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://api.your-domain.com
  ```

#### 3. Admin Dashboard

- **Root Directory**: `apps/admin`
- **Build Command**: `cd ../.. && pnpm build --filter @docita/admin`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://api.your-domain.com
  ```

### Add Custom Domains

In each Vercel project:

- Landing: `www.your-domain.com`
- App: `app.your-domain.com`
- Admin: `admin.your-domain.com`

---

## Step 4: Verification

### Test API

```bash
curl https://api.your-domain.com/api/health
```

Expected:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### Test Frontend

- Landing: https://www.your-domain.com
- App: https://app.your-domain.com
- Admin: https://admin.your-domain.com

### Test Login

- Email: `doctor@docita.com`
- Password: `password123`

> ⚠️ **Change default credentials immediately!**

---

## Step 5: Post-Deployment

### Setup Monitoring

```bash
# On EC2 - Setup log rotation
docker logs docita-api > ~/docita/logs/api-$(date +%Y%m%d).log

# Setup UptimeRobot
# Add monitor for: https://api.your-domain.com/api/health
```

### Setup Backups

```bash
# Create backup script
cat > ~/docita/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/docita/backups"
DATE=$(date +%Y%m%d_%H%M%S)
source $HOME/docita/.env
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/docita_$DATE.sql.gz"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x ~/docita/backup.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /home/ubuntu/docita/backup.sh
```

### Configure Firewall

```bash
sudo ufw enable
sudo ufw allow from YOUR_IP to any port 22
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3001/tcp
```

---

## Troubleshooting

### API not responding

```bash
docker logs docita-api
docker restart docita-api
```

### Database connection error

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"
```

### Frontend build fails

- Check environment variables in Vercel
- Clear build cache in Vercel settings
- Test build locally: `pnpm build --filter @docita/app`

### SSL certificate error

```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

---

## Quick Commands

### EC2 Management

```bash
# View logs
docker logs -f docita-api

# Restart API
docker restart docita-api

# Update API
docker pull your-username/docita-api:latest
docker stop docita-api && docker rm docita-api
docker run -d --name docita-api --restart unless-stopped \
  -p 3001:3001 --env-file ~/docita/.env \
  your-username/docita-api:latest

# Check health
curl http://localhost:3001/api/health
```

### Database Management

```bash
# Connect to database
psql "$DATABASE_URL"

# Run migrations
docker exec docita-api npx prisma migrate deploy

# Backup database
pg_dump "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Vercel Management

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy manually
vercel --prod

# View logs
vercel logs
```

---

## Cost Breakdown

| Service       | Plan      | Cost/Month  |
| ------------- | --------- | ----------- |
| Neon          | Free/Pro  | $0-19       |
| EC2 t3.medium | On-demand | ~$30        |
| Vercel        | Free/Pro  | $0-20       |
| **Total**     |           | **~$30-70** |

### Cost Optimization

- Use EC2 Reserved Instance (save 30%)
- Neon Pro with usage-based pricing
- Vercel Free tier (for small apps)

---

## Support

- **Docs**: [Full Deployment Guide](DEPLOYMENT_GUIDE.md)
- **Issues**: https://github.com/CVamsi27/docita/issues
- **Neon Docs**: https://neon.tech/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Deployment Time**: ~45 minutes  
**Monthly Cost**: ~$30-70  
**Scales to**: 100+ concurrent users

---

**Version**: 2.0  
**Last Updated**: November 2024
