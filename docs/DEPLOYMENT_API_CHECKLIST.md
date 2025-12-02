# API Deployment Checklist

## Pre-Deployment Checklist

### Preparation
- [ ] Have AWS account with ECR and EC2 access
- [ ] Create IAM user with ECR permissions
- [ ] Have domain name ready
- [ ] Have SSH key pair ready

### AWS ECR Setup
- [ ] Create ECR repository: `aws ecr create-repository --repository-name docita-api --region ap-south-1`
- [ ] Note your AWS Account ID: `aws sts get-caller-identity --query Account --output text`

### AWS Setup
- [ ] Launch EC2 instance (Ubuntu 22.04, t3.medium)
- [ ] Allocate Elastic IP
- [ ] Associate Elastic IP with instance
- [ ] Update security group:
  - [ ] Port 22 (SSH) - from your IP
  - [ ] Port 80 (HTTP) - from anywhere
  - [ ] Port 443 (HTTPS) - from anywhere
- [ ] Get EC2 public IP or domain
- [ ] Update DNS records to point to Elastic IP

### EC2 Initial Setup
- [ ] SSH into instance: `ssh -i key.pem ubuntu@ip`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Docker: `sudo apt install -y docker.io`
- [ ] Start Docker: `sudo systemctl start docker && sudo systemctl enable docker`
- [ ] Add user to docker group: `sudo usermod -aG docker ubuntu`
- [ ] Install Nginx: `sudo apt install -y nginx`
- [ ] Install Certbot: `sudo apt install -y certbot python3-certbot-nginx`

### EC2 Application Setup
- [ ] Create app directory: `mkdir -p ~/docita`
- [ ] Create .env file with secrets:
  - [ ] DATABASE_URL (from Neon)
  - [ ] JWT_SECRET (generate strong secret)
  - [ ] JWT_EXPIRATION
  - [ ] PORT (3001)
  - [ ] NODE_ENV (production)
  - [ ] CORS_ORIGIN (your frontend URL)
- [ ] Secure .env: `chmod 600 .env`

### Nginx & SSL Setup
- [ ] Remove default Nginx config: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Create docita-api config: `sudo nano /etc/nginx/sites-available/docita-api`
- [ ] Add HTTP redirect config
- [ ] Enable Nginx config: `sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/`
- [ ] Test Nginx: `sudo nginx -t`
- [ ] Start Nginx: `sudo systemctl start nginx && sudo systemctl enable nginx`
- [ ] Get SSL cert: `sudo certbot --nginx -d api.docita.work`
- [ ] Certbot auto-renewal: `sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer`

### GitHub Secrets Setup
- [ ] Go to GitHub repo → Settings → Secrets and variables → Actions
- [ ] Add secret: `AWS_ACCESS_KEY_ID` = your IAM access key ID
- [ ] Add secret: `AWS_SECRET_ACCESS_KEY` = your IAM secret access key
- [ ] Add secret: `AWS_ACCOUNT_ID` = your 12-digit AWS account ID
- [ ] Add secret: `EC2_HOST` = your Elastic IP or domain
- [ ] Add secret: `EC2_USERNAME` = ubuntu
- [ ] Add secret: `EC2_SSH_KEY` = full private key content (with BEGIN/END headers)
- [ ] (Optional) Add secret: `SLACK_WEBHOOK` = your Slack webhook URL

### Verification
- [ ] Test SSH connection: `ssh -i key.pem ubuntu@ip "docker --version"`
- [ ] Test Docker: `ssh -i key.pem ubuntu@ip "docker ps"`
- [ ] Test Nginx: `ssh -i key.pem ubuntu@ip "sudo systemctl status nginx"`
- [ ] Test SSL: `curl -I https://api.docita.work` (should redirect)
- [ ] Verify workflows exist: Check `.github/workflows/deploy-api.yml` exists

## Deployment Checklist

### Using AWS ECR Method (Recommended)

#### Before First Deployment
- [ ] Ensure all GitHub Secrets are set
- [ ] Verify ECR repository exists
- [ ] Test EC2 SSH access works
- [ ] Nginx is running and configured

#### Deploy
- [ ] Make change to `apps/api/` or `packages/types/`
- [ ] Commit: `git commit -m "..."`
- [ ] Push to main: `git push origin main`
- [ ] Go to GitHub repo → Actions tab
- [ ] Monitor "Deploy API to Production" workflow
- [ ] Wait for all steps to complete (5-10 minutes)

#### Verify Deployment
- [ ] Workflow shows green checkmark ✅
- [ ] Check logs for "✨ Deployment completed successfully!"
- [ ] SSH to EC2: `ssh -i key.pem ubuntu@ip`
- [ ] Check container: `docker ps | grep docita-api`
- [ ] View logs: `docker logs -f docita-api` (should show API starting)
- [ ] Test endpoint: `curl https://api.docita.work/api/health`
- [ ] Should return 200 OK with health response

### Using SSH Build Method (Alternative)

#### Deploy
- [ ] Go to GitHub repo → Actions tab
- [ ] Select "Deploy API to Production (SSH Build)"
- [ ] Click "Run workflow"
- [ ] Wait for execution (10-15 minutes)

#### Verify Deployment
- [ ] Workflow shows green checkmark ✅
- [ ] Check logs for "✨ Deployment completed successfully!"
- [ ] Follow verification steps above

## Post-Deployment Checklist

### Immediate (Same Day)
- [ ] Monitor logs for any errors: `docker logs -f docita-api`
- [ ] Test main API endpoints
- [ ] Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Verify no disk space issues: `df -h`

### Daily
- [ ] Quick health check: `curl https://api.docita.work/api/health`
- [ ] No container restarts: `docker inspect docita-api | grep RestartCount`

### Weekly
- [ ] Review Docker logs for patterns
- [ ] Check for unused Docker images: `docker images`
- [ ] Monitor EC2 disk usage: `df -h`
- [ ] Check SSL cert expiration: `sudo certbot certificates`

### Monthly
- [ ] Update EC2 packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Clean Docker system: `docker system prune -a`
- [ ] Review security group rules
- [ ] Check CloudWatch metrics (if enabled)
- [ ] Rotate secrets (JWT_SECRET recommended every 90 days)

## Troubleshooting Checklist

### Workflow Fails
- [ ] Check GitHub Secrets are set correctly
- [ ] Verify EC2 SSH key is properly formatted (has BEGIN/END)
- [ ] Check EC2 instance is running
- [ ] Verify security group allows SSH (port 22)
- [ ] Check EC2 has internet connectivity

### Container Won't Start
- [ ] Check logs: `docker logs docita-api`
- [ ] Check if port 3001 is in use: `sudo lsof -i :3001`
- [ ] Verify .env file exists and is readable: `cat ~/docita/.env`
- [ ] Check disk space: `df -h`
- [ ] Check Docker is running: `sudo systemctl status docker`

### API Not Responding
- [ ] Check container is running: `docker ps | grep docita-api`
- [ ] Check health endpoint: `curl http://localhost:3001/api/health`
- [ ] Check Nginx is running: `sudo systemctl status nginx`
- [ ] Check Nginx config: `sudo nginx -t`
- [ ] View Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Check SSL cert: `sudo certbot certificates`

### SSL Certificate Issues
- [ ] Verify cert exists: `ls -la /etc/letsencrypt/live/api.docita.work/`
- [ ] Check expiration: `sudo certbot certificates`
- [ ] Test renewal: `sudo certbot renew --dry-run`
- [ ] Manual renewal: `sudo certbot renew`
- [ ] Test Nginx config: `sudo nginx -t`

### Disk Space Issues
- [ ] Check usage: `df -h`
- [ ] List large files: `du -sh ~/* | sort -h`
- [ ] Clean Docker: `docker system prune -a`
- [ ] Remove old images: `docker image prune -a`
- [ ] Check Docker directory: `du -sh /var/lib/docker/`

## Rollback Procedure

If something goes wrong:

```bash
# SSH to EC2
ssh -i key.pem ubuntu@your-ip

# Option 1: Restart current container (often fixes transient issues)
docker restart docita-api

# Option 2: Rollback to previous image (if available)
docker ps -a  # Find old container ID
docker images | grep docita-api  # Find previous image SHA
docker stop docita-api && docker rm docita-api
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file ~/docita/.env \
  your-username/docita-api:previous-sha

# Option 3: Rebuild on EC2
cd ~/docita-repo
git reset --hard origin/main
docker build -f apps/api/Dockerfile -t docita-api:latest .
docker stop docita-api && docker rm docita-api
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file ~/docita/.env \
  docita-api:latest
```

## Common Commands

```bash
# View container logs
docker logs -f docita-api
docker logs --tail 50 docita-api

# Container status
docker ps
docker ps -a
docker inspect docita-api

# Resource usage
docker stats docita-api

# Restart container
docker restart docita-api

# Stop/start
docker stop docita-api
docker start docita-api

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Test API locally
curl http://localhost:3001/api/health

# Test through Nginx
curl https://api.docita.work/api/health
```

## Important Files

| File | Location | Purpose |
|------|----------|---------|
| Dockerfile | `apps/api/Dockerfile` | Container image definition |
| Deploy workflow | `.github/workflows/deploy-api.yml` | Automated deployment |
| Alt workflow | `.github/workflows/deploy-api-ssh-build.yml` | Alternative SSH build |
| Setup guide | `docs/DEPLOYMENT_API_SETUP.md` | Detailed setup instructions |
| Quick ref | `docs/DEPLOYMENT_API_QUICK_REF.md` | Quick reference guide |
| Full docs | `docs/DEPLOYMENT.md` | Complete deployment guide |
| Changes | `docs/DEPLOYMENT_API_CHANGES.md` | Summary of updates |
| EC2 .env | `~/docita/.env` | Environment variables |
| Nginx config | `/etc/nginx/sites-available/docita-api` | Reverse proxy config |
| SSL certs | `/etc/letsencrypt/live/api.docita.work/` | SSL certificates |

## Notes

- Deployment typically takes 5-10 minutes with ECR
- First deployment is slower due to Docker layer caching
- Health checks wait 40 seconds before checking status
- Container auto-restarts unless manually stopped
- SSL certificates auto-renew before expiration
- Keep EC2 SSH key secure (never commit to git)
- Rotate JWT_SECRET periodically (weekly/monthly recommended)
