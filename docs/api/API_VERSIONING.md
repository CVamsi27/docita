# API Versioning Strategy

## Overview

Docita uses **URL-based versioning** for API stability and backward compatibility. All API endpoints are prefixed with the API version (e.g., `/api/v1/`).

## Current Version

- **Active Version:** `v1`
- **Status:** Stable, in production use
- **URL Pattern:** `/api/v1/*`

## Versioning Strategy

### When to Create a New Version

A new API version is required when making **breaking changes** such as:

-  Removing or renaming fields from request/response DTOs
-  Changing HTTP methods or status codes
-  Modifying authorization or authentication mechanisms
-  Changing calculation logic or business rule behavior
-  Altering entity relationships or data structures

Non-breaking changes do **NOT** require a new version:
-  Adding optional fields (with default values)
-  Adding new endpoints
-  Enhancing error messages
-  Adding new query parameters (with sensible defaults)
-  Improving performance without changing behavior

### Deprecation Policy

1. **Announcement Phase** (Months 1-2)
   - Release new API version with breaking changes
   - Announce deprecation of old version
   - Provide migration guide to client developers

2. **Support Phase** (Months 3-8)
   - Both old and new versions remain active and fully supported
   - Bug fixes applied to both versions
   - Security patches applied to both versions
   - No new features added to deprecated version

3. **Sunset Phase** (Month 9+)
   - Old version disabled
   - Clients must migrate to new version
   - Migration window: minimum 6 months from announcement

### Example: v1 → v2 Migration Timeline

Suppose breaking changes are released in v2:

| Month | Phase | Action |
|-------|-------|--------|
| 1-2 | Announcement | v2 released, v1 deprecation announced, migration guide published |
| 3-8 | Support | Both v1 and v2 fully operational |
| 9+ | Sunset | v1 disabled, clients on v2 only |

## Implementation

### NestJS Module Setup

All versioned routes are automatically prefixed via NestJS configuration:

```typescript
// apps/api/src/main.ts
app.setGlobalPrefix('api/v1');
```

### Creating Routes in Versioned API

```typescript
// src/modules/patients/patients.controller.ts
import { Controller, Get, Param } from '@nestjs/common';

@Controller('patients')
export class PatientsController {
  @Get(':id')
  getPatient(@Param('id') id: string) {
    // Accessible at: /api/v1/patients/:id
  }
}
```

### Supporting Multiple Versions

To support both v1 and v2 simultaneously:

```typescript
// src/modules/patients/v1/patients.controller.ts
@Controller({ path: 'patients', version: '1' })
export class PatientsControllerV1 { }

// src/modules/patients/v2/patients.controller.ts
@Controller({ path: 'patients', version: '2' })
export class PatientsControllerV2 { }

// app.module.ts
import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';

app.enableVersioning({
  type: VersioningType.URI,
});
```

## API Endpoints

### Current Endpoints (v1)

All endpoints are accessed via `/api/v1/` prefix:

```
Authentication & Authorization
  POST   /api/v1/auth/signin
  POST   /api/v1/auth/signup
  POST   /api/v1/auth/refresh-token
  GET    /api/v1/auth/me

Patients
  GET    /api/v1/patients
  GET    /api/v1/patients/:id
  POST   /api/v1/patients
  PATCH  /api/v1/patients/:id
  DELETE /api/v1/patients/:id

Appointments
  GET    /api/v1/appointments
  GET    /api/v1/appointments/:id
  POST   /api/v1/appointments
  PATCH  /api/v1/appointments/:id
  DELETE /api/v1/appointments/:id

Prescriptions
  GET    /api/v1/prescriptions
  GET    /api/v1/prescriptions/:id
  POST   /api/v1/prescriptions
  PATCH  /api/v1/prescriptions/:id

Invoices & Billing
  GET    /api/v1/invoices
  GET    /api/v1/invoices/:id
  POST   /api/v1/invoices
  GET    /api/v1/billing/usage
  GET    /api/v1/billing/plans
```

## Migration Guide for Clients

### Step 1: Update Base URL

**Before (v0 - Deprecated):**
```bash
curl https://api.docita.work/patients
```

**After (v1 - Current):**
```bash
curl https://api.docita.work/api/v1/patients
```

### Step 2: Check Response DTOs

Review the [API Documentation](./API_DOCUMENTATION.md) for v1 response shapes.

### Step 3: Handle Version Differences

Some endpoints may have different fields between versions. The migration guide for each breaking change will document these differences.

### Step 4: Test in Staging

All clients should test thoroughly in staging before moving to production.

## Handling Version-Specific Logic

Use conditional logic based on API version to handle different behaviors:

```typescript
// src/modules/patients/patients.service.ts
export class PatientsService {
  async getPatient(id: string, apiVersion: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });

    if (apiVersion === 'v1') {
      return this.formatResponseV1(patient);
    } else if (apiVersion === 'v2') {
      return this.formatResponseV2(patient);
    }

    return patient;
  }

  private formatResponseV1(patient: Patient) {
    // Return v1 format
  }

  private formatResponseV2(patient: Patient) {
    // Return v2 format with additional fields
  }
}
```

## Future Versions

**v2 Planning:**
- Enhanced response caching headers
- Async operations with webhooks
- GraphQL endpoint in addition to REST
- Improved pagination (cursor-based)

**v3 Planning:**
- GraphQL as primary API
- Real-time WebSocket subscriptions
- Event streaming for integration systems

## Rate Limiting by Version

Each API version may have different rate limits:

```
v1 (Current): 1000 requests/minute per API key
v2 (Planned): 2000 requests/minute per API key
```

See [Rate Limiting](./API_DOCUMENTATION.md#rate-limiting) for details.

## Monitoring & Metrics

Track API version usage to understand deprecation timeline:

```
Endpoint: GET /api/v1/patients
Requests/Day: 15,000 (85% of all patient requests)
Users: 120 active

Endpoint: GET /api/v2/patients
Requests/Day: 2,500 (15% of all patient requests)
Users: 25 active
```

Monitor these metrics via [Observability Dashboard](./PERFORMANCE_IMPROVEMENTS.md).

## Support & Questions

For versioning questions or to propose a new API version:
1. Open an issue in the GitHub repository
2. Reference the specific breaking change
3. Provide migration examples
4. Coordinate with API team on timeline

## References

- [API Documentation](./API_DOCUMENTATION.md)
- [NestJS Versioning](https://docs.nestjs.com/techniques/versioning)
- [REST API Best Practices](https://restfulapi.net/versioning/)
