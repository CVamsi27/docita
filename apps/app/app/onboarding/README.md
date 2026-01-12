# Clinic Onboarding Flow

## Quick Start

1. **Access the onboarding page:**

   ```
   http://localhost:3000/onboarding
   ```

2. **Complete the 7-step wizard:**
   - **Step 1: Clinic Details** - Basic clinic information
   - **Step 2: Admin Account** - Create your admin login
   - **Step 3: Plan Selection** - Choose subscription tier
   - **Step 4: Payment** - Complete payment (free for Capture plan)
   - **Step 5: SLA Agreement** - Review and accept terms
   - **Step 6: Consent Management** - Configure DPDP compliance
   - **Step 7: Staff Setup** - Add team members (optional)

## Test Data

### Clinic Details

```
Name: Test Clinic
Email: test@clinic.com
Phone: +91-9876543210
Address: 123 Test Street, Mumbai
Type: General Medicine
```

### Admin Account

```
Name: Dr. Test Admin
Email: admin@test.com
Password: TestPass123
```

### Plan Selection

- **Free Plan**: Capture (no payment required)
- **Paid Plans**: Core, Plus, Pro (requires Razorpay)

## Environment Setup

Add these to your `.env` file:

```env
# Encryption (required for data protection)
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Razorpay (required for paid plans)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret

# Onboarding
ONBOARDING_SESSION_TTL=86400000
SLA_VERSION=1.0
DPDP_COMPLIANCE_VERSION=1.0
```

## API Endpoints

### Initialize Onboarding Session

```bash
POST /api/onboarding/initialize
```

### Save Step Progress

```bash
PATCH /api/onboarding/:onboardingId/step/:stepName
Content-Type: application/json

{
  "name": "Test Clinic",
  "email": "test@clinic.com",
  ...
}
```

### Get Progress

```bash
GET /api/onboarding/:onboardingId/progress
```

### Complete Onboarding

```bash
POST /api/onboarding/:onboardingId/complete
Content-Type: application/json

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

## Features

### ✅ Implemented

- [x] 7-step wizard with progress tracking
- [x] Auto-save on each step
- [x] Client-side validation
- [x] Server-side validation
- [x] Password strength meter
- [x] Plan comparison with pricing
- [x] Razorpay payment integration
- [x] Full SLA document with e-signature
- [x] DPDP compliance configuration
- [x] WhatsApp consent management
- [x] Dynamic staff member addition
- [x] Session management (24-hour expiry)
- [x] Atomic transaction on completion
- [x] Audit logging

### 🔄 To Be Tested

- [ ] Complete wizard flow end-to-end
- [ ] Payment integration with Razorpay
- [ ] Session resume after page reload
- [ ] Error handling and recovery
- [ ] Mobile responsiveness

### 📝 Future Enhancements

- [ ] Email verification
- [ ] Clinic logo upload
- [ ] Multi-language support
- [ ] Video tutorial
- [ ] Progress save notification
- [ ] Exit confirmation modal

## Troubleshooting

### Session expired

- Sessions expire after 24 hours
- Start a new onboarding session

### Payment fails

- Check Razorpay credentials in `.env`
- Use test card numbers in sandbox mode
- Check browser console for errors

### Validation errors

- All required fields must be filled
- Email format must be valid
- Password must meet strength requirements
- Phone number minimum 10 digits

## Support

For issues or questions:

- Documentation: `/docs/CLINIC_ONBOARDING_GUIDE.md`
- Next Steps: `/docs/ONBOARDING_NEXT_STEPS.md`
- Architecture: `/docs/ONBOARDING_ARCHITECTURE.md`
