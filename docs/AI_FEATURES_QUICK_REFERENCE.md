# AI Features & Payment Processing - Quick Start Guide

## Super Admin Access

### 1. Navigate to AI Features Management

**Path:** Admin Dashboard → AI Features

**Features:**

- View all clinics with their current tier and AI status
- Enable AI features for PRO/ENTERPRISE tier clinics
- Disable AI features for any clinic
- View detailed feature status in modal

**Quick Actions:**

- ✅ Enable AI (PRO/ENTERPRISE only)
- ❌ Disable AI (all tiers)
- 👁️ View Details

---

## 2. Navigate to Payment Processing

**Path:** Admin Dashboard → Payment Processing

**Features:**

- View tier pricing summary cards
- Select clinic for payment
- Choose target tier
- Select payment method
- Process payment and auto-upgrade tier

**Tier Pricing Summary:**

```
CAPTURE    CORE      PLUS      PRO       ENTERPRISE
Free       ₹4,999    ₹9,999    ₹24,999   Custom
1 doc      5 docs    20 docs   Unlimited Unlimited
100 pts    1K pts    5K pts    Unlimited Unlimited
```

---

## API Endpoints Reference

### AI Features

| Method | Endpoint                               | Purpose          |
| ------ | -------------------------------------- | ---------------- |
| GET    | `/super-admin/clinics/:id/ai-features` | Get AI status    |
| PATCH  | `/super-admin/clinics/:id/ai-features` | Update features  |
| PATCH  | `/super-admin/clinics/:id/enable-ai`   | Enable AI        |
| PATCH  | `/super-admin/clinics/:id/disable-ai`  | Disable AI       |
| GET    | `/super-admin/ai-features-catalog`     | List AI features |

### Payment & Tier

| Method | Endpoint                                   | Purpose                   |
| ------ | ------------------------------------------ | ------------------------- |
| POST   | `/super-admin/clinics/:id/process-payment` | Process payment + upgrade |
| GET    | `/super-admin/clinics/:id/tier-info`       | Get tier info             |
| POST   | `/super-admin/clinics/:id/upgrade-tier`    | Manual tier upgrade       |
| POST   | `/super-admin/clinics/:id/downgrade-tier`  | Manual tier downgrade     |
| GET    | `/super-admin/tier-pricing`                | Get pricing info          |

---

## Common Workflows

### Enable AI Features for a Clinic

1. Go to **AI Features**
2. Find clinic in list
3. Check clinic tier (must be PRO or ENTERPRISE)
4. Click **Enable AI** button
5. Confirm action
6. AI features activated ✅

### Process Payment & Upgrade Tier

1. Go to **Payment Processing**
2. Click **Manage Payment** for desired clinic
3. In dialog:
   - Current tier shown at top
   - Select new tier from dropdown
   - Amount auto-calculates
   - Choose payment method
   - Add notes (optional)
4. Click **Process Payment**
5. Clinic tier updated automatically ✅

### View Detailed Feature Status

1. Go to **AI Features**
2. Click **View** button for clinic
3. Modal shows:
   - Current tier
   - AI enabled status
   - Individual feature status
   - Each feature toggle state

---

## Tier Requirements for AI Features

| Feature                  | CAPTURE | CORE | PLUS | PRO | ENTERPRISE |
| ------------------------ | ------- | ---- | ---- | --- | ---------- |
| Predictive Analytics     | ❌      | ❌   | ❌   | ✅  | ✅         |
| Automated Diagnosis      | ❌      | ❌   | ❌   | ✅  | ✅         |
| Patient Insights         | ❌      | ❌   | ❌   | ✅  | ✅         |
| Appointment Optimization | ❌      | ❌   | ✅   | ✅  | ✅         |
| Prescription Assistant   | ❌      | ❌   | ❌   | ✅  | ✅         |

---

## Error Messages & Solutions

| Error                                                         | Meaning           | Solution                       |
| ------------------------------------------------------------- | ----------------- | ------------------------------ |
| "AI features are only available for PRO and ENTERPRISE tiers" | Cannot enable AI  | Upgrade clinic to PRO first    |
| "Cannot downgrade tier using upgrade endpoint"                | Invalid operation | Use downgrade endpoint instead |
| "Clinic not found"                                            | Clinic ID invalid | Verify clinic ID is correct    |
| "Failed to process payment"                                   | Payment error     | Check payment details, retry   |

---

## Security

✅ All endpoints require:

- Valid JWT token
- Super admin role
- Proper authorization headers

✅ Data protection:

- Clinic isolation enforced
- Tier hierarchy validated
- Error handling standardized

---

## Support

For issues or questions:

1. Check the detailed documentation: `/docs/AI_FEATURES_IMPLEMENTATION.md`
2. Review API endpoints in super-admin controller
3. Check service layer business logic
4. Verify database connection and Prisma client

---

**Last Updated:** January 2025
**Version:** 1.0.0
