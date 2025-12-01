# Payment Tier Management - Visual Workflow

## Tier Upgrade Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN DASHBOARD                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │ Payment Processing Page │
                  └────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
           ┌────────┐    ┌────────┐    ┌────────┐
           │Pricing │    │Clinics │    │Payment │
           │Summary │    │  List  │    │ Form  │
           └────────┘    └────────┘    └────────┘
                               │
                               ▼
                    SELECT CLINIC TO UPGRADE
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐
    │View Tier │        │View Tier │       │View Tier │
    │  CORE    │        │  PLUS    │       │   PRO    │
    │₹4,999/mo │        │₹9,999/mo │       │₹24,999/mo│
    └──────────┘        └──────────┘       └──────────┘
          │
          ▼
    CLICK "MANAGE PAYMENT"
          │
          ▼
    ┌─────────────────────────────┐
    │  PAYMENT PROCESSING DIALOG  │
    ├─────────────────────────────┤
    │ Current Tier: CORE          │
    │ Current Price: ₹4,999       │
    │                             │
    │ [Select Target Tier ▼]      │
    │  CORE   → ₹4,999            │
    │  PLUS   → ₹9,999            │
    │  PRO    → ₹24,999           │
    │  ENT.   → Custom            │
    │                             │
    │ Amount: ₹9,999              │
    │ (auto-calculated)           │
    │                             │
    │ [Select Payment Method ▼]   │
    │  Razorpay                   │
    │  Stripe                     │
    │  Bank Transfer              │
    │  Manual                     │
    │                             │
    │ Payment Notes:              │
    │ [Upgrade to PRO tier]       │
    │                             │
    │ [Cancel] [Process Payment]  │
    └─────────────────────────────┘
          │
          ▼
    CLICK "PROCESS PAYMENT"
          │
          ▼
    ┌──────────────────────────────────────┐
    │  BACKEND PROCESSING                  │
    ├──────────────────────────────────────┤
    │ 1. Validate tier hierarchy           │
    │    CORE → PLUS → PRO ✓               │
    │                                      │
    │ 2. Record payment                    │
    │    ID: PAY_123456789                 │
    │    Amount: ₹9,999                    │
    │    Method: razorpay                  │
    │                                      │
    │ 3. Update clinic.tier = PRO          │
    │                                      │
    │ 4. Update subscription status        │
    │    subscriptionStatus: ACTIVE        │
    │                                      │
    │ 5. Enable AI features                │
    │    intelligenceAddon: ACTIVE         │
    │    features: {                       │
    │      predictiveAnalytics: true,      │
    │      automatedDiagnosis: true,       │
    │      patientInsights: true,          │
    │      appointmentOptimization: true,  │
    │      prescriptionAssistant: true     │
    │    }                                 │
    │                                      │
    │ ✅ ALL UPDATES COMPLETE              │
    └──────────────────────────────────────┘
          │
          ▼
    ┌──────────────────────────────────────┐
    │  SUCCESS CONFIRMATION                │
    ├──────────────────────────────────────┤
    │ ✅ Payment processed successfully    │
    │ ✅ Clinic tier upgraded to PRO       │
    │ ✅ AI features activated             │
    │                                      │
    │ Clinic now has:                      │
    │ • 5 AI features enabled              │
    │ • Unlimited doctors                  │
    │ • Unlimited patients                 │
    │ • Priority phone support             │
    └──────────────────────────────────────┘
```

---

## AI Features Management Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN DASHBOARD                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                 ┌─────────────────────────┐
                 │ AI Features Management  │
                 └─────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         CAPTURE            CORE/PLUS          PRO
         (Free)             (No AI)           (AI Ready)
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │AI Status │    │AI Status │    │AI Status │
        │DISABLED  │    │DISABLED  │    │ENABLED ✓ │
        │          │    │          │    │          │
        │Cannot    │    │Cannot    │    │ ENABLED  │
        │Enable    │    │Enable    │    │ Features:│
        │(Tier too │    │(Tier too │    │•Predict. │
        │ low)     │    │ low)     │    │•Auto Diag│
        │          │    │          │    │•Insights │
        │Upgrade   │    │Upgrade   │    │•Appt Opt │
        │to PRO    │    │to PRO    │    │•Prescrip │
        └──────────┘    └──────────┘    └──────────┘
                                              │
                                  ┌───────────┼───────────┐
                                  ▼           ▼           ▼
                            [Enable AI] [Disable AI] [View]
                                  │           │
                    ┌─────────────┘           └─────────────┐
                    ▼                                       ▼
            Click "Enable AI"                      Click "View Details"
                    │                                       │
                    ▼                                       ▼
        ┌──────────────────────┐            ┌──────────────────────┐
        │  Confirmation Dialog │            │  Feature Details     │
        ├──────────────────────┤            ├──────────────────────┤
        │                      │            │ Clinic: City Hosp    │
        │ Enable all AI        │            │ Tier: PRO            │
        │ features for         │            │                      │
        │ City Hospital?       │            │ Features Status:     │
        │                      │            │ ✓ Predictive Analyt. │
        │ This will activate   │            │ ✓ Automated Diagnosis│
        │ 5 premium features   │            │ ✓ Patient Insights   │
        │                      │            │ ✓ Appt Optimization  │
        │ [Cancel] [Confirm]   │            │ ✓ Prescription Asst  │
        └──────────────────────┘            │                      │
                    │                       │ Last Updated: Now    │
                    ▼                       └──────────────────────┘
            ✅ AI ENABLED
                    │
                    ▼
        ┌──────────────────────┐
        │  SUCCESS MESSAGE     │
        ├──────────────────────┤
        │ ✅ AI features       │
        │    enabled for       │
        │    City Hospital     │
        │                      │
        │ Features now active: │
        │ • Predictive Analyt. │
        │ • Automated Diagnosis│
        │ • Patient Insights   │
        │ • Appt Optimization  │
        │ • Prescription Asst  │
        └──────────────────────┘
```

---

## Tier Hierarchy Validation

```
┌─────────────────────────────────────────────────────────────┐
│             TIER UPGRADE/DOWNGRADE VALIDATION               │
└─────────────────────────────────────────────────────────────┘

UPGRADE ALLOWED (Sequential Only)
════════════════════════════════════
✓ CAPTURE → CORE
✓ CORE → PLUS
✓ PLUS → PRO
✓ PRO → ENTERPRISE
✓ CAPTURE → PLUS (skip CORE) - ✗ NOT ALLOWED

DOWNGRADE ALLOWED (Sequential Only)
════════════════════════════════════
✓ ENTERPRISE → PRO
✓ PRO → PLUS
✓ PLUS → CORE
✓ CORE → CAPTURE
✓ PRO → CORE (skip PLUS) - ✗ NOT ALLOWED

INVALID OPERATIONS (Rejected)
════════════════════════════════════
✗ Using UPGRADE to downgrade: PRO → CORE
✗ Lateral move: PLUS → CORE (different hierarchy)
✗ Stay same: CORE → CORE
✗ Jump multiple: CAPTURE → PRO (skip CORE, PLUS)

EXAMPLE VALIDATION LOGIC:
════════════════════════════════════
Tier Numeric Values:
  CAPTURE = 1
  CORE = 2
  PLUS = 3
  PRO = 4
  ENTERPRISE = 5

When upgrading: newTier > currentTier ✓
When downgrading: newTier < currentTier ✓
Otherwise: Error ✗
```

---

## Payment Flow Diagram

```
┌─────────────────┐
│  Super Admin    │
│   Processes     │
│    Payment      │
└────────┬────────┘
         │
         ▼
┌───────────────────────────────┐
│  Validate & Record Payment    │
├───────────────────────────────┤
│ • Check payment ID exists     │
│ • Validate amount > 0         │
│ • Verify clinic exists        │
│ • Record in database          │
└────────┬────────────────────┬─┘
         │                    │
    SUCCESS                FAIL
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ Validate Tier    │  │ Return Error     │
│ Hierarchy        │  │ BadRequest       │
└────────┬─────────┘  └──────────────────┘
         │
    SUCCESS/FAIL
         │
         ├─────────────────────────────────────┐
         ▼                                     ▼
    VALID                              INVALID
  Hierarchy                            Hierarchy
     │                                     │
     ▼                                     ▼
┌──────────────────────┐      ┌──────────────────────┐
│ Update Clinic Tier   │      │ Return Error         │
│ clinic.tier = PRO    │      │ "Invalid tier path"  │
└────────┬─────────────┘      └──────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Determine AI Feature Status    │
├────────────────────────────────┤
│ if (newTier == PRO)            │
│   → Enable all 5 features      │
│ else if (newTier == PLUS)      │
│   → Enable Appointment Opt.    │
│ else                           │
│   → Disable all features       │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Update AI Features           │
├──────────────────────────────┤
│ clinic.intelligenceAddon     │
│ clinic.features (JSON)       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Update Subscription Status   │
├──────────────────────────────┤
│ clinic.subscriptionStatus    │
│ clinic.updatedAt             │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ ✅ COMPLETE                  │
│ • Payment recorded           │
│ • Tier updated               │
│ • AI features enabled        │
│ • Subscription active        │
└──────────────────────────────┘
```

---

## API Response Flow

```
Frontend (Admin Dashboard)
         │
         ▼
┌────────────────────────────┐
│ POST /process-payment      │
│ {paymentId, amount,        │
│  newTier, paymentMethod}   │
└────────┬───────────────────┘
         │
         ▼
Backend (super-admin.controller.ts)
┌────────────────────────────────────┐
│ @Roles('SUPER_ADMIN')              │
│ @UseGuards(JwtAuthGuard,RolesGuard)│
└────────┬───────────────────────────┘
         │
         ▼
Backend (super-admin.service.ts)
┌──────────────────────────────────┐
│ processPaymentAndUpdateTier()     │
│                                  │
│ 1. Find clinic                   │
│ 2. Validate tier hierarchy       │
│ 3. Update clinic.tier            │
│ 4. Update AI features            │
│ 5. Update subscription status    │
│ 6. Return updated clinic         │
└────────┬─────────────────────────┘
         │
         ▼
Database (Prisma Update)
┌──────────────────────────────────┐
│ await prisma.clinic.update({      │
│   where: { id: clinicId },        │
│   data: {                         │
│     tier: newTier,                │
│     intelligenceAddon: status,    │
│     features: featureFlags,       │
│     subscriptionStatus: ACTIVE    │
│   }                               │
│ })                                │
└────────┬─────────────────────────┘
         │
         ▼
Backend Response
┌──────────────────────────────────┐
│ HTTP 200 OK                      │
│ {                                │
│   clinic: { updated data },      │
│   payment: { payment record },   │
│   tierUpdated: true              │
│ }                                │
└────────┬─────────────────────────┘
         │
         ▼
Frontend Toast Notification
┌──────────────────────────────────┐
│ ✅ Payment processed and tier    │
│    updated successfully          │
└──────────────────────────────────┘
```

---

## Security Flow

```
┌─────────────────────────────┐
│   API Request Arrives       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Check JWT Token             │
│ @UseGuards(JwtAuthGuard)    │
├─────────────────────────────┤
│ ✓ Token valid               │
│ ✓ Token not expired         │
│ ✓ Signature verified        │
└────────┬────────────────────┘
         │
    PASS/FAIL
    ││     ││
    │└─────┘│
    │   FAIL
    ▼       ▼
  PASS   REJECT
   │    401 Unauthorized
   │
   ▼
┌─────────────────────────────┐
│ Check User Role             │
│ @Roles('SUPER_ADMIN')       │
│ @UseGuards(RolesGuard)      │
├─────────────────────────────┤
│ user.role == 'SUPER_ADMIN'  │
│ ✓ Has permission            │
└────────┬────────────────────┘
         │
    PASS/FAIL
    ││     ││
    │└─────┘│
    │   FAIL
    ▼       ▼
  PASS   REJECT
   │    403 Forbidden
   │
   ▼
┌─────────────────────────────┐
│ Validate Clinic ID          │
│ Verify clinicId ownership   │
│ clinic.id matches request   │
└────────┬────────────────────┘
         │
    PASS/FAIL
    ││     ││
    │└─────┘│
    │   FAIL
    ▼       ▼
  PASS   REJECT
   │    404 Not Found
   │
   ▼
┌─────────────────────────────┐
│ Process Request             │
│ Execute business logic      │
│ Update database             │
└────────┬────────────────────┘
         │
    SUCCESS/ERROR
    ││     ││
    │└─────┘│
    │   ERROR
    ▼       ▼
 200 OK  400/500 Error
 Response Response
```

---

**Last Updated:** January 2025  
**Version:** 1.0.0
