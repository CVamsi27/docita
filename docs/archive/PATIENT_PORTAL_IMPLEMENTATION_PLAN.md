# Patient Portal Implementation Plan

**Date:** February 17, 2026  
**Launch Target:** Phase 3 - Months 4-7 (per POST_LAUNCH_ROADMAP.md)  
**Status:** Planning Phase  

---

## 🎯 Overview

The patient portal (`/portal`) enables PATIENT role users to:
- View their appointments
- Access their prescriptions
- View and pay invoices/bills
- Update personal information
- View medical history (read-only)

---

## 📋 Current State Analysis

### ✅ Already Implemented

**Frontend Components (ready to use):**
- `features/patient-portal/components/PatientPortalOverviewUI.tsx` - Dashboard
- `features/patient-portal/components/PatientPortalAppointmentsUI.tsx` - Appointments list
- `features/patient-portal/components/PatientPortalPrescriptionsUI.tsx` - Prescriptions list
- `features/patient-portal/components/PatientPortalBillingUI.tsx` - Billing/invoices

**Frontend Hooks:**
- `features/patient-portal/hooks/use-patient-portal-data.ts` - Data aggregation

**Database:**
- ✅ `Role.PATIENT` enum exists in schema
- ✅ Patient table with all necessary fields
- ✅ Relationships: Appointment, Prescription, Invoice linked to Patient

**Authentication:**
- ✅ PATIENT role in auth system
- ✅ OTP-only login enforced for PATIENT accounts
- ✅ JWT authentication with role-based access control

### ❌ Missing Implementation

**Backend API:**
- ❌ No dedicated patient portal controller
- ❌ No patient-scoped endpoints (filtered by authenticated patient ID)
- ❌ No PATIENT role guards on existing endpoints

**Frontend Routes:**
- ❌ No `/portal` route structure in `apps/app/app/`
- ❌ No patient-specific layout
- ❌ No patient authentication guard

**Features:**
- ❌ Patient profile editing
- ❌ Online payment flow for invoices
- ❌ Prescription download (PDF)
- ❌ Appointment booking/rescheduling

---

## 🏗️ Implementation Plan

### Phase 1: Backend API (2-3 days)

#### 1.1 Create Patient Portal Module

**File:** `apps/api/src/modules/patient-portal/patient-portal.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
import { PatientsModule } from '../patients/patients.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [PatientsModule, AppointmentsModule, PrescriptionsModule, InvoicesModule],
  controllers: [PatientPortalController],
  providers: [PatientPortalService],
})
export class PatientPortalModule {}
```

#### 1.2 Create DTOs

**File:** `apps/api/src/modules/patient-portal/dto/patient-portal.dto.ts`

```typescript
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

// Get patient dashboard snapshot
export const patientPortalSnapshotSchema = z.object({});
export class GetPatientPortalSnapshotDto extends createZodDto(patientPortalSnapshotSchema) {}

// Update patient profile
export const updatePatientProfileSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});
export class UpdatePatientProfileDto extends createZodDto(updatePatientProfileSchema) {}
```

#### 1.3 Create Service

**File:** `apps/api/src/modules/patient-portal/patient-portal.service.ts`

Key methods:
- `getPatientDashboard(patientId: string)` - Aggregate appointments, prescriptions, invoices
- `getPatientAppointments(patientId: string, filters)` - Patient's appointments only
- `getPatientPrescriptions(patientId: string, filters)` - Patient's prescriptions only
- `getPatientInvoices(patientId: string, filters)` - Patient's invoices only
- `updatePatientProfile(patientId: string, data)` - Update patient info
- `requestAppointment(patientId: string, data)` - Book new appointment

#### 1.4 Create Controller

**File:** `apps/api/src/modules/patient-portal/patient-portal.controller.ts`

Endpoints:
```typescript
@ApiTags('patient-portal')
@Controller('patient-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT) // ONLY patients can access
export class PatientPortalController {
  
  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient dashboard snapshot' })
  async getDashboard(@Request() req: RequestWithUser) {
    return this.service.getPatientDashboard(req.user.patientId);
  }

  @Get('appointments')
  async getAppointments(@Request() req: RequestWithUser, @Query() filters) {
    return this.service.getPatientAppointments(req.user.patientId, filters);
  }

  @Get('prescriptions')
  async getPrescriptions(@Request() req: RequestWithUser, @Query() filters) {
    return this.service.getPatientPrescriptions(req.user.patientId, filters);
  }

  @Get('invoices')
  async getInvoices(@Request() req: RequestWithUser, @Query() filters) {
    return this.service.getPatientInvoices(req.user.patientId, filters);
  }

  @Patch('profile')
  async updateProfile(@Request() req: RequestWithUser, @Body() dto: UpdatePatientProfileDto) {
    return this.service.updatePatientProfile(req.user.patientId, dto);
  }

  @Post('appointments/request')
  async requestAppointment(@Request() req: RequestWithUser, @Body() dto: RequestAppointmentDto) {
    return this.service.requestAppointment(req.user.patientId, dto);
  }
}
```

#### 1.5 Update Auth System

**File:** `apps/api/src/common/types/common.types.ts`

Add `patientId` to RequestWithUser:
```typescript
export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
    clinicId?: string;
    tenantId?: string;
    patientId?: string; // NEW: For PATIENT role users
  };
}
```

**File:** `apps/api/src/modules/auth/auth.service.ts`

Update JWT payload for PATIENT users:
```typescript
if (user.role === Role.PATIENT) {
  // Find patient record associated with this user
  const patient = await this.prisma.patient.findFirst({
    where: { email: user.email },
  });
  
  return {
    ...standardPayload,
    patientId: patient?.id,
  };
}
```

---

### Phase 2: Database Updates (1 day)

#### 2.1 Check Schema

Current schema already supports:
- ✅ Patient table with all necessary fields
- ✅ Appointment.patientId relationship
- ✅ Prescription.patientId relationship  
- ✅ Invoice.patientId relationship

#### 2.2 Add Patient-User Link (if needed)

If User and Patient are not linked:
```prisma
model User {
  // ... existing fields
  linkedPatientId String? @unique
  linkedPatient   Patient? @relation(fields: [linkedPatientId], references: [id])
}

model Patient {
  // ... existing fields
  linkedUser User?
}
```

Run migration:
```bash
pnpm db:migrate:dev --name add-patient-user-link
```

---

### Phase 3: Frontend Routes (2-3 days)

#### 3.1 Create Portal Route Structure

```
apps/app/app/
  portal/                     # NEW: Patient portal routes
    layout.tsx               # Portal-specific layout (different from clinic app)
    page.tsx                 # Dashboard/overview
    appointments/
      page.tsx               # Appointments list
    prescriptions/
      page.tsx               # Prescriptions list
    billing/
      page.tsx               # Invoices and payments
    profile/
      page.tsx               # Edit profile
```

#### 3.2 Create Portal Layout

**File:** `apps/app/app/portal/layout.tsx`

```tsx
import { PatientAuthGuard } from '@/features/patient-portal/components/PatientAuthGuard';
import { PortalNav } from '@/features/patient-portal/components/PortalNav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientAuthGuard>
      <div className="min-h-screen bg-background">
        <PortalNav />
        <main className="container mx-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </PatientAuthGuard>
  );
}
```

#### 3.3 Create Patient Auth Guard

**File:** `apps/app/features/patient-portal/components/PatientAuthGuard.tsx`

```tsx
'use client';

import { useAuth } from '@workspace/auth';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export function PatientAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/login?returnTo=/portal');
    }
    if (!isLoading && user && user.role !== 'PATIENT') {
      redirect('/dashboard'); // Redirect non-patients to clinic dashboard
    }
  }, [user, isLoading]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || user.role !== 'PATIENT') {
    return null;
  }

  return <>{children}</>;
}
```

#### 3.4 Create Portal Pages

**File:** `apps/app/app/portal/page.tsx`

```tsx
import { PatientPortalOverviewUI } from '@/features/patient-portal/components/PatientPortalOverviewUI';
import { usePatientPortalData } from '@/features/patient-portal/hooks/use-patient-portal-data';

export default function PortalDashboardPage() {
  return <PatientPortalOverviewUI />;
}
```

**File:** `apps/app/app/portal/appointments/page.tsx`

```tsx
import { PatientPortalAppointmentsUI } from '@/features/patient-portal/components/PatientPortalAppointmentsUI';

export default function PortalAppointmentsPage() {
  return <PatientPortalAppointmentsUI />;
}
```

**File:** `apps/app/app/portal/prescriptions/page.tsx`

```tsx
import { PatientPortalPrescriptionsUI } from '@/features/patient-portal/components/PatientPortalPrescriptionsUI';

export default function PortalPrescriptionsPage() {
  return <PatientPortalPrescriptionsUI />;
}
```

**File:** `apps/app/app/portal/billing/page.tsx`

```tsx
import { PatientPortalBillingUI } from '@/features/patient-portal/components/PatientPortalBillingUI';

export default function PortalBillingPage() {
  return <PatientPortalBillingUI />;
}
```

#### 3.5 Update API Hooks

**File:** `apps/app/hooks/api/use-patient-portal.ts` (NEW)

```tsx
import { useAPIQuery } from '@/lib/api-core';

export const usePatientDashboard = () =>
  useAPIQuery(['patient-portal', 'dashboard'], '/patient-portal/dashboard');

export const usePatientPortalAppointments = (filters?: {}) =>
  useAPIQuery(['patient-portal', 'appointments', filters || {}], '/patient-portal/appointments');

export const usePatientPortalPrescriptions = (filters?: {}) =>
  useAPIQuery(['patient-portal', 'prescriptions', filters || {}], '/patient-portal/prescriptions');

export const usePatientPortalInvoices = (filters?: {}) =>
  useAPIQuery(['patient-portal', 'invoices', filters || {}], '/patient-portal/invoices');
```

---

### Phase 4: Additional Features (2-3 days)

#### 4.1 Prescription PDF Download

Add endpoint:
```typescript
@Get('prescriptions/:id/pdf')
async downloadPrescription(@Param('id') id: string, @Request() req: RequestWithUser) {
  // Verify prescription belongs to this patient
  return this.service.generatePrescriptionPDF(id, req.user.patientId);
}
```

#### 4.2 Online Payment

Integrate with existing Razorpay:
```typescript
@Post('invoices/:id/pay')
async payInvoice(@Param('id') id: string, @Request() req: RequestWithUser) {
  return this.paymentsService.initiatePatientPayment(id, req.user.patientId);
}
```

#### 4.3 Appointment Booking

```typescript
@Post('appointments/book')
async bookAppointment(@Request() req: RequestWithUser, @Body() dto: BookAppointmentDto) {
  return this.appointmentsService.bookForPatient(req.user.patientId, dto);
}
```

---

## 🔒 Security Considerations

### 1. Role-Based Access Control
- ✅ All portal endpoints require `@Roles(Role.PATIENT)`
- ✅ Data scoped to `req.user.patientId` only
- ✅ No cross-patient data access

### 2. Patient-User Linking
- One patient can have one user account
- User.linkedPatientId → Patient.id relationship
- Enforce in auth service JWT creation

### 3. Middleware Updates
- ✅ proxy.ts already handles JWT validation
- Add patient-specific route matching
- Redirect non-patients away from /portal routes

### 4. Audit Logging
- Log all patient data access
- Track prescription downloads
- Track profile updates

---

## 📱 Mobile Optimization

The portal must be mobile-first:
- ✅ Existing components use responsive Tailwind classes
- ✅ Touch-friendly UI elements
- Test on 360px, 768px, 1280px breakpoints
- Add PWA manifest for "Add to Home Screen"

---

## 🧪 Testing Strategy

### Backend Tests
```typescript
// patient-portal.controller.spec.ts
describe('PatientPortalController', () => {
  it('should return dashboard for authenticated patient');
  it('should reject non-patient users');
  it('should prevent cross-patient data access');
  it('should return only patient's appointments');
});
```

### Frontend E2E Tests
```typescript
// e2e/patient-portal.spec.ts
test('patient can log in and view dashboard', async ({ page }) => {
  // Login as patient
  // Navigate to /portal
  // Verify dashboard loads
  // Check appointments, prescriptions, invoices
});

test('non-patients cannot access portal', async ({ page }) => {
  // Login as doctor
  // Attempt to access /portal
  // Verify redirect to /dashboard
});
```

---

## 📅 Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 1: Backend API** | 2-3 days | None |
| **Phase 2: Database Updates** | 1 day | Phase 1 |
| **Phase 3: Frontend Routes** | 2-3 days | Phase 1, 2 |
| **Phase 4: Additional Features** | 2-3 days | Phase 3 |
| **Testing & QA** | 2 days | All phases |
| **TOTAL** | **9-12 days** | |

---

## ✅ Acceptance Criteria

- [ ] Patient can log in with OTP
- [ ] Patient sees personalized dashboard with their data only
- [ ] Patient can view appointments
- [ ] Patient can view prescriptions
- [ ] Patient can download prescription PDFs
- [ ] Patient can view invoices
- [ ] Patient can pay invoices online (Razorpay)
- [ ] Patient can update profile
- [ ] Patient can request appointments
- [x] **Patient can manage WhatsApp notification consent**
- [x] **Patient can request data deletion (GDPR/DPDP compliant)**
- [x] **First-time login consent banner for data storage & WhatsApp**
- [ ] Non-patients cannot access /portal routes
- [ ] Mobile-responsive on all devices
- [ ] All data properly scoped to patient ID
- [ ] Audit logs track all patient actions
- [ ] E2E tests pass
- [ ] Zero TypeScript errors
- [ ] Lighthouse score 90+ on /portal pages

---

## 🆕 Additional Features Implemented

### 1. Patient Data Deletion (GDPR/DPDP Compliance)

**Backend:**
- `POST /patient-portal/profile/delete-request` - Request account deletion
- Soft delete with anonymization
- 30-day grace period before permanent deletion

**Frontend:**
- [Profile Settings Page](apps/app/app/portal/profile/page.tsx)
- Deletion request form with reason
- Confirmation dialog
- Warning alerts

### 2. WhatsApp & Data Storage Consent

**Backend:**
- `GET /patient-portal/consent` - Get consent settings
- `PATCH /patient-portal/consent` - Update consent preferences
- Tracks `whatsappConsent` and consent timestamp

**Frontend:**
- [First-Login Consent Banner](apps/app/features/patient-portal/components/ConsentBanner.tsx)
- Modal dialog on first login
- WhatsApp notification opt-in
- Data storage consent
- Consent management in profile settings

---

## 📝 Next Steps

1. **Immediate:** Review and approve this plan
2. **Day 1-3:** Implement Phase 1 (Backend API)
3. **Day 4:** Implement Phase 2 (Database updates)
4. **Day 5-7:** Implement Phase 3 (Frontend routes)
5. **Day 8-10:** Implement Phase 4 (Additional features)
6. **Day 11-12:** Testing and bug fixes
7. **Day 13:** Deploy to staging
8. **Day 14:** Production deployment

---

**Status:** Planning Complete - Ready for Implementation  
**Complexity:** MEDIUM  
**Risk:** LOW (components already built, following existing patterns)
