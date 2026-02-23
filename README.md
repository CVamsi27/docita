# Docita - Modern Clinic Management OS

**The Bridge from Paper to Cloud.**  
Modern clinic management that rescues your messy records. Start with Excel, scale to AI-powered healthcare.

## � Pre-Launch Status

**Current Progress:** 84% → Target 86% (Feb 15-16)

| Component    | Status      | Completion    | Details                                                    |
| ------------ | ----------- | ------------- | ---------------------------------------------------------- |
| **UI-1**     | ✅ Complete | 100%          | WCAG 2.1 AA accessibility compliance (0 violations)        |
| **TEST-3**   | ✅ Complete | 100%          | 21 critical E2E workflows ready (1,040+ lines)             |
| **DEPLOY-1** | 🔄 Ready    | Documentation | Infrastructure setup guides prepared (3 docs, 2,077 lines) |
| **DEPLOY-2** | ⏳ Planned  | N/A           | Production deployment (after staging validation)           |

**Key Documents:**

- 📖 [Full Pre-Launch Checklist](PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- 🚀 [DEPLOY-1 Infrastructure Setup](docs/DEPLOY-1_INFRASTRUCTURE_SETUP.md) - Comprehensive guide (9 phases)
- ✅ [DEPLOY-1 Setup Checklist](DEPLOY-1_SETUP_CHECKLIST.md) - Detailed tasks (20 groups)
- 💡 [DEPLOY-1 Quick Reference](docs/DEPLOY-1_QUICK_REFERENCE.md) - CLI commands (50+ commands)
- 📈 [Session Summary](DEPLOY-1_PHASE_TRANSITION_SUMMARY.md) - Current status & next steps

## �🚀 Live Demo

- **Landing**: [https://landing.docita.work](https://landing.docita.work)
- **App**: [https://app.docita.work](https://app.docita.work)
- **Admin**: [https://admin.docita.work](https://admin.docita.work)
- **API**: [https://api.docita.work](https://api.docita.work)
- **Repository**: [https://github.com/CVamsi27/docita](https://github.com/CVamsi27/docita)

## ✨ Features

- **📅 Smart Scheduling**: Drag-and-drop calendar with automated reminders.
- **👥 Patient Records**: Comprehensive EMR with history, vitals, and digital prescriptions.
- **🧾 Digital Billing**: Generate professional invoices and track payments.
- **💬 WhatsApp Integration**: Automated patient communication for prescriptions and follow-ups.
- **📥 Easy Migration**: Seamless import from Excel or paper records.
- **🔒 Secure & Private**: Enterprise-grade security and role-based access control.
- **🏥 Multi-Clinic Support**: Manage multiple clinics and doctors from a single account.

## 🏗️ Architecture

**Production Deployment Strategy**

```
┌─────────────────┐
│   Vercel        │
│  (Frontend)     │
│  - Landing      │
│  - App          │
│  - Admin        │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────┐
│   AWS EC2       │
│  (Backend API)  │
│  - NestJS       │
│  - Docker       │
└────────┬────────┘
         │
         │ PostgreSQL
         │
┌────────▼────────┐
│   Neon DB       │
│  (PostgreSQL)   │
│  - Serverless   │
│  → AWS RDS      │
│  (Future)       │
└─────────────────┘
```

**Current Setup**:

- **Database**: Neon Serverless PostgreSQL (migrating to AWS RDS later)
- **Backend**: AWS EC2 with Docker
- **Frontend**: Vercel (auto-deploy from Git)

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15/16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Shadcn UI
- **Icons**: Lucide Icons
- **Data Fetching**: TanStack React Query
- **Hosting**: Vercel

### Backend

- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: Neon PostgreSQL → AWS RDS
- **Hosting**: AWS EC2 (Docker)

### Infrastructure

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Container**: Docker
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt

## 📦 Getting Started

### Prerequisites

- Node.js v20+
- pnpm v10+
- PostgreSQL

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/CVamsi27/docita.git
   cd docita
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup Environment**
   Copy `.env.example` to `.env` in `apps/api` and `apps/web` (or root) and configure your database URL.

4. **Database Setup**

   ```bash
   cd packages/db
   pnpm db:generate
   pnpm db:push
   ```

5. **Run Development Server**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 📚 Documentation

### Pre-Launch & Deployment

- 🚀 [DEPLOY-1 Infrastructure Setup](docs/DEPLOY-1_INFRASTRUCTURE_SETUP.md) - **START HERE** for deployment (9 phases, 500+ lines)
- ✅ [DEPLOY-1 Setup Checklist](DEPLOY-1_SETUP_CHECKLIST.md) - Actionable tasks with verification (20 groups)
- 💡 [DEPLOY-1 Quick Reference](docs/DEPLOY-1_QUICK_REFERENCE.md) - CLI commands and troubleshooting (50+ commands)
- 🧪 [TEST-3 Critical Flows Guide](docs/TEST-3_CRITICAL_FLOWS_GUIDE.md) - E2E test coverage (21 workflows)
- ✨ [Accessibility Compliance Report](docs/UI-1_ACCESSIBILITY_COMPLIANCE_FINAL.md) - WCAG 2.1 AA (0 violations)

### General Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Complete production deployment guide
- [User Manual](docs/USER_MANUAL.md) - How to use Docita
- [API Documentation](docs/API_DOCUMENTATION.md) - API reference
- [Testing Guide](docs/TESTING.md) - Testing strategies and best practices

### Quick Navigation for Team

- **Setting up infrastructure?** → [DEPLOY-1 Infrastructure Setup](docs/DEPLOY-1_INFRASTRUCTURE_SETUP.md)
- **Need CLI commands?** → [DEPLOY-1 Quick Reference](docs/DEPLOY-1_QUICK_REFERENCE.md)
- **Running tests staging?** → [TEST-3 Critical Flows Guide](docs/TEST-3_CRITICAL_FLOWS_GUIDE.md)
- **Checking deployment status?** → [DEPLOY-1 Phase Transition Summary](DEPLOY-1_PHASE_TRANSITION_SUMMARY.md)

## 🚀 Deployment

### Quick Start (Production)

1. **Database**: Create Neon project → Get connection string
2. **Backend**: Deploy to EC2 with Docker
3. **Frontend**: Connect to Vercel → Auto-deploy from Git

See [Deployment Guide](docs/DEPLOYMENT.md) for step-by-step instructions.

### Estimated Costs

- Neon: $0-19/month
- EC2 t3.medium: ~$30/month
- Vercel: $0-20/month
- **Total: ~$30-70/month**

## 📄 License

MIT
