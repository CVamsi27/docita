# Docita — Modern Clinic Management OS

**The Bridge from Paper to Cloud.**

> Start with Excel. Scale to AI-powered healthcare.

---

## What It Is

Docita is a connected clinic management platform that replaces scattered registers, Excel sheets, and WhatsApp follow-ups with one workspace for appointments, patient records, consultations, prescriptions, billing, follow-ups, and facility operations.

Designed for Indian private clinics and hospitals — from solo practitioners to multi-doctor facilities.

---

## The Problem

- Clinics run on paper registers, Excel files, and WhatsApp messages — nothing is connected.
- Doctors waste time on admin instead of patients.
- Front desk staff juggle multiple tools for booking, billing, and messaging.
- Clinic owners have no visibility into what happened today.

---

## The Solution

One connected workspace where every action links to the next:

**Front desk books** -> **Doctor sees it** -> **Consultation happens** -> **Prescription is tied to the patient** -> **Invoice is tied to the visit** -> **Follow-up stays visible**.

Nothing falls through the cracks because nothing is disconnected.

---

## Core Capabilities

| Area | What It Does |
|---|---|
| **Smart Scheduling** | Drag-and-drop calendar, online patient booking, automated reminders |
| **Patient Records (EMR)** | Complete history, vitals, structured clinical notes, digital prescriptions |
| **Consultations** | SOAP notes, specialty exams, investigations, follow-up tracking |
| **Digital Billing** | Invoices, cash/UPI/card collection, insurance claims, daybook |
| **WhatsApp Integration** | Automated prescriptions, follow-up reminders, broadcast campaigns |
| **Lab & Pharmacy** | Lab orders, results, inventory tracking, low-stock alerts |
| **Analytics** | Disease trends, revenue reports, compliance dashboards |
| **AI Assistant** | Prescription assist, diagnosis support, OCR for handwritten notes |
| **Easy Migration** | Import from Excel or scan paper records with OCR |
| **Multi-Clinic** | Manage multiple facilities and doctors from a single account |

---

## Audience

| Who | What They Get |
|---|---|
| **Solo Doctor** | Patient context instantly, prescriptions in seconds, zero admin overhead |
| **Front Desk** | One screen for queue, booking, payment, and messages |
| **Clinic Owner** | Daily visibility — who's waiting, what was billed, what follow-up is pending |
| **Hospital Admin** | Coordination across departments: desk, doctors, billing, lab, beds |

---

## Architecture at a Glance

```
Frontend (Cloudflare)          Backend (Fly.io, Mumbai)
--------------------          -------------------------
Clinician App (Next.js)  -->   API (NestJS)
Admin Portal (Next.js)        Background Worker
Marketing Site (Astro)
                               Database: PostgreSQL (AWS RDS)
                               Storage: Cloudflare R2
```

- **Monorepo**: Turborepo + pnpm
- **Type System**: Zod-first — one schema, shared across API and frontend
- **Security**: Role-based access, tenant isolation, audit logging, DPDP-ready
- **Tested**: 3,100+ unit tests, type-clean, lint-clean

---

## Tiers & Pricing

| Tier | Target | Highlights |
|---|---|---|
| **Starter** | Solo / small clinic | Core scheduling, records, billing |
| **Essential** | Growing multi-doctor | + WhatsApp, analytics, lab integration |
| **Professional** | Established clinics | + AI assistant, insurance claims, inventory |
| **Hospital** | Multi-department | + Bed management, IPD, departmental coordination |
| **Enterprise** | Chain / network | + Custom contracts, dedicated support, advanced analytics |

Each tier available in **Full** or **Front Desk** mode (reduced feature set for billing/ops-only clinics at 70% pricing).

**30-day free trial. No credit card required.**

---

## Why Docita

1. **Connected, not siloed** — every action (book, consult, prescribe, bill, follow-up) links to the same patient record.
2. **India-first** — built for Indian clinic workflows: UPI payments, WhatsApp communication, DPDP compliance built in; ABDM/ABHA on roadmap.
3. **Start small** — set up one doctor and one front desk user on day one; scale when ready.
4. **Migration path** — Excel import and OCR scanning let clinics move from paper without losing history.
5. **Secure by default** — enterprise-grade access control, tenant isolation, audit logging, PHI protection.

---

## Milestones

- **47 production routes** in the clinician app, **16** in the admin portal
- **3,100+ passing tests**, zero type errors, zero lint errors
- **Domain-driven backend** with repository pattern, CQRS, and event-driven architecture
- **Cloudflare-edge frontend** with OpenNext for low-latency access across India
- **WhatsApp Business API** integration for automated patient communication

---

## Get Started

| | |
|---|---|
| **Website** | [docita.work](https://docita.work) |
| **App** | [app.docita.work](https://app.docita.work) |
| **Free Trial** | [docita.work](https://docita.work) — 30 days, no credit card |
| **Contact** | support@docita.work / +91 87903 11010 |
| **LinkedIn** | [linkedin.com/company/114464051](https://linkedin.com/company/114464051) |
| **Instagram** | [instagram.com/docita.work](https://instagram.com/docita.work) |
| **X** | [x.com/docita_work](https://x.com/docita_work) |

---

*Docita — Run your clinic from one place.*
