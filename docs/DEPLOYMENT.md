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
- **AWS ECR Repository**: Must be created in **us-west-1** region (or update `AWS_REGION` in workflow)
  ```bash
  aws ecr create-repository --repository-name docita-api --region us-west-1
  ```
- **ECR Lifecycle Policy**: It is highly recommended to apply a lifecycle policy to prevent storage costs from accumulating.
  ```bash
  # Run the setup script to apply the policy (keeps last 5 images, expires untagged after 30 days)
  ./scripts/setup-ecr-lifecycle-policy.sh
  ```
- **IMPORTANT**: Images are now built for multi-architecture support (`linux/amd64` and `linux/arm64`)
  - EC2 instances use `linux/amd64`
  - macOS/Apple Silicon machines use `linux/arm64`
  - The workflow automatically builds and pushes both architectures via Docker manifest

### Docker Build

Navigate to the project root and run:

```bash
docker build -f apps/api/Dockerfile -t docita-api .
```

> **Note**: The Dockerfile uses a **multi-stage build** process. It separates the build environment from the runtime environment and uses aggressive caching for dependencies. This results in significantly smaller image sizes (~120MB) and faster build times.

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
- **Storage**: 30GB gp3 (minimum)
- **Key Pair**: Create/use existing for SSH access
- **Elastic IP**: Allocate and associate an Elastic IP for consistent address (recommended for production)

#### 1a. Associate Elastic IP (Optional but Recommended)

Elastic IPs ensure your instance IP remains constant even after stops/starts:

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

#### 4. Install Docker Compose (Optional)

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### 5. Push Image to Container Registry

Option A: **Amazon ECR**

##### ⚠️ Important: ECR Login Method

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

- ✅ Tests run before deployment (gated)
- ✅ Database migrations run before deployment
- ✅ Zero-downtime deployment (blue-green style)
- ✅ **Multi-architecture image builds** (linux/amd64 + linux/arm64)
- ✅ Docker layer caching via ECR
- ✅ Health check verification before switching traffic
- ✅ Automatic old image cleanup
- ✅ Rollback workflow available

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

- ✅ Handles ECR login correctly without TTY requirements
- ✅ Works seamlessly in GitHub Actions environments
- ✅ No need for `aws ecr get-login` (deprecated command)
- ✅ Automatically manages credentials
- ✅ Better security practices

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

            echo "🚀 Starting deployment..."

            # Navigate to repo
            cd ~/docita-repo

            # Pull latest code
            echo "📥 Pulling latest code..."
            git fetch origin main
            git reset --hard origin/main

            # Build Docker image
            echo "🔨 Building Docker image..."
            docker build -f apps/api/Dockerfile -t docita-api:latest .

            # Stop existing container
            echo "⛔ Stopping existing container..."
            docker stop docita-api || true
            docker rm docita-api || true

            # Run new container from docker app directory
            echo "🔧 Starting new container..."
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
              echo "✅ Deployment successful"
            else
              echo "❌ Deployment failed"
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

- ✅ `linux/amd64` - for AWS EC2 instances
- ✅ `linux/arm64` - for Apple Silicon and ARM systems

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
  echo "✅ Container is running"
  docker logs docita-api | tail -10
else
  echo "❌ Container failed to start"
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
