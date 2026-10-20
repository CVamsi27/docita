# Docita - API Documentation

> **Descriptive.** Reference for the public API surface. The Zod schemas
> in `packages/types/` are the source of truth; this document follows them.
> For prescriptive contract rules (Zod-first, HTTP parity), see
> [`AGENTS.md`](../../AGENTS.md) §3.1–3.2.

**Healthcare Management System API**  
Version 1.0  
Base URL: `http://localhost:3001/api` (Development)

> **Current contract (2026-08-07).** The examples below follow the actual wire
> surface; this callout is the ground truth if a section drifts again.
>
> - **Versioning**: every route lives at `/api/v1/<resource>` — the global
>   `setGlobalPrefix('api')` + URI versioning (`defaultVersion: '1'`, see
>   `apps/api/src/main.ts` `configureRouting()`) compose to `/api/v1/...`;
>   controllers never embed `api`/`v1` in their paths (the old
>   `@Controller('api/v1/operations/database')` was a double-prefix bug, fixed in
>   `cd3a9c56f`). `/health*` is version-neutral (`VERSION_NEUTRAL`). See
>   [`API_DESIGN_STANDARD.md`](API_DESIGN_STANDARD.md) §1 for the policy.
> - **Partial updates use `PATCH`** (patients, invoices, appointments). `PUT` is
>   reserved for full replacement (e.g. `PUT /clinics/:id`, `PUT /reminders/settings`).
> - **Workflow transitions are action routes on the resource**:
>   `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule`,
>   `PATCH /follow-ups/:id/complete`, `POST /appointments/:id/start-consultation`,
>   `POST /queue/check-in/:appointmentId`. Actions are `POST` (non-idempotent) or
>   `PATCH` (idempotent state change), never `GET`.
> - **Errors are RFC 9457 problem-details** (see [Error Handling](#error-handling)).
> - **Pagination** has three sanctioned shapes (see [Pagination](#pagination)).

---

## Table of Contents

1. [Authentication](#authentication)
2. [Patients API](#patients-api)
3. [Appointments API](#appointments-api)
4. [Prescriptions API](#prescriptions-api)
5. [Invoices API](#invoices-api)
6. [Documents API](#documents-api)
7. [Analytics API](#analytics-api)
8. [Clinics API](#clinics-api)
9. [Reminders API](#reminders-api)
10. [Error Handling](#error-handling)

---

## Authentication

### Existing auth success statuses

These existing POST routes return **HTTP 201** on success. Swagger metadata now
matches that established wire behavior (compatibility decision, 2026-10-08).
Paths below include the global prefix and URI version. Response bodies, cookies,
auth/CSRF checks and failure statuses are unchanged. New action POSTs follow the
HTTP 200 policy in [API design §5](API_DESIGN_STANDARD.md#5-status-code-rules).

| POST route                                | Success |
| ----------------------------------------- | ------- |
| `/api/v1/auth/login`                      | 201     |
| `/api/v1/auth/mfa/verify`                 | 201     |
| `/api/v1/auth/forgot-password`            | 201     |
| `/api/v1/auth/reset-password`             | 201     |
| `/api/v1/auth/change-password`            | 201     |
| `/api/v1/auth/check-email`                | 201     |
| `/api/v1/auth/refresh`                    | 201     |
| `/api/v1/auth/logout`                     | 201     |
| `/api/v1/auth/verify-email`               | 201     |
| `/api/v1/auth/resend-verification`        | 201     |
| `/api/v1/patient-portal/auth/request-otp` | 201     |
| `/api/v1/patient-portal/auth/verify-otp`  | 201     |

`GET /api/v1/auth/validate` remains HTTP 200. Register remains a create returning 201. The [acceptance record](../operations/releases/2026-10-08-auth-status-validation.md)
records the exact local verification and remaining release boundaries.

### Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "doctor@docita.work",
  "password": "password123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "doctor@docita.work",
    "name": "Dr. Vamsi Krishna",
    "role": "DOCTOR"
  }
}
```

### Using the Token

Include the token in the Authorization header for all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Patients API

### List All Patients

```http
GET /patients
```

**Query Parameters:**

- `search` (optional): Search by name or phone
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "data": [
    {
      "id": "patient_123",
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "dateOfBirth": "1985-03-15T00:00:00.000Z",
      "gender": "MALE",
      "phoneNumber": "9876543410",
      "email": "rajesh.kumar@email.com",
      "bloodGroup": "O+",
      "allergies": "Penicillin",
      "medicalHistory": ["Hypertension", "Diabetes Type 2"],
      "clinicId": "default-clinic-id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Get Patient by ID

```http
GET /patients/:id
```

**Response:**

```json
{
  "id": "patient_123",
  "firstName": "Rajesh",
  "lastName": "Kumar",
  "dateOfBirth": "1985-03-15T00:00:00.000Z",
  "gender": "MALE",
  "phoneNumber": "9876543410",
  "email": "rajesh.kumar@email.com",
  "address": "123 MG Road, Bangalore",
  "bloodGroup": "O+",
  "allergies": "Penicillin",
  "medicalHistory": ["Hypertension", "Diabetes Type 2"],
  "tags": [
    { "tag": "VIP", "color": "gold" }
  ],
  "appointments": [...],
  "prescriptions": [...],
  "invoices": [...]
}
```

### Create Patient

```http
POST /patients
```

**Request Body:**

```json
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "dateOfBirth": "1990-07-22",
  "gender": "FEMALE",
  "phoneNumber": "9876543411",
  "email": "priya.sharma@email.com",
  "address": "456 Brigade Road, Bangalore",
  "bloodGroup": "A+",
  "allergies": null,
  "medicalHistory": ["Asthma"],
  "clinicId": "default-clinic-id",
  "tags": [{ "tag": "Regular", "color": "blue" }]
}
```

**Response:**

```json
{
  "id": "patient_124",
  "firstName": "Priya",
  "lastName": "Sharma",
  ...
}
```

### Update Patient

```http
PATCH /patients/:id
```

**Request Body:** (same as create, all fields optional — partial updates only)

### Delete Patient

```http
DELETE /patients/:id
```

---

## Appointments API

### List Appointments

```http
GET /appointments
```

**Query Parameters:**

- `date` (optional): Filter by date (YYYY-MM-DD)
- `doctorId` (optional): Filter by doctor
- `patientId` (optional): Filter by patient
- `status` (optional): Filter by status
- `clinicId` (optional): Filter by clinic

**Response:**

```json
{
  "data": [
    {
      "id": "apt_123",
      "patientId": "patient_123",
      "doctorId": "doctor_123",
      "clinicId": "default-clinic-id",
      "startTime": "2024-01-15T10:00:00.000Z",
      "endTime": "2024-01-15T10:30:00.000Z",
      "status": "scheduled",
      "type": "consultation",
      "notes": "Regular checkup",
      "patient": {
        "firstName": "Rajesh",
        "lastName": "Kumar"
      },
      "doctor": {
        "name": "Dr. Vamsi Krishna"
      }
    }
  ]
}
```

### Create Appointment

```http
POST /appointments
```

**Request Body:**

```json
{
  "patientId": "patient_123",
  "doctorId": "doctor_123",
  "clinicId": "default-clinic-id",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T10:30:00.000Z",
  "type": "consultation",
  "notes": "Follow-up appointment"
}
```

### Update Appointment

```http
PATCH /appointments/:id
```

**Request Body:** partial appointment fields

A patch that carries `status` is a compare-and-set against the status the API
read for that request: if the appointment moved on in between (a parallel
completion, for example), the API answers `409 Conflict` instead of applying a
stale status. Patches without `status` are unconditional, so clinical fields can
still be edited after a visit is completed.

### Cancel Appointment

```http
PATCH /appointments/:id/cancel
```

**Request Body:** `{ "reason": "..." }`

### Reschedule Appointment

```http
PATCH /appointments/:id/reschedule
```

---

## Prescriptions API

### List Prescriptions

```http
GET /prescriptions
```

**Query Parameters:**

- `patientId` (optional): Filter by patient
- `appointmentId` (optional): Filter by appointment

**Response:**

```json
{
  "data": [
    {
      "id": "rx_123",
      "appointmentId": "apt_123",
      "patientId": "patient_123",
      "medications": [
        {
          "name": "Metformin",
          "dosage": "500mg",
          "frequency": "Twice daily",
          "duration": "30 days",
          "instructions": "Take after meals"
        }
      ],
      "notes": "Continue current regimen",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Prescription

```http
POST /prescriptions
```

**Request Body:**

```json
{
  "appointmentId": "apt_123",
  "patientId": "patient_123",
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "30 days",
      "instructions": "Take after meals"
    }
  ],
  "notes": "Continue current regimen"
}
```

---

## Invoices API

### List Invoices

```http
GET /invoices
```

**Query Parameters:**

- `patientId` (optional): Filter by patient
- `status` (optional): Filter by status (pending, paid, cancelled)
- `startDate` (optional): Start date range
- `endDate` (optional): End date range

**Response:**

```json
{
  "data": [
    {
      "id": "inv_123",
      "appointmentId": "apt_123",
      "patientId": "patient_123",
      "items": [
        {
          "description": "Consultation Fee",
          "quantity": 1,
          "rate": 500,
          "amount": 500
        }
      ],
      "subtotal": 500,
      "tax": 0,
      "discount": 0,
      "total": 500,
      "status": "paid",
      "paymentMethod": "cash",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Invoice

```http
POST /invoices
```

**Request Body:**

```json
{
  "appointmentId": "apt_123",
  "patientId": "patient_123",
  "items": [
    {
      "description": "Consultation Fee",
      "quantity": 1,
      "rate": 500
    },
    {
      "description": "Lab Test",
      "quantity": 1,
      "rate": 300
    }
  ],
  "discount": 50,
  "paymentMethod": "card"
}
```

### Update Invoice

```http
PATCH /invoices/:id
```

**Request Body:** partial invoice fields, including `status` and `paymentMethod`

```json
{
  "status": "paid",
  "paymentMethod": "cash"
}
```

### Invoice PDF + Claims

```http
GET /invoices/:id/pdf
GET /invoices/:id/pdf/status
POST /invoices/:id/submit-claim
GET /invoices/:id/claim-readiness
GET /invoices/:id/payment-activity
```

---

## Documents API

### Upload Session (multipart)

```http
POST /uploads/session
```

**Request:** Multipart form data (file + patient/type metadata). Returns a
session; the same session is completed with a follow-up call:

```http
POST /uploads/session/:id
GET  /uploads/session/:id
```

### List Documents

```http
GET /documents
```

**Query Parameters:**

- `patientId` (required): Patient ID
- `type` (optional): Document type

### Get Document

```http
GET /documents/:id
```

---

## Analytics API

### Get Overview Stats

```http
GET /analytics/overview
```

**Response:**

```json
{
  "totalPatients": 150,
  "newPatientsThisMonth": 12,
  "patientGrowth": 8.5,
  "totalAppointments": 45,
  "todayAppointments": 8,
  "appointmentGrowth": 12.3,
  "revenueThisMonth": 125000,
  "revenueGrowth": 15.2,
  "pendingInvoices": 5
}
```

### Get Revenue

```http
GET /analytics/revenue
GET /analytics/revenue/time-series
GET /analytics/revenue/by-category
GET /analytics/revenue/by-cpt
```

**Query Parameters:**

- `period` (optional): "week", "month", "year" (default: "month")

**Response:**

```json
{
  "data": [
    { "date": "2024-01", "revenue": 125000 },
    { "date": "2024-02", "revenue": 135000 },
    { "date": "2024-03", "revenue": 145000 }
  ]
}
```

### Get Patient Growth

```http
GET /analytics/patients
```

### Get Appointment Statistics

```http
GET /analytics/appointments
```

### More Analytics

```http
GET /analytics/disease-trends
GET /analytics/disease-trends/time-series
GET /analytics/top-diagnoses
GET /analytics/top-conditions
GET /analytics/compliance/metrics
GET /analytics/patient-demographics
```

### Get Top Diagnoses

```http
GET /analytics/top-diagnoses
```

---

## Clinics API

### List Clinics

```http
GET /clinics
```

**Response:**

```json
{
  "data": [
    {
      "id": "default-clinic-id",
      "name": "Docita Health Clinic",
      "address": "123 Health Street, Bangalore",
      "phone": "+91 80 1234 5678",
      "email": "contact@docita.health",
      "active": true,
      "settings": {
        "timezone": "Asia/Kolkata",
        "currency": "INR"
      }
    }
  ]
}
```

### Create Clinic

```http
POST /clinics
```

**Request Body:**

```json
{
  "name": "New Clinic",
  "address": "456 Medical Ave, Mumbai",
  "phone": "+91 22 9876 5434",
  "email": "newclinic@example.com",
  "settings": {
    "timezone": "Asia/Kolkata",
    "currency": "INR"
  }
}
```

### Get User's Clinics

```http
GET /clinics/user/:userId
```

### Update / Delete Clinic

```http
PUT /clinics/:id
DELETE /clinics/:id
```

### Clinic Staff

```http
POST /clinics/:clinicId/doctors
GET  /clinics/:clinicId/doctors
POST /clinics/:clinicId/receptionists
GET  /clinics/:clinicId/receptionists
POST /clinics/:clinicId/members
```

### Get Clinic Statistics

```http
GET /clinics/:id/stats
```

---

## Reminders API

### Get Reminder Settings

```http
GET /reminders/settings
```

**Response:**

```json
{
  "enabled": true,
  "smsEnabled": false,
  "emailEnabled": true,
  "hoursBeforeAppt": 24,
  "emailTemplate": "Dear {patientName}, this is a reminder...",
  "emailSubject": "Appointment Reminder"
}
```

### Update Reminder Settings

```http
PUT /reminders/settings
```

**Request Body:**

```json
{
  "enabled": true,
  "emailEnabled": true,
  "hoursBeforeAppt": 24,
  "emailTemplate": "Custom template with {patientName}, {doctorName}, {appointmentTime}"
}
```

### Get Reminder History

```http
GET /reminders/history
```

**Query Parameters:**

- `appointmentId` (optional): Filter by appointment
- `status` (optional): Filter by status (sent, failed)

### Send Reminder

```http
POST /reminders/send/:appointmentId
```

---

## Error Handling

### Error Response Format (RFC 9457 problem-details)

All errors pass through the global exception filter and share one shape:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "instance": "/patients",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "code": "VALIDATION_FAILED",
  "validationErrors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

- `code` is present on typed errors (e.g. `INSUFFICIENT_PERMISSIONS`, auth/Turnstile
  codes); `validationErrors` carries Zod/field details.
- `stack` and `errorType` appear only in development.
- Messages never contain PHI.

### Appointment overlap errors

A doctor/time overlap rejected by either the scheduling preflight or the database
race invariant returns HTTP **400** with the same payload:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Doctor has conflicting appointment",
  "instance": "/api/v1/appointments",
  "timestamp": "2026-10-08T00:00:00.000Z",
  "code": "APPOINTMENT_OVERLAP",
  "validationErrors": {
    "startTime": "Doctor has conflicting appointment"
  }
}
```

`instance` identifies the actual requested path and `timestamp` the response
instant. Clients can branch on `code` and highlight `startTime`; conflicting
appointment IDs and windows are not included. Other validation errors retain
their existing formats. Successful booking, terminal-status rules and retry
semantics are unchanged.

Canonical schemas: `appointmentOverlapErrorSchema` and
`appointmentOverlapResponseSchema` in `packages/types/src/contracts/appointments.ts`.
The API exception factory and shared data-access parser reuse them. Evidence:
[8 October overlap acceptance](../operations/releases/2026-10-08-appointment-conflict-validation.md).

### Common Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource, or a write that lost a race against a
  state change (for example a status update built before the appointment was
  completed)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limiting

Limits are **tiered per surface**, not a single global cap:

- **Auth / OTP / password reset**: brute-force-resistant (3–10 requests/min per
  IP or account; e.g. `POST /auth/login`, OTP request/verify, password reset).
- **Per-route `@RateLimit`** on expensive surfaces (AI, OCR, imports, analytics):
  5–30 requests/min.
- **Tenant API quotas** apply to clinic-scoped integrations.
- Failed logins also trigger lockout with backoff.

---

## Pagination

Three sanctioned shapes (all `limit` values are clamped server-side, e.g.
1–200):

1. **Page/offset** — pageable reports and back-office lists
   (`GET /patients`, `GET /analytics/*`):

   ```http
   GET /patients?page=1&limit=20
   ```

   ```json
   {
     "data": [...],
     "total": 150,
     "page": 1,
     "limit": 20,
     "totalPages": 8
   }
   ```

2. **Cursor** — live, ordered collections (`GET /invoices`, `GET /insurance-claims`,
   `GET /appointments`, partner portal):

   ```http
   GET /invoices?cursor=<opaque>&limit=20
   ```

   ```json
   {
     "data": [...],
     "nextCursor": "<opaque>"
   }
   ```

   `nextCursor` is omitted when there are no more rows.

3. **Offset** — patient-portal / clinical timelines and internal logs:

   ```http
   GET /patient-portal/appointments?offset=0&limit=20
   ```

   Response uses `{ "data": [...], "total": N }`.

Rules: list endpoints must always wrap rows in `data`; never return a bare
array. Use cursor for collections that grow while being paged; keep page/offset
for stable, queryable reports.

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Login
const response = await fetch("http://localhost:3001/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "doctor@docita.work",
    password: "password123",
  }),
});

const { access_token } = await response.json();

// Get patients
const patients = await fetch("http://localhost:3001/api/patients", {
  headers: {
    Authorization: `Bearer ${access_token}`,
  },
});

const data = await patients.json();
```

### Python

```python
import requests

# Login
response = requests.post('http://localhost:3001/api/auth/login', json={
    'email': 'doctor@docita.work',
    'password': 'password123'
})

token = response.json()['access_token']

# Get patients
headers = {'Authorization': f'Bearer {token}'}
patients = requests.get('http://localhost:3001/api/patients', headers=headers)

print(patients.json())
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@docita.work","password":"password123"}'

# Get patients
curl http://localhost:3001/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

**For API support or bug reports, contact: support@docita.work**
