# API-1 DTO Validation Implementation Guide

**Status:** 1/15 endpoints complete (RefreshToken)  
**Pattern Established:** Zod schema + createZodDto wrapper  
**Estimated Time:** 2-3 hours per 5 endpoints

---

## Template Pattern (Copy for each new DTO)

### 1. Define Zod Schema + DTO Class in dto file

```typescript
export const RefreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
```

### 2. Import DTO in controller

```typescript
import { RefreshTokenDto } from "./dto/auth.dto";
```

### 3. Replace inline @Body() type with DTO

**Before:**

```typescript
async refresh(@Body() body: { refresh_token?: string }) {}
```

**After:**

```typescript
async refresh(@Body() dto: RefreshTokenDto) {}
```

---

## Remaining Endpoints to Convert

### Priority 1: Business Critical (Next 2-3 hours)

**[ ] Subscription - Create Checkout** (HIGH - Monetization)

- File: `apps/api/src/modules/subscription/subscription.controller.ts`
- Current: `@Body() body: { tier: string; days?: number }`
- Create: `CreateCheckoutDto`
- Schema Should Validate:
  - tier: string (required, valid tier name)
  - days: number (optional, positive integer)

```typescript
export const CreateCheckoutSchema = z.object({
  tier: z.string().min(1, "Tier is required"),
  days: z.number().int().positive("Days must be positive").optional(),
});

export class CreateCheckoutDto extends createZodDto(CreateCheckoutSchema) {}
```

**[ ] Compliance - Emergency Access** (HIGH - Audit Trail)

- File: `apps/api/src/modules/compliance/consent.controller.ts`
- Current: `@Body() body: { reason: string; requestedBy: string }`
- Create: `EmergencyAccessDto`
- Schema Should Validate:
  - reason: string (required, meaningful text)
  - requestedBy: string (required, user identifier)

```typescript
export const EmergencyAccessSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  requestedBy: z.string().min(1, "RequestedBy is required"),
});

export class EmergencyAccessDto extends createZodDto(EmergencyAccessSchema) {}
```

**[ ] Subscription - Update Features** (MEDIUM - Settings)

- File: `apps/api/src/modules/subscription/subscription.controller.ts`
- Current: `@Body() body: { features: Record<string, boolean> }`
- Create: `UpdateFeaturesDto`

```typescript
export const UpdateFeaturesSchema = z.object({
  features: z.record(z.boolean(), {
    message: "Features must be a map of boolean values",
  }),
});

export class UpdateFeaturesDto extends createZodDto(UpdateFeaturesSchema) {}
```

### Priority 2: Important (Next 2-3 hours)

**[ ] Payments - Razorpay Webhook** (HIGH - Security)

- File: `apps/api/src/modules/payments/webhooks.controller.ts`
- Current: `@Body() payload: RazorpayWebhookPayload`
- Status: Already has type, needs validation pipe
- Action: Add `@UsePipes(ZodValidationPipe)` with Zod schema

**[ ] Subscription - Additional Endpoints** (3-4 more with inline types)

- `immediate?: boolean`
- `enabled: boolean`
- `amountCents: number; description?: string`

**[ ] Imports - Column Mapping** (MEDIUM - Data Import)

- File: `apps/api/src/modules/imports/imports.controller.ts`
- Current: `@Body() body: { columnMapping?: Record<string, string> }`
- Create: `ColumnMappingDto`

### Priority 3: Can be Deferred (Next 1-2 hours)

**[ ] Super Admin Billing**
**[ ] Clinics (already has "any" comment)**
**[ ] Bulk Import (needs more research)**

---

## Implementation Steps

1. **Create schema in module's dto/ directory**
   - Add to existing dto file or create new one
   - Use Zod for runtime validation
   - Add meaningful error messages

2. **Create DTO class**
   - Extend createZodDto(schema)
   - Export both schema and DTO class

3. **Update controller**
   - Import the new DTO
   - Replace inline type with DTO parameter
   - Parameter name: `dto` (consistent convention)

4. **Verify**
   - Run `pnpm --filter @docita/api lint`
   - Run `pnpm --filter @docita/api build`
   - Run relevant tests if available

5. **Optional: Add Swagger documentation**
   - Add `@ApiProperty()` decorators (if not inherited from Zod)
   - This often works automatically with ZodDto

---

## Common Zod Validation Patterns

```typescript
// String with constraints
email: z.string().email(),
name: z.string().min(1).max(100),
reason: z.string().min(10, 'Reason too short'),

// Numbers
days: z.number().int().positive(),
amount: z.number().multipleOf(0.01),

// Optional/Nullable
optional_field: z.string().optional(),
nullable_field: z.string().nullable(),

// Enums
tier: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),

// Records/Objects
features: z.record(z.boolean()),
config: z.record(z.string()),

// Refinements
password_confirm: z.object({
  password: z.string(),
  confirm: z.string(),
}).refine(data => data.password === data.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
}),
```

---

## Checklist for Completion

- [ ] RefreshToken (DONE)
- [ ] CreateCheckout
- [ ] EmergencyAccess
- [ ] UpdateFeatures
- [ ] RazorpayWebhook (add validation)
- [ ] ColumnMapping
- [ ] Subscription endpoints (4 more)
- [ ] Super Admin endpoints
- [ ] Clinics endpoints
- [ ] Bulk Import endpoints
- [ ] Verify all lint passes
- [ ] Verify all tests pass
- [ ] Add CI check for new inline types

---

**Next Action:** Pick 2-3 endpoints from Priority 1 list and complete them following this template.
**Estimated Completion:** 2-3 hours to complete Priority 1+2 (10-12 endpoints)
