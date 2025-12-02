# API Deployment Setup Guide

This guide walks you through setting up automated deployment for the Docita API to AWS EC2 using GitHub Actions.

## Prerequisites

- AWS Account with EC2 and ECR access
- IAM user with ECR permissions (push/pull images)
- GitHub repository
- Domain name with DNS management access
- SSH key pair for EC2

## Step 1: Set Up EC2 Instance

### 1.1 Launch EC2 Instance

1. Go to AWS EC2 Dashboard
2. Click "Launch Instance"
3. Configure:
   - **Name**: `docita-api-prod`
   - **AMI**: Ubuntu 22.04 LTS
   - **Instance Type**: t3.medium or larger
   - **Key Pair**: Create or select existing
   - **Network Settings**:
     - Allow SSH from your IP
     - Allow HTTP from anywhere
     - Allow HTTPS from anywhere
   - **Storage**: 30GB gp3

### 1.2 Allocate Elastic IP

1. Go to Elastic IPs in EC2
2. Click "Allocate Elastic IP address"
3. Select your instance and associate the IP
4. Note down the Elastic IP address
5. Update your DNS records to point to this IP

### 1.3 Connect to EC2

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-elastic-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

## Step 2: Configure EC2 for Docker

### 2.1 Install Docker

```bash
# Install Docker
sudo apt install -y docker.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
```

### 2.2 Create Application Directory

```bash
# Create app directory
mkdir -p ~/docita
cd ~/docita

# Create .env file with your secrets
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/docita?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://app.docita.work
EOF

# Secure the .env file
chmod 600 .env
```

### 2.3 Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Create API config
sudo nano /etc/nginx/sites-available/docita-api
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.docita.work;
    return 301 https://$server_name$request_uri;
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.4 Set Up SSL with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.docita.work

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

After Certbot runs, edit your nginx config to add proxy settings:

```bash
sudo nano /etc/nginx/sites-available/docita-api
```

Replace with complete configuration:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.docita.work;

    ssl_certificate /etc/letsencrypt/live/api.docita.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.docita.work/privkey.pem;

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

    location /socket.io {
        proxy_pass http://localhost:3001/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 3: Set Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following secrets:

### Required Secrets

| Name | Value | Notes |
|------|-------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM access key ID | For ECR access |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret access key | For ECR access |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID | e.g., `123456789012` |
| `EC2_HOST` | Your Elastic IP or domain | e.g., `12.34.56.78` or `api.your-domain.com` |
| `EC2_USERNAME` | `ubuntu` | Or your custom deploy user |
| `EC2_SSH_KEY` | Full private key content | Including `-----BEGIN RSA PRIVATE KEY-----` header |

### Optional Secrets

| Name | Value | Notes |
|------|-------|-------|
| `SLACK_WEBHOOK` | Slack webhook URL | For deployment notifications |

### How to Get EC2_SSH_KEY

If you created a key pair in AWS:

```bash
# Download the .pem file from AWS
# Then get the content:
cat your-key.pem

# Copy the entire output including the BEGIN/END lines
# Paste into GitHub secret
```

If you already have a key:

```bash
# Get your private key
cat ~/.ssh/id_rsa

# Copy the entire output (BEGIN to END)
# Paste into GitHub secret
```

## Step 4: Manual Test Deployment

Before using GitHub Actions, test manually on EC2:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-elastic-ip

# Navigate to app directory
cd ~/docita

# Pull a test image
docker pull ubuntu:latest

# Test docker commands work
docker images

# Test SSH connection from local machine back to confirm setup
```

## Step 5: Deploy Using GitHub Actions

### Option A: Deploy with AWS ECR (Recommended)

1. Push changes to the `main` branch that modify `apps/api/`
2. GitHub Actions automatically:
   - Builds Docker image
   - Pushes to AWS ECR
   - Deploys to EC2 via SSH
3. Monitor the workflow in Actions tab
4. Check logs for any issues

### Option B: Direct SSH Build

If you want to build directly on EC2 (useful for smaller changes):

1. Go to Actions tab
2. Select "Deploy API to Production (SSH Build)"
3. Click "Run workflow"
4. Wait for deployment to complete

## Step 6: Verify Deployment

```bash
# Check if container is running
docker ps | grep docita-api

# View logs
docker logs -f docita-api

# Test API health
curl https://api.your-domain.com/api/health

# Check Nginx is working
curl -I https://api.your-domain.com
```

## Troubleshooting

### Container won't start

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-elastic-ip

# Check logs
docker logs docita-api

# Check if port is already in use
sudo netstat -tlnp | grep 3001

# Try restarting
docker restart docita-api
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew if needed
sudo certbot renew --dry-run

# Check Nginx config
sudo nginx -t
```

### GitHub Actions Workflow Fails

Check the GitHub Actions logs:

1. Go to Actions tab
2. Click the failed workflow
3. Look for the step that failed
4. Common issues:
   - Missing secrets → Add in Settings → Secrets
   - SSH key format wrong → Use full key with headers
   - Docker image too large → Might exceed resource limits
   - EC2 not responding → Check security group rules

### API Not Accessible

```bash
# Check Nginx proxy
sudo tail -f /var/log/nginx/error.log

# Check if API container is healthy
docker inspect docita-api | grep -A 5 State

# Test direct connection to API
curl http://localhost:3001/api/health
```

## Monitoring

### View Logs

```bash
# Real-time logs
docker logs -f docita-api

# Last 100 lines
docker logs --tail 100 docita-api

# Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Check Disk Space

```bash
# View disk usage
df -h

# Clean up Docker (remove unused images/containers)
docker system prune -a
```

## Maintenance

### Update Docker Image

```bash
# On EC2, to pull new image:
cd ~/docita
docker pull your-username/docita-api:latest
docker stop docita-api
docker rm docita-api
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  your-username/docita-api:latest
```

### Update Environment Variables

```bash
# Edit .env file
nano ~/docita/.env

# Restart container to pick up changes
docker restart docita-api
```

### Backup

No database is running on this instance, so backup needs are minimal. Focus on:
- `.env` file (keep secure copy)
- GitHub Actions configuration
- Docker images (stored in AWS ECR)

## Security Best Practices

1. **SSH Keys**
   - Store private key securely
   - Rotate periodically
   - Never commit to git

2. **Environment Variables**
   - Keep `.env` file with strict permissions (600)
   - Rotate secrets periodically
   - Use strong JWT secrets

3. **Firewall**
   - Only open necessary ports
   - Restrict SSH to known IPs if possible
   - Monitor security group rules

4. **Updates**
   - Regularly update Ubuntu packages
   - Update Docker regularly
   - Keep dependencies current

5. **Monitoring**
   - Set up CloudWatch alerts
   - Monitor API health endpoint
   - Check logs regularly for errors
