# Clinic Onboarding System - DPDP Compliant

## Overview

This document describes the comprehensive clinic onboarding system for Docita, designed with full compliance to India's Digital Personal Data Protection Act (DPDP) 2023. The system handles clinic registration, staff management, plan selection, payment processing, SLA signing, and consent management for patient communications.

## Table of Contents

1. [Onboarding Flow](#onboarding-flow)
2. [Data Protection & Compliance](#data-protection--compliance)
3. [Security Measures](#security-measures)
4. [Step-by-Step Process](#step-by-step-process)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Compliance Checklist](#compliance-checklist)

---

## Onboarding Flow

The clinic onboarding process consists of 7 steps:

1. **Clinic Details** - Basic clinic information
2. **Admin Account** - Primary administrator account creation
3. **Plan Selection** - Choose subscription tier and billing cycle
4. **Payment Details** - Secure payment processing (if not free tier)
5. **SLA Agreement** - Legal agreements and data processing consent
6. **Consent Management** - Configure patient communication preferences
7. **Staff Setup** - Add team members (optional)

### Flow Diagram

```
Start → Clinic Details → Admin Account → Plan Selection → Payment →
SLA Agreement → Consent Management → Staff Setup → Complete
```

---

## Data Protection & Compliance

### DPDP Act 2023 Compliance

The onboarding system implements the following DPDP requirements:

#### 1. **Consent Management**

- **Explicit Consent**: Clinics must explicitly consent to data processing terms
- **Purpose Limitation**: Data processing purposes are clearly defined and recorded
- **Granular Controls**: Separate consent for different communication channels (WhatsApp, Marketing, etc.)
- **Consent Withdrawal**: Patients can withdraw consent at any time
- **Audit Trail**: All consent changes are logged with timestamps and IP addresses

#### 2. **Data Minimization**

- Only essential data is collected during onboarding
- Optional fields are clearly marked
- No unnecessary personal information is requested

#### 3. **Transparency**

- Clear privacy policy and data processing terms
- SLA agreement with explicit acceptance tracking
- Purpose of data collection is communicated upfront

#### 4. **Data Security**

- **Encryption at Rest**: AES-256 encryption for all stored data
- **Encryption in Transit**: TLS 1.3 for all network communication
- **Password Hashing**: Bcrypt with salt rounds (10) for password storage
- **Audit Logging**: All actions logged with user ID, timestamp, IP address

#### 5. **Data Localization**

- Option to specify data residency preference (India by default)
- Data stored in compliance with Indian data protection laws

#### 6. **Rights of Data Principal**

- Right to access data
- Right to correction
- Right to erasure
- Right to data portability
- Right to withdrawal of consent

---

## Security Measures

### 1. **Encryption**

#### Data at Rest

- **Database Encryption**: PostgreSQL with encryption enabled
- **Password Storage**: Bcrypt hashing (10 rounds)
- **Sensitive Fields**: Additional encryption layer for PII (Personally Identifiable Information)

```typescript
// Password encryption example
const hashedPassword = await bcrypt.hash(password, 10);
```

#### Data in Transit

- **TLS 1.3**: All API communication encrypted
- **HTTPS Only**: Enforced in production
- **Secure WebSocket**: wss:// for real-time features

### 2. **Authentication & Authorization**

- **JWT Tokens**: Secure token-based authentication
- **Password Requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (recommended)
- **Session Management**: Secure session handling with expiration

### 3. **Audit Logging**

Every action during onboarding is logged:

```typescript
await auditService.logAction({
  userId: adminUser.id,
  clinicId: clinic.id,
  actionType: "CLINIC_ONBOARDED",
  resourceType: "Clinic",
  resourceId: clinic.id,
  metadata: { tier, billingCycle, onboardingId },
  ipAddress,
});
```

**Logged Events:**

- Clinic creation
- User account creation
- Staff member addition
- SLA acceptance
- Consent configuration changes
- Payment transactions

### 4. **Input Validation**

- **DTO Validation**: Class-validator decorators for all inputs
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Prevention**: Input sanitization
- **CSRF Protection**: CSRF tokens for form submissions

### 5. **Rate Limiting**

- API rate limiting to prevent abuse
- Onboarding session expiration (24 hours)

---

## Step-by-Step Process

### Step 1: Clinic Details

**Purpose**: Collect basic clinic information

**Required Fields:**

- Clinic Name
- Email
- Phone Number
- Address
- Clinic Type (General, Dental, Pediatric, etc.)

**Optional Fields:**

- Website
- City, State, Pincode
- MRN Prefix (for patient record numbering)
- Data Residency Preference

**DPDP Compliance:**

- Data residency option allows clinics to specify where data should be stored
- Minimal data collection principle applied

**API Payload:**

```json
{
  "name": "Dr. Sharma's Clinic",
  "email": "contact@drsharma.com",
  "phone": "+91-9876543210",
  "address": "123 Medical Street, Mumbai",
  "type": "GENERAL",
  "mrnPrefix": "DSC",
  "dataResidency": "IN"
}
```

---

### Step 2: Admin Account

**Purpose**: Create the primary administrator account

**Required Fields:**

- Full Name
- Email Address
- Password (with strength validation)

**Optional Fields:**

- Phone Number
- Qualification
- Registration Number
- Specialization

**Security Measures:**

- Password encrypted with bcrypt (10 rounds)
- Email uniqueness validation
- Strong password enforcement

**API Payload:**

```json
{
  "name": "Dr. Rajesh Sharma",
  "email": "dr.sharma@drsharma.com",
  "password": "SecurePass@123",
  "phoneNumber": "+91-9876543210",
  "qualification": "MBBS, MD",
  "registrationNumber": "MH12345"
}
```

---

### Step 3: Plan Selection

**Purpose**: Choose subscription tier and billing cycle

**Tiers Available:**

- **Capture** (Free): 50 patients, 500MB storage
- **Core** (₹799/mo): 300 patients, 5GB storage
- **Plus** (₹1,999/mo): 1000 patients, 20GB storage
- **Pro** (₹3,999/mo): 5000 patients, 100GB storage
- **Enterprise** (Custom): Unlimited

**Billing Cycles:**

- Monthly
- Yearly (10% discount)

**Add-ons:**

- WhatsApp Integration (+₹499/mo)
- AI Intelligence (+₹999/mo)

**API Payload:**

```json
{
  "tier": "CORE",
  "billingCycle": "MONTHLY",
  "referralCode": "FRIEND123",
  "whatsappAddon": true,
  "intelligenceAddon": false
}
```

---

### Step 4: Payment Details

**Purpose**: Process payment for non-free tiers

**Payment Gateway**: Razorpay

**Process:**

1. Create Razorpay order
2. Open Razorpay checkout modal
3. User completes payment
4. Verify payment signature
5. Activate subscription

**Security:**

- PCI DSS compliant payment processing
- Razorpay signature verification
- No card details stored on server

**API Payload:**

```json
{
  "razorpayPaymentId": "pay_xxxxxxxxxxxxx",
  "razorpayOrderId": "order_xxxxxxxxxxxxx",
  "razorpaySignature": "signature_xxxxxxxxxxxxx"
}
```

**Free Tier:**

```json
{
  "skipPayment": true
}
```

---

### Step 5: SLA Agreement

**Purpose**: Legal agreement and DPDP compliance

**Required Acceptances:**

1. Service Level Agreement (SLA)
2. Data Processing Terms
3. Privacy Policy

**DPDP Compliance:**

- Explicit consent tracking
- Version control for legal documents
- IP address and user agent logging
- Timestamp recording

**Tracked Information:**

- Who accepted (name and user ID)
- When accepted (timestamp)
- From where (IP address)
- What was accepted (SLA version, terms version)

**API Payload:**

```json
{
  "acceptedSLA": true,
  "slaVersion": "1.0",
  "acceptedBy": "Dr. Rajesh Sharma",
  "acceptedDataProcessingTerms": true,
  "acceptedPrivacyPolicy": true,
  "ipAddress": "203.0.113.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Audit Log Entry:**

```json
{
  "actionType": "SLA_ACCEPTED",
  "resourceType": "Legal",
  "metadata": {
    "slaVersion": "1.0",
    "acceptedBy": "Dr. Rajesh Sharma",
    "acceptedDataProcessingTerms": true,
    "acceptedPrivacyPolicy": true,
    "ipAddress": "203.0.113.1",
    "timestamp": "2024-01-07T10:30:00Z"
  }
}
```

---

### Step 6: Consent Management

**Purpose**: Configure patient communication consent requirements (DPDP Critical)

**Configuration Options:**

1. **WhatsApp Communication**
   - Enable/Disable WhatsApp integration
   - Require patient consent before sending messages
   - WhatsApp Business Number

2. **Marketing Communications**
   - Enable/Disable marketing messages
   - Separate consent from clinical communications

3. **Data Processing Purposes**
   - Clinical Care
   - Appointment Reminders
   - Billing & Payments
   - Lab Results
   - Prescription Delivery
   - Follow-up Care
   - Health Tips & Education
   - Marketing & Promotions

**DPDP Compliance Features:**

- **Purpose Limitation**: Each data processing purpose explicitly defined
- **Granular Consent**: Patients can consent to specific purposes
- **Consent Logging**: All consent actions logged with timestamps
- **Easy Withdrawal**: Patients can withdraw consent anytime

**API Payload:**

```json
{
  "enableWhatsAppCommunication": true,
  "enableMarketingCommunications": false,
  "whatsappBusinessNumber": "+91-9876543210",
  "dataProcessingPurposes": [
    "clinical_care",
    "appointment_reminders",
    "billing",
    "prescription_delivery",
    "lab_results"
  ],
  "patientConsentRequiredBeforeWhatsApp": true,
  "logAllConsentChanges": true
}
```

**Stored Configuration:**

```json
{
  "consentManagement": {
    "whatsappEnabled": true,
    "marketingEnabled": false,
    "dataProcessingPurposes": [
      "clinical_care",
      "appointment_reminders",
      "billing"
    ],
    "requireExplicitConsent": true,
    "logAllConsentChanges": true,
    "configuredAt": "2024-01-07T10:35:00Z"
  }
}
```

**Patient Consent Flow:**

When a patient is added:

1. Patient provides phone number
2. Clinic asks: "Do you consent to receive appointment reminders via WhatsApp?"
3. Patient accepts/declines
4. Consent recorded in database:

```typescript
await prisma.patient.update({
  where: { id: patientId },
  data: {
    whatsappConsent: true,
    whatsappConsentAt: new Date(),
  },
});

// Audit log
await auditService.logAction({
  actionType: "PATIENT_CONSENT_GIVEN",
  resourceType: "Patient",
  resourceId: patientId,
  metadata: {
    consentType: "whatsapp_communication",
    consentGiven: true,
    purpose: "appointment_reminders",
  },
});
```

---

### Step 7: Staff Setup (Optional)

**Purpose**: Add team members to the clinic

**Staff Roles:**

- **Doctor**: Full access to patient records, prescriptions
- **Receptionist**: Appointments, billing, patient registration

**Required Fields per Staff:**

- Name
- Email
- Password
- Role

**Optional Fields:**

- Phone Number
- Qualification (for doctors)
- Registration Number (for doctors)
- Specialization (for doctors)

**API Payload:**

```json
{
  "staffMembers": [
    {
      "name": "Dr. Priya Patel",
      "email": "dr.priya@drsharma.com",
      "password": "SecurePass@456",
      "role": "DOCTOR",
      "qualification": "MBBS",
      "registrationNumber": "MH67890",
      "specialization": "PEDIATRIC"
    },
    {
      "name": "Ms. Anjali Mehta",
      "email": "anjali@drsharma.com",
      "password": "SecurePass@789",
      "role": "RECEPTIONIST",
      "phoneNumber": "+91-9876543211"
    }
  ]
}
```

**Security:**

- Each password encrypted independently
- Email uniqueness validated
- Audit log for each staff member created

---

## API Endpoints

### Base URL

```
https://api.docita.work/api/onboarding
```

### 1. Initialize Onboarding

**POST** `/onboarding/initialize`

**Response:**

```json
{
  "onboardingId": "onb_1704624000000_xyz123"
}
```

**Purpose**: Creates a temporary session to track multi-step onboarding progress. Session expires after 24 hours.

---

### 2. Update Step

**PATCH** `/onboarding/:onboardingId/step/:stepName`

**Parameters:**

- `onboardingId`: Onboarding session ID
- `stepName`: clinic_details | admin_account | plan_selection | payment_details | sla_agreement | consent_management | staff_setup

**Request Body**: Step-specific data (see step details above)

**Response:**

```json
{
  "onboardingId": "onb_1704624000000_xyz123",
  "currentStep": "PLAN_SELECTION",
  "completedSteps": ["CLINIC_DETAILS", "ADMIN_ACCOUNT"],
  "data": {
    "clinicDetails": {...},
    "adminAccount": {...}
  }
}
```

**Purpose**: Saves progress for each step. Allows users to resume onboarding if they leave.

---

### 3. Get Progress

**GET** `/onboarding/:onboardingId/progress`

**Response:**

```json
{
  "onboardingId": "onb_1704624000000_xyz123",
  "currentStep": "CONSENT_MANAGEMENT",
  "completedSteps": [
    "CLINIC_DETAILS",
    "ADMIN_ACCOUNT",
    "PLAN_SELECTION",
    "PAYMENT_DETAILS",
    "SLA_AGREEMENT"
  ],
  "data": {...}
}
```

**Purpose**: Retrieve current onboarding progress to resume from where user left off.

---

### 4. Complete Onboarding

**POST** `/onboarding/:onboardingId/complete`

**Request Body:**

```json
{
  "clinicDetails": {...},
  "adminAccount": {...},
  "planSelection": {...},
  "paymentDetails": {...},
  "slaAgreement": {...},
  "consentManagement": {...},
  "staffSetup": {...}
}
```

**Response:**

```json
{
  "success": true,
  "clinicId": "cli_abc123",
  "userId": "usr_def456",
  "subscriptionId": "sub_ghi789",
  "message": "Clinic onboarded successfully. Welcome to Docita!"
}
```

**Error Response:**

```json
{
  "success": false,
  "clinicId": "",
  "userId": "",
  "message": "Onboarding failed. Please try again.",
  "errors": ["Email already in use", "Payment verification failed"]
}
```

**Purpose**: Final step that creates all entities in a database transaction. If any step fails, all changes are rolled back.

**What Happens:**

1. Create Clinic record
2. Create Admin User record (with encrypted password)
3. Create Subscription record
4. Process payment (if applicable)
5. Record SLA acceptance in audit log
6. Configure consent management settings
7. Create staff member accounts
8. Initialize clinic settings (reminder settings, etc.)
9. Create MRN sequence
10. Log successful onboarding in audit trail

---

## Frontend Integration

### Component Structure

```
app/
└── onboarding/
    └── page.tsx (uses ClinicOnboardingWizard)

components/
└── onboarding/
    ├── clinic-onboarding-wizard.tsx (Main wizard component)
    └── steps/
        ├── clinic-details-step.tsx
        ├── admin-account-step.tsx
        ├── plan-selection-step.tsx
        ├── payment-details-step.tsx
        ├── sla-agreement-step.tsx
        ├── consent-management-step.tsx
        └── staff-setup-step.tsx
```

### Usage Example

```typescript
import { ClinicOnboardingWizard } from "@/components/onboarding/clinic-onboarding-wizard";

export default function OnboardingPage() {
  return <ClinicOnboardingWizard />;
}
```

### State Management

The wizard uses React state to track:

- Current step
- Form data for all steps
- Onboarding session ID
- Loading states

### Features

- **Progress Indicator**: Visual stepper showing completed/current/pending steps
- **Form Validation**: Real-time validation using Zod schemas
- **Auto-save**: Progress automatically saved after each step
- **Resume Capability**: Users can close browser and resume later
- **Responsive Design**: Mobile-friendly interface
- **Animations**: Smooth transitions between steps using Framer Motion

---

## Compliance Checklist

### DPDP Act 2023 Compliance

- [x] **Consent Management**
  - [x] Explicit consent for data processing
  - [x] Purpose-specific consent
  - [x] Granular consent controls
  - [x] Consent withdrawal mechanism
  - [x] Audit trail for consent changes

- [x] **Data Minimization**
  - [x] Only essential data collected
  - [x] Optional fields clearly marked
  - [x] No unnecessary PII requested

- [x] **Transparency**
  - [x] Clear privacy policy
  - [x] SLA with explicit terms
  - [x] Purpose of data collection communicated

- [x] **Security**
  - [x] AES-256 encryption at rest
  - [x] TLS 1.3 encryption in transit
  - [x] Password hashing (Bcrypt)
  - [x] Audit logging

- [x] **Data Localization**
  - [x] Data residency option (India)
  - [x] Compliance with Indian laws

- [x] **Rights of Data Principal**
  - [x] Right to access
  - [x] Right to correction
  - [x] Right to erasure
  - [x] Right to data portability
  - [x] Right to withdraw consent

### Security Best Practices

- [x] Password strength enforcement
- [x] SQL injection prevention (Prisma ORM)
- [x] XSS prevention (input sanitization)
- [x] CSRF protection
- [x] Rate limiting
- [x] Session expiration
- [x] IP address logging
- [x] User agent tracking

### Payment Security (PCI DSS)

- [x] No card data stored on server
- [x] Razorpay integration (PCI DSS compliant)
- [x] Payment signature verification
- [x] Secure checkout flow

### Audit & Compliance

- [x] All actions logged
- [x] Timestamp tracking
- [x] IP address recording
- [x] User identification
- [x] Metadata storage
- [x] Version control for legal documents

---

## Database Schema

### Key Tables

```prisma
model Clinic {
  id                 String   @id @default(cuid())
  name               String
  email              String
  phone              String
  address            String
  type               ClinicType
  tier               ClinicTier
  mrnPrefix          String?
  whatsappAutomation Json?
  settings           Json?    // Stores DPDP compliance metadata
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Relations
  users              User[]
  subscription       Subscription?
  auditLogs          AuditLog[]
  mrnSequence        MrnSequence?
}

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  password           String   // Bcrypt hashed
  name               String
  role               Role
  clinicId           String?
  phoneNumber        String?
  qualification      String?
  registrationNumber String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  clinic             Clinic?  @relation(fields: [clinicId], references: [id])
}

model Subscription {
  id                 String            @id @default(cuid())
  clinicId           String            @unique
  plan               ClinicTier
  billingCycle       BillingCycle
  basePriceCents     Int
  status             SubscriptionStatus
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  clinic             Clinic            @relation(fields: [clinicId], references: [id])
  payments           SubscriptionPayment[]
}

model AuditLog {
  id            String   @id @default(cuid())
  userId        String?
  clinicId      String?
  actionType    String
  resourceType  String
  resourceId    String
  metadata      Json?
  ipAddress     String?
  createdAt     DateTime @default(now())

  clinic        Clinic?  @relation(fields: [clinicId], references: [id])
}

model Patient {
  id                 String    @id @default(cuid())
  clinicId           String
  whatsappConsent    Boolean   @default(false)
  whatsappConsentAt  DateTime?
  // ... other fields

  clinic             Clinic    @relation(fields: [clinicId], references: [id])
}
```

---

## Testing

### Unit Tests

Test files to create:

- `onboarding.service.spec.ts`
- `onboarding.controller.spec.ts`

### Integration Tests

Test scenarios:

1. Complete onboarding flow (happy path)
2. Resume interrupted onboarding
3. Payment failure handling
4. Duplicate email validation
5. Session expiration
6. Rollback on error

### E2E Tests

Use Playwright to test:

- Full onboarding wizard flow
- Form validation
- Payment integration
- Error handling

---

## Deployment Considerations

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Payment Gateway
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...

# Security
JWT_SECRET=...
JWT_EXPIRATION=7d

# Compliance
DPDP_COMPLIANCE_VERSION=1.0
SLA_VERSION=1.0
DATA_RESIDENCY_DEFAULT=IN

# Frontend
NEXT_PUBLIC_API_URL=https://api.docita.work
NEXT_PUBLIC_APP_URL=https://app.docita.work
```

### Monitoring

- Monitor onboarding completion rate
- Track drop-off at each step
- Alert on payment failures
- Log all errors for investigation

### Backups

- Automatic daily backups
- 30-day retention
- Encrypted backups
- Test restore procedures

---

## Support & Documentation

### For Developers

- API Documentation: https://api.docita.work/docs
- Frontend Components: Storybook
- GitHub Repository: Private

### For Clinics

- User Manual: https://docs.docita.work/user-manual
- Video Tutorials: https://docs.docita.work/tutorials
- FAQ: https://docs.docita.work/faq
- Support Email: support@docita.work

---

## Future Enhancements

1. **Multi-language Support**
   - Hindi, Tamil, Bengali, etc.
   - Localized legal documents

2. **Advanced Consent Management**
   - QR code for patient consent
   - Biometric consent collection
   - Voice consent recording

3. **Enhanced Security**
   - Two-factor authentication (2FA)
   - Biometric authentication
   - Hardware security keys

4. **Compliance Certifications**
   - ISO 27001
   - SOC 2 Type II
   - HIPAA (for US expansion)

5. **Analytics & Insights**
   - Onboarding funnel analytics
   - Drop-off analysis
   - A/B testing for conversion optimization

---

## Conclusion

This onboarding system provides a comprehensive, secure, and DPDP-compliant process for clinic registration. It balances user experience with legal compliance, ensuring that clinics can start using Docita quickly while maintaining the highest standards of data protection and security.

For questions or support, contact: dev@docita.work
