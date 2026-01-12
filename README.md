# Docita - Modern Clinic Management OS

**The Bridge from Paper to Cloud.**  
Modern clinic management that rescues your messy records. Start with Excel, scale to AI-powered healthcare.

## 🚀 Live Demo

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

- [Deployment Guide](docs/DEPLOYMENT.md) - Complete production deployment guide
- [User Manual](docs/USER_MANUAL.md) - How to use Docita
- [API Documentation](docs/API_DOCUMENTATION.md) - API reference
- [Testing Guide](docs/TESTING.md) - Testing strategies and best practices

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
