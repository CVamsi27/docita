# GitHub Actions Configuration

This folder contains the CI/CD workflows for the Docita API.

## Available Workflows

### 1. `deploy-api.yml` (Main CI/CD Pipeline)
**Trigger**: Push to `main` branch with changes in `apps/api/`, `packages/types/`, or `packages/db/`

**Process**:
1. **Test Job**: Run E2E tests against PostgreSQL (can be skipped for emergencies)
2. **Build Job**: Build Docker image with multi-platform support, push to AWS ECR
3. **Deploy Job**: Zero-downtime deployment to EC2

**Features**:
- ✅ Tests run before deployment (gated deployment)
- ✅ Zero-downtime deployment (blue-green style)
- ✅ Docker layer caching for fast builds (ECR cache)
- ✅ Health check verification before switching traffic
- ✅ Automatic old image cleanup
- ✅ GitHub Actions summary with deployment details
- ✅ Emergency skip-tests option via manual trigger
- ✅ AWS ECR for private, secure image storage

### 2. `rollback-api.yml` (Emergency Rollback)
**Trigger**: Manual workflow dispatch only

**Process**:
1. Requires confirmation ("ROLLBACK" typed)
2. Pulls specified image tag
3. Stops current container
4. Starts rollback container
5. Verifies health

**Usage**:
1. Go to Actions → Rollback API → Run workflow
2. Enter the image tag (SHA) to rollback to
3. Type "ROLLBACK" to confirm
4. Monitor the rollback

### 3. `deploy-api-ssh-build.yml` (Alternative - Build on EC2)
**Trigger**: Manual workflow dispatch

**Use When**:
- ECR is unavailable
- Need to build directly on EC2
- Testing local changes on server

### 4. `test.yml` (E2E Tests)
**Trigger**: Push/PR to `main` or `develop` branches

**Process**:
- Backend E2E tests with PostgreSQL
- Frontend Playwright tests
- Coverage reports uploaded as artifacts

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `wJalr...` |
| `AWS_ACCOUNT_ID` | AWS Account ID (12 digits) | `123456789012` |
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` |
| `EC2_USERNAME` | EC2 SSH username | `ubuntu` |
| `EC2_SSH_KEY` | EC2 private key (full content) | `-----BEGIN...` |

### AWS IAM Policy Required

The IAM user needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deployment Flow

```
Push to main
     │
     ▼
┌─────────────┐
│  Run Tests  │ ← Can be skipped with workflow_dispatch
└─────────────┘
     │ Pass
     ▼
┌─────────────┐
│ Build Image │ → Push to AWS ECR (with SHA tag + latest)
└─────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│              Zero-Downtime Deploy                   │
│  1. Login to ECR on EC2                             │
│  2. Pull new image                                  │
│  3. Start new container on port 3002                │
│  4. Wait for health check                           │
│  5. Stop old container                              │
│  6. Switch new container to port 3001               │
│  7. Final health check                              │
│  8. Cleanup old images                              │
└─────────────────────────────────────────────────────┘
     │
     ▼
  ✅ Done
```

## Quick Commands

### Trigger Deployment
```bash
git add . && git commit -m "feat: your change" && git push origin main
```

### Emergency Deploy (Skip Tests)
1. Go to Actions → Deploy API to Production
2. Click "Run workflow"
3. Check "Skip tests" checkbox
4. Click "Run workflow"

### Rollback
1. Find the previous working SHA: `git log --oneline -10`
2. Go to Actions → Rollback API → Run workflow
3. Enter the SHA tag
4. Type "ROLLBACK" and run

### Check Deployment Status
```bash
# SSH to EC2
ssh -i key.pem ubuntu@your-ec2-ip

# Check container
docker ps
docker logs docita-api --tail 50

# Check health
curl http://localhost:3001/health
```

## Troubleshooting

### Tests Failing
- Check the test logs in GitHub Actions
- Ensure database migrations are up to date
- Run tests locally: `pnpm --filter api test:e2e`

### Build Failing
- Check Dockerfile syntax
- Verify all packages build: `pnpm build`
- Check AWS ECR credentials are valid

### Deploy Failing
- Verify EC2 is running and accessible
- Check SSH key is correct (with headers)
- Ensure port 3001 is not blocked
- Check .env file exists on EC2: `cat ~/docita/.env`

### Container Won't Start
```bash
# On EC2
docker logs docita-api
docker inspect docita-api

# Common issues:
# - Missing DATABASE_URL
# - Port already in use
# - Out of memory
```

## Health Check Endpoint

Ensure your API has a `/health` endpoint:

```typescript
// Already in apps/api/src/monitoring/health.controller.ts
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

## Security Notes

1. **Never commit secrets** - Use GitHub Secrets only
2. **Rotate SSH keys** periodically
3. **Use HTTPS** - Nginx handles SSL termination
4. **Non-root container** - Dockerfile runs as `nodejs` user
5. **Health checks** - Container restarts if unhealthy
