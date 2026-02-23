# Configuration Migration Guide

## Overview

Previously, environment variables were accessed directly using `process.env` scattered throughout the codebase (91+ locations). This created several issues:

- **Security concerns**: Secrets passed around unnecessarily
- **Testability**: Hard to mock configuration in tests
- **Type safety**: No validation or type hints
- **Maintainability**: Unclear what configuration is needed

## New Approach: AppConfigService

The `AppConfigService` provides centralized, injectable configuration access:

```typescript
// Before: Direct process.env access ❌
class SubscriptionService {
  checkout() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment=success`;
  }
}

// After: Inject AppConfigService ✅
class SubscriptionService {
  constructor(private configService: AppConfigService) {}

  checkout() {
    const keyId = this.configService.getRazorpayKeyId();
    const callbackUrl = this.configService.getPaymentCallbackUrl();
  }
}
```

## Benefits

✅ **Type Safety**: Typed methods instead of string lookups  
✅ **Validation**: All env vars validated at startup (fails fast)  
✅ **Testability**: Easily mock in tests  
✅ **Documentation**: Clear which config each service needs  
✅ **Security**: Centralized access control

## Setup

The `AppConfigModule` is **global** and automatically available in all modules:

```typescript
import { AppConfigService } from "src/common/config";

@Injectable()
export class MyService {
  constructor(private configService: AppConfigService) {}
}
```

## Available Methods

### Environment & Features

```typescript
this.configService.getEnvironment(); // 'development' | 'staging' | 'production'
this.configService.isProduction(); // boolean
this.configService.isDevelopment(); // boolean
```

### URL Configuration

```typescript
this.configService.getAppUrl(); // API URL (e.g., http://localhost:3001)
this.configService.getFrontendAppUrl(); // Frontend URL (e.g., http://localhost:3000)
this.configService.getPaymentCallbackUrl(); // Full payment callback URL
```

### Razorpay (Payment Gateway)

```typescript
this.configService.getRazorpayKeyId(); // Public key for frontend
this.configService.getRazorpayKeySecret(); // Secret key for backend
```

### Meta WhatsApp

```typescript
this.configService.getMetaAccessToken(); // Graph API access token
this.configService.getMetaPhoneNumberId(); // Business phone number ID
this.configService.getMetaAppSecret(); // Webhook signature verification
this.configService.getMetaVerifyToken(); // Webhook verification token
```

### Google Cloud (OCR)

```typescript
this.configService.getGoogleCloudProjectId();
this.configService.getGoogleCloudCredentialsJson();

// OCR Thresholds
this.configService.getOcrConfidenceThreshold(); // Default: 0.75
this.configService.getOcrMedicalFieldThreshold(); // Default: 0.8
this.configService.getOcrContactFieldThreshold(); // Default: 0.65
```

### Redis

```typescript
this.configService.getRedisUrl(); // Optional, for caching
```

### Logging

```typescript
this.configService.getLogLevel(); // 'debug' | 'info' | 'warn' | 'error'
```

## Migration Checklist

Priority 1 (High Impact):

- [ ] subscription-billing.service.ts (5+ process.env accesses)
- [ ] razorpay-subscription.gateway.ts (3+ accesses)
- [ ] whatsapp-client.service.ts (4+ accesses)
- [ ] email.service.ts (2+ accesses)

Priority 2 (Medium Impact):

- [ ] invoices.service.ts (5+ accesses)
- [ ] prescriptions.service.ts (5+ accesses)
- [ ] payments.service.ts (3+ accesses)
- [ ] referrals.service.ts (1 access)

Priority 3 (Low Impact):

- [ ] Remaining services with 1-2 accesses

## Testing with AppConfigService

### Test Example

```typescript
describe("SubscriptionService", () => {
  let service: SubscriptionService;
  let configService: AppConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: AppConfigService,
          useValue: {
            getRazorpayKeyId: jest.fn().mockReturnValue("test_key_123"),
            getPaymentCallbackUrl: jest
              .fn()
              .mockReturnValue("http://localhost:3000/callback"),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    configService = module.get<AppConfigService>(AppConfigService);
  });

  it("should use config service for checkout", () => {
    service.checkout();

    expect(configService.getRazorpayKeyId).toHaveBeenCalled();
    expect(configService.getPaymentCallbackUrl).toHaveBeenCalled();
  });
});
```

## Environment Variables Required

See `.env.example` for the complete list. Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key (min 32 chars in production)
- `ENCRYPTION_KEY` - 64-character hex string for data encryption
- `NODE_ENV` - 'development', 'staging', or 'production'

Optional but recommended for production:

- `RAZORPAY_KEY_ID` - Payment gateway integration
- `RAZORPAY_KEY_SECRET` - Payment gateway secret
- `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, etc. - WhatsApp integration
- `SENTRY_DSN` - Error tracking

## Gradual Rollout

New code should always use `AppConfigService`. Existing code can be migrated incrementally:

1. **High priority services** first (high process.env usage)
2. **New feature code** always uses AppConfigService
3. **Refactored code** updates to AppConfigService as part of the refactoring
4. **Remaining legacy code** migrated as part of regular maintenance

## FAQ

**Q: What if I need a config value that's not exposed?**  
A: Add a new getter method to `AppConfigService` and add the env var to the `EnvSchema` in `app-config.ts`.

**Q: Can I still use process.env directly?**  
A: Discouraged in new code. AppConfigService provides better type safety and validation. For legacy code, this is okay temporarily.

**Q: How is validation handled?**  
A: On app startup, `AppConfigModule` calls `validateEnv()` which uses Zod to validate all variables. If validation fails, the app won't start and shows clear error messages.

**Q: What if a required variable is missing?**  
A: The app startup will fail with a clear error message listing which variables are missing. Check `.env.example` and your `.env` file.
