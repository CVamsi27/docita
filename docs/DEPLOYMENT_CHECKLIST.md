# Deployment Checklist

Production deployment checklist for Docita Healthcare Management System.

---

## Pre-Deployment

### Accounts & Access

- [ ] Neon account created ([neon.tech](https://neon.tech))
- [ ] AWS account with EC2 access
- [ ] Vercel account ([vercel.com](https://vercel.com))
- [ ] Docker Hub account (or AWS ECR)
- [ ] Domain name registered and DNS access
- [ ] SMTP credentials (Gmail/SendGrid)
- [ ] Twilio credentials (optional, for SMS)

### Local Setup

- [ ] Code tested locally
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Docker image builds successfully
- [ ] All tests passing
- [ ] Production build works locally

---

## Database Setup (Neon)

- [ ] Neon project created
  - [ ] Project name: `docita-production`
  - [ ] Region selected (closest to EC2)
  - [ ] PostgreSQL 15 selected
- [ ] Connection string copied
- [ ] Connection string tested locally
- [ ] Database migrations executed
- [ ] Sample data seeded (optional)
- [ ] Database backup verified
- [ ] Connection pooling enabled

**Connection String Format:**

```
postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

## Backend Deployment (AWS EC2)

### EC2 Instance

- [ ] EC2 instance launched
  - [ ] AMI: Ubuntu 22.04 LTS
  - [ ] Instance type: t3.medium (minimum)
  - [ ] Storage: 30GB gp3
  - [ ] Key pair created/selected
- [ ] Security group configured
  - [ ] SSH (22) from My IP
  - [ ] HTTP (80) from Anywhere
  - [ ] HTTPS (443) from Anywhere
  - [ ] Custom TCP (3001) blocked (proxy via Nginx)
- [ ] Elastic IP assigned (optional but recommended)
- [ ] Can SSH into instance

### Docker Setup

- [ ] Docker installed
- [ ] Docker service running
- [ ] User added to docker group
- [ ] Docker image built locally
- [ ] Image pushed to registry (Docker Hub/ECR)
- [ ] Image pulled on EC2
- [ ] Container running successfully

### Application Configuration

- [ ] App directory created (`~/docita`)
- [ ] `.env` file created with all variables:
  - [ ] `DATABASE_URL` (Neon connection string)
  - [ ] `JWT_SECRET` (min 32 chars)
  - [ ] `JWT_EXPIRATION`
  - [ ] `PORT=3001`
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN` (Vercel URLs)
  - [ ] SMTP settings
  - [ ] File upload settings
- [ ] Upload directory created and mounted
- [ ] Container restart policy set (`--restart unless-stopped`)
- [ ] Health endpoint responding

### Nginx & SSL

- [ ] Nginx installed
- [ ] Nginx configuration created
- [ ] Configuration tested (`nginx -t`)
- [ ] Nginx restarted
- [ ] Can access API via HTTP
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal tested

### Security

- [ ] UFW firewall enabled
- [ ] UFW rules configured
  - [ ] SSH from specific IP only
  - [ ] HTTP/HTTPS from anywhere
  - [ ] Port 3001 blocked
- [ ] `.env` file permissions set (600)
- [ ] Default passwords changed
- [ ] Security headers enabled (helmet)
- [ ] Rate limiting configured

---

## Frontend Deployment (Vercel)

### Landing Page Project

- [ ] Project created on Vercel
- [ ] GitHub repository connected
- [ ] Root directory set: `apps/landing`
- [ ] Build command configured
- [ ] Environment variables set:
  - [ ] `NEXT_PUBLIC_API_URL`
  - [ ] `NEXT_PUBLIC_APP_URL`
- [ ] First deployment successful
- [ ] Custom domain added: `www.your-domain.com`
- [ ] DNS configured
- [ ] SSL certificate active

### Main App Project

- [ ] Project created on Vercel
- [ ] Root directory set: `apps/app`
- [ ] Build command configured
- [ ] Environment variables set:
  - [ ] `NEXT_PUBLIC_API_URL`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (if using)
- [ ] First deployment successful
- [ ] Custom domain added: `app.your-domain.com`
- [ ] DNS configured
- [ ] SSL certificate active

### Admin Dashboard Project

- [ ] Project created on Vercel
- [ ] Root directory set: `apps/admin`
- [ ] Build command configured
- [ ] Environment variables set:
  - [ ] `NEXT_PUBLIC_API_URL`
- [ ] First deployment successful
- [ ] Custom domain added: `admin.your-domain.com`
- [ ] DNS configured
- [ ] SSL certificate active

---

## DNS Configuration

- [ ] API subdomain: `api.your-domain.com` → EC2 IP
- [ ] Landing: `www.your-domain.com` → Vercel
- [ ] App: `app.your-domain.com` → Vercel
- [ ] Admin: `admin.your-domain.com` → Vercel
- [ ] Root domain: `your-domain.com` → Redirect to www
- [ ] All DNS records propagated (check with `dig` or `nslookup`)

---

## Testing & Verification

### Backend Testing

- [ ] API health check passes:
  ```bash
  curl https://api.your-domain.com/api/health
  ```
- [ ] Database connection verified
- [ ] CORS working (test from frontend)
- [ ] Authentication working
- [ ] File upload working
- [ ] Email sending working
- [ ] WebSocket connections working (if applicable)
- [ ] All endpoints tested via Postman/API client

### Frontend Testing

- [ ] Landing page loads
- [ ] Navigation working
- [ ] Contact form working
- [ ] App login page accessible
- [ ] Login working
- [ ] Dashboard loads
- [ ] Patient management working
- [ ] Appointment scheduling working
- [ ] Prescription creation working
- [ ] Billing/invoicing working
- [ ] Admin dashboard accessible
- [ ] All pages loading correctly
- [ ] Mobile responsiveness verified

### Security Testing

- [ ] HTTPS enforced on all domains
- [ ] API CORS configured correctly
- [ ] Authentication required for protected routes
- [ ] JWT tokens expiring correctly
- [ ] Password reset working
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] Rate limiting working

### Performance Testing

- [ ] Page load times acceptable (<3s)
- [ ] API response times acceptable (<500ms)
- [ ] Database queries optimized
- [ ] Images optimized
- [ ] No console errors
- [ ] Lighthouse score >90 (if possible)

---

## Monitoring & Maintenance

### Logging

- [ ] Docker logs accessible
- [ ] Nginx logs accessible
- [ ] Application errors logged
- [ ] Log rotation configured
- [ ] Centralized logging setup (optional)

### Monitoring

- [ ] Uptime monitoring configured (UptimeRobot/etc)
- [ ] Health checks running
- [ ] Error monitoring setup (Sentry/etc)
- [ ] Performance monitoring active
- [ ] Database monitoring in Neon dashboard
- [ ] Alert notifications configured

### Backups

- [ ] Database backup script created
- [ ] Backup cron job scheduled
- [ ] Backup restoration tested
- [ ] Upload files backup configured
- [ ] Backup retention policy set
- [ ] Backups stored in S3 (optional)

---

## Documentation

- [ ] Production environment variables documented
- [ ] Deployment procedure documented
- [ ] Rollback procedure documented
- [ ] Monitoring access documented
- [ ] API endpoints documented
- [ ] User credentials documented (securely)
- [ ] Emergency contacts listed

---

## Post-Deployment

### Communication

- [ ] Team notified of deployment
- [ ] Users notified (if applicable)
- [ ] Documentation shared
- [ ] Training materials prepared
- [ ] Support channels established

### Handover

- [ ] Credentials shared securely
- [ ] Access granted to team members
- [ ] Admin accounts created
- [ ] Documentation handed over
- [ ] Support procedures documented
- [ ] Escalation paths defined

---

## Production Readiness Checklist

### Critical Items

- [ ] All default passwords changed
- [ ] Sample/test data removed
- [ ] Debug mode disabled
- [ ] API keys rotated
- [ ] CORS properly configured
- [ ] HTTPS enforced everywhere
- [ ] Firewall rules strict
- [ ] Backups working and tested

### Recommended Items

- [ ] CDN configured (Vercel handles this)
- [ ] Caching strategy implemented
- [ ] Redis for sessions (if needed)
- [ ] Auto-scaling configured (if needed)
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] SLA defined
- [ ] Support workflow established

---

## Rollback Plan

In case of issues:

1. **Database Issues**:
   - [ ] Restore from Neon backup
   - [ ] Or restore from manual backup
   - [ ] Update connection string if needed

2. **Backend Issues**:
   - [ ] Stop current container
   - [ ] Pull previous image version
   - [ ] Start container with old image
   - [ ] Verify health endpoint

3. **Frontend Issues**:
   - [ ] Go to Vercel dashboard
   - [ ] Find previous deployment
   - [ ] Click "Promote to Production"

---

## Sign-off

- [ ] Technical lead approval
- [ ] Security review passed
- [ ] Performance requirements met
- [ ] All stakeholders notified
- [ ] Documentation complete
- [ ] Monitoring active
- [ ] Backups verified

**Deployment Date**: **\*\***\_**\*\***  
**Deployed By**: **\*\***\_**\*\***  
**Verified By**: **\*\***\_**\*\***  
**Production URL**: **\*\***\_**\*\***

---

## Support Contacts

| Role               | Name | Contact |
| ------------------ | ---- | ------- |
| DevOps             |      |         |
| Backend Developer  |      |         |
| Frontend Developer |      |         |
| Database Admin     |      |         |
| Project Manager    |      |         |

---

## Service URLs

| Service | URL                           | Status |
| ------- | ----------------------------- | ------ |
| Landing | https://www.your-domain.com   | [ ]    |
| App     | https://app.your-domain.com   | [ ]    |
| Admin   | https://admin.your-domain.com | [ ]    |
| API     | https://api.your-domain.com   | [ ]    |
| Neon DB | neon.tech dashboard           | [ ]    |
| EC2     | AWS console                   | [ ]    |
| Vercel  | vercel.com dashboard          | [ ]    |

---

**Version**: 2.0  
**Last Updated**: November 2024
