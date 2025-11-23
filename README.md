# Docita - Modern Clinic Management OS

**The Bridge from Paper to Cloud.**  
Modern clinic management that rescues your messy records. Start with Excel, scale to AI-powered healthcare.

## 🚀 Live Demo

- **Frontend**: [https://docita.buildora.work](https://docita.buildora.work)
- **Backend API**: [https://docita-api.buildora.work](https://docita-api.buildora.work)
- **Repository**: [https://github.com/CVamsi27/docita](https://github.com/CVamsi27/docita)

## ✨ Features

- **📅 Smart Scheduling**: Drag-and-drop calendar with automated reminders.
- **👥 Patient Records**: Comprehensive EMR with history, vitals, and digital prescriptions.
- **🧾 Digital Billing**: Generate professional invoices and track payments.
- **💬 WhatsApp Integration**: Automated patient communication for prescriptions and follow-ups.
- **📥 Easy Migration**: Seamless import from Excel or paper records.
- **🔒 Secure & Private**: Enterprise-grade security and role-based access control.
- **🏥 Multi-Clinic Support**: Manage multiple clinics and doctors from a single account.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend**: NestJS, Prisma ORM
- **Database**: PostgreSQL
- **Monorepo**: Turborepo, pnpm

## 📦 Getting Started

### Prerequisites

- Node.js v18+
- pnpm v8+
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

- [User Manual](docs/USER_MANUAL.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)

## 📄 License

MIT
