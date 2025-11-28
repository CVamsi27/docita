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
  - **Target**: AWS (EC2/ECS) or any Docker-compatible hosting.

## 1. Frontend Deployment (Vercel)

Each Next.js application should be deployed as a separate project in Vercel.

### Prerequisites
- Vercel Account
- GitHub Repository connected to Vercel

### Configuration for all apps
- **Framework Preset**: Next.js
- **Root Directory**: `apps/landing` (or `apps/app`, `apps/admin`)
- **Build Command**: `cd ../.. && pnpm build --filter @docita/landing` (adjust filter name)
  - *Note*: Vercel's default monorepo settings usually handle this, but explicit commands are safer.
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

## 2. Backend Deployment (AWS via Docker)

The API is containerized using Docker.

### Prerequisites
- AWS Account (EC2 or ECS)
- Docker installed locally (for building/pushing)
- PostgreSQL Database (RDS or self-hosted)

### Docker Build

Navigate to the project root and run:

```bash
docker build -f apps/api/Dockerfile -t docita-api .
```

### Running the Container

Ensure you provide the necessary environment variables.

```bash
docker run -d -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  -e PORT=3001 \
  docita-api
```

### AWS EC2 Deployment Steps

1. **Launch EC2 Instance**: Use Ubuntu 22.04 LTS or Amazon Linux 2.
2. **Install Docker**:
   ```bash
   sudo apt update
   sudo apt install docker.io
   sudo usermod -aG docker $USER
   ```
3. **Push Image**: Push your built image to Amazon ECR or Docker Hub.
4. **Pull & Run**: On the EC2 instance, pull the image and run it with the env vars.
5. **Nginx Reverse Proxy** (Optional but recommended):
   - Set up Nginx to proxy port 80/443 to 3001.
   - Use Certbot for SSL.

## 3. Database Migrations

Migrations should be run before deploying the new API version.

- **Locally/CI**: `pnpm db:push` or `pnpm db:migrate`
- **Production**: You can run migrations from the container or a separate CI job.
  - The Dockerfile includes `RUN npx prisma generate`.
  - To run migrations: `docker exec -it <container-id> npx prisma migrate deploy` (requires schema in container).

## 4. CI/CD Pipeline (GitHub Actions)

Recommended workflow:
1. **Test**: Run `pnpm test` and `pnpm lint` on PRs.
2. **Build**: Verify `pnpm build` passes.
3. **Deploy Frontend**: Vercel automatically deploys on push to main.
4. **Deploy Backend**:
   - Build Docker image.
   - Push to ECR.
   - Trigger ECS deployment or SSH into EC2 to pull/restart.
