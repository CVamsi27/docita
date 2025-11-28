# Deployment Guide

This guide covers the deployment of the Docita monorepo applications.

## Architecture Overview

- **Frontend Applications (Next.js)**:
  - `apps/landing`: Public landing page.
  - `apps/app`: Main patient/doctor dashboard.
  - `apps/admin`: Super admin dashboard.
  - **Target**: Vercel

- **Backend API (Nest.js)**:
  - `apps/api`: REST API & WebSocket server.
  - **Target**: AWS EC2

- **Database**:
  - **Current**: Neon (Serverless PostgreSQL)
  - **Future Migration**: AWS RDS PostgreSQL

## 1. Frontend Deployment (Vercel)

Each Next.js application should be deployed as a separate project in Vercel.

### Prerequisites

- Vercel Account
- GitHub Repository connected to Vercel

### Configuration for all apps

- **Framework Preset**: Next.js
- **Root Directory**: `apps/landing` (or `apps/app`, `apps/admin`)
- **Build Command**: `cd ../.. && pnpm build --filter @docita/landing` (adjust filter name)
  - _Note_: Vercel's default monorepo settings usually handle this, but explicit commands are safer.
  - Better approach: Let Vercel detect the monorepo. Set the "Root Directory" in project settings to the specific app folder.

### Specific App Settings

#### Landing Page (`apps/landing`)

- **Root Directory**: `apps/landing`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: URL of your deployed API (e.g., `https://api.docita.work`)
  - `NEXT_PUBLIC_APP_URL`: URL of the main app (e.g., `https://app.docita.work`)

#### Main App (`apps/app`)

- **Root Directory**: `apps/app`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: URL of your deployed API.
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe key.

#### Admin Dashboard (`apps/admin`)

- **Root Directory**: `apps/admin`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: URL of your deployed API.

## 2. Database Setup (Neon)

### Current: Neon Serverless PostgreSQL

Neon provides serverless PostgreSQL with automatic scaling and branching.

#### Setup Steps

1. **Create Neon Account**: Sign up at [neon.tech](https://neon.tech)
2. **Create Project**:
   - Project name: `docita-production`
   - Region: Choose closest to your EC2 region (e.g., `us-east-1`)
3. **Get Connection String**:
   - Copy the connection string from Neon dashboard
   - Format: `postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
4. **Configure Environment Variable**:
   - Add `DATABASE_URL` to your EC2 environment

#### Neon Benefits

- **Instant provisioning**: No manual database setup
- **Auto-scaling**: Scales to zero when not in use
- **Branching**: Create database branches for testing
- **Backups**: Automatic point-in-time recovery
- **No maintenance**: Fully managed service

#### Migration Path to AWS RDS

When ready to migrate:

1. **Provision AWS RDS PostgreSQL**
2. **Export from Neon**: `pg_dump -h neon-host -U user dbname > backup.sql`
3. **Import to RDS**: `psql -h rds-endpoint -U user dbname < backup.sql`
4. **Update DATABASE_URL**: Point to RDS endpoint
5. **Test thoroughly**: Verify all functionality
6. **Switch traffic**: Update production environment variable

## 3. Backend Deployment (AWS EC2)

The API is containerized using Docker and deployed on EC2.

### Prerequisites

- AWS Account with EC2 access
- Docker installed locally (for building/pushing)
- Neon database connection string

### Docker Build

Navigate to the project root and run:

```bash
docker build -f apps/api/Dockerfile -t docita-api .
```

### Running the Container

Ensure you provide the necessary environment variables.

```bash
docker run -d -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/docita?sslmode=require" \
  -e JWT_SECRET="your-secret" \
  -e PORT=3001 \
  docita-api
```

### AWS EC2 Deployment Steps

#### 1. Launch EC2 Instance

- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t3.medium (minimum) or t3.large (recommended)
- **Security Group**:
  - Allow SSH (port 22) from your IP
  - Allow HTTP (port 80) from anywhere
  - Allow HTTPS (port 443) from anywhere
  - Allow port 3001 from anywhere (or restrict to Vercel IPs)
- **Storage**: 30GB gp3 (minimum)
- **Key Pair**: Create/use existing for SSH access

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

#### 4. Install Docker Compose (Optional)

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### 5. Push Image to Container Registry

Option A: **Amazon ECR**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag docita-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/docita-api:latest

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/docita-api:latest
```

Option B: **Docker Hub**

```bash
# Login
docker login

# Tag image
docker tag docita-api:latest your-username/docita-api:latest

# Push image
docker push your-username/docita-api:latest
```

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
# Pull image
docker pull your-username/docita-api:latest

# Run container
docker run -d \
  --name docita-api \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env \
  your-username/docita-api:latest

# Check logs
docker logs -f docita-api
```

#### 7. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/docita-api
```

Add configuration:

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

Enable site and SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/docita-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.your-domain.com
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

Recommended workflow:

1. **Test**: Run `pnpm test` and `pnpm lint` on PRs.
2. **Build**: Verify `pnpm build` passes.
3. **Deploy Frontend**: Vercel automatically deploys on push to main.
4. **Deploy Backend**:
   - Build Docker image.
   - Push to Docker Hub/ECR.
   - SSH into EC2 to pull and restart container.

### Sample GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and Push
        run: |
          docker build -f apps/api/Dockerfile -t ${{ secrets.DOCKER_USERNAME }}/docita-api:latest .
          docker push ${{ secrets.DOCKER_USERNAME }}/docita-api:latest

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/docita
            docker pull ${{ secrets.DOCKER_USERNAME }}/docita-api:latest
            docker stop docita-api || true
            docker rm docita-api || true
            docker run -d \
              --name docita-api \
              --restart unless-stopped \
              -p 3001:3001 \
              --env-file .env \
              ${{ secrets.DOCKER_USERNAME }}/docita-api:latest

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deployment
        run: |
          # Vercel deploys automatically on push to main
          # Or use Vercel CLI for manual trigger
          echo "Frontend deployed by Vercel"
```

### Required GitHub Secrets

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password/token
- `EC2_HOST`: EC2 public IP or domain
- `EC2_SSH_KEY`: Private SSH key for EC2 access
- `DATABASE_URL`: Neon connection string (for migrations)
