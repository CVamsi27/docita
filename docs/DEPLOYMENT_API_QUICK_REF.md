# API Deployment Quick Reference

## Quick Start (5 minutes)

### 1. Create EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Type: t3.medium
- Security: Allow SSH, HTTP, HTTPS
- Get Elastic IP and update DNS

### 2. Setup EC2
```bash
ssh -i key.pem ubuntu@your-ip

# Install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io nginx certbot python3-certbot-nginx
sudo usermod -aG docker ubuntu

# Create app dir
mkdir -p ~/docita
cd ~/docita

# Add .env file with your secrets
# DATABASE_URL, JWT_SECRET, etc.
nano .env
chmod 600 .env
```

### 3. Setup Nginx + SSL
```bash
sudo nano /etc/nginx/sites-available/docita-api
# Add config (see DEPLOYMENT.md section 7)

sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
sudo certbot --nginx -d api.docita.work
```

### 4. Add GitHub Secrets
Settings → Secrets and variables → Actions:
- `AWS_ACCESS_KEY_ID`: IAM access key
- `AWS_SECRET_ACCESS_KEY`: IAM secret key
- `AWS_ACCOUNT_ID`: 12-digit AWS account ID
- `EC2_HOST`: Your Elastic IP
- `EC2_USERNAME`: ubuntu
- `EC2_SSH_KEY`: Your private key (full content)

### 5. Deploy
Push to main → GitHub Actions handles it

## Deployment Options

### Option A: AWS ECR (Recommended)
```
Git push → GH Actions builds image → Pushes to ECR → SSH deploys to EC2
```
Benefits: Fast, cached builds, integrated with AWS, private registry

### Option B: SSH Build
```
Manual trigger in GH Actions → Builds on EC2 → Deploys immediately
```
Benefits: Simpler, no external registry needed

## Common Commands

### SSH to EC2
```bash
ssh -i your-key.pem ubuntu@your-elastic-ip
```

### Check Container Status
```bash
docker ps | grep docita-api
docker logs -f docita-api
docker inspect docita-api
```

### Manual Deploy
```bash
cd ~/docita

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

docker pull $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/docita-api:latest
docker stop docita-api && docker rm docita-api
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  $AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/docita-api:latest
```

### Test API
```bash
curl https://api.docita.work/api/health
```

### View Logs
```bash
# Container logs
docker logs -f docita-api

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Container
```bash
docker restart docita-api
```

### Update Environment
```bash
nano ~/docita/.env
docker restart docita-api
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Container won't start | `docker logs docita-api` to see error |
| Port 3001 in use | `sudo lsof -i :3001` then `docker stop` other container |
| SSL not working | `sudo certbot certificates` to check, `sudo nginx -t` to test config |
| Can't SSH | Check security group allows SSH, verify key permissions `chmod 600 key.pem` |
| API not responding | Check Nginx is running: `sudo systemctl status nginx`, test directly: `curl http://localhost:3001/api/health` |
| Deployment stalled | Check EC2 has enough disk space: `df -h`, clean Docker: `docker system prune -a` |

## File Locations

- **API code**: `apps/api/`
- **Dockerfile**: `apps/api/Dockerfile`
- **Workflows**: `.github/workflows/deploy-api*.yml`
- **EC2 app dir**: `~/docita/`
- **EC2 .env**: `~/docita/.env`
- **Nginx config**: `/etc/nginx/sites-available/docita-api`
- **SSL certs**: `/etc/letsencrypt/live/api.docita.work/`

## Typical Deployment Flow

1. **Development**: Make changes in `apps/api/`
2. **Commit**: `git commit && git push origin main`
3. **CI/CD Trigger**: GitHub Actions sees changes
4. **Build**: Docker image built and pushed to AWS ECR
5. **Deploy**: SSH into EC2, pull image, restart container
6. **Verify**: Health check passes, logs look good
7. **Live**: API available at `https://api.docita.work`

## Need Help?

See detailed docs:
- Full setup: `docs/DEPLOYMENT_API_SETUP.md`
- Architecture: `docs/DEPLOYMENT.md` Section 3
- GitHub secrets: `docs/DEPLOYMENT_API_SETUP.md` Step 3
