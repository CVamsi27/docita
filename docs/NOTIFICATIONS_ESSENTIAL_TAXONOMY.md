# Essential Staff Notifications Taxonomy

This document defines the **in-app staff notifications** contract: what notifications exist, **who receives them**, **when they fire**, and **how they should be prioritized**.

Constraints:
- Treat this system as healthcare-grade. **Do not include PHI in notification payloads** unless strictly required for staff action.
- Keep notification payloads minimal and stable. Prefer `data.{entityId}` references over embedding full entities.
- Route notifications by **action ownership** (front desk vs clinician vs billing) and **clinic tier**.

## Core model

### `StaffNotificationType` (source of truth)
- Stored as enum `StaffNotificationType` in [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma).
- Display is determined by `title` and `message`; `type` is for routing and UI filtering.

### Priority
- `URGENT`: immediate, time-sensitive, patient-impacting workflows.
- `HIGH`: staff action needed soon.
- `NORMAL`: informational/actionable but not time-critical.
- `LOW`: FYI / audit-like.

## Role routing principles
- **Front desk** actions: `RECEPTIONIST`, `ADMIN`, `ADMIN_DOCTOR`
- **Clinical** actions: `DOCTOR`, `ADMIN_DOCTOR`
- **Financial** actions: `ADMIN`, `ADMIN_DOCTOR`
- **System/platform**: `ADMIN`, `ADMIN_DOCTOR`

Routing is centralized in:
- [`apps/api/src/shared/modules/messaging/whatsapp/staff-notification.service.ts`](../apps/api/src/shared/modules/messaging/whatsapp/staff-notification.service.ts) (`getTargetRoles`)

## Tier principles
- The current staff notifications API is guarded behind the WhatsApp access target. If/when this is decoupled, keep the taxonomy unchanged and move gating to guards/feature flags.

## Essential notification sets

### Appointment requests
| Type | When it fires | Who | Priority | `data` payload (minimal) |
|---|---|---|---|---|
| `APPOINTMENT_REQUEST_CREATED` | patient submits request | front desk (+ optionally preferred doctor) | HIGH | `appointmentRequestId`, `patientId`, `preferredDoctorId`, `preferredDate`, `requestedSlotStart`, `requestedSlotEnd` |
| `APPOINTMENT_REQUEST_APPROVED` | request approved & booked | front desk + doctor | NORMAL | `appointmentRequestId`, `appointmentId`, `patientId` |
| `APPOINTMENT_REQUEST_REJECTED` | request rejected | front desk | LOW | `appointmentRequestId`, `patientId` |

### Appointments (status + disruptions)
| Type | When it fires | Who | Priority | Notes |
|---|---|---|---|---|
| `APPOINTMENT_CANCEL` | patient cancels (or system detects) | front desk + doctor | HIGH | already exists |
| `APPOINTMENT_DELAY` | patient says “delay/on the way” | front desk + doctor | HIGH | already exists |
| `APPOINTMENT_RESCHEDULED` | rescheduled after confirmation | front desk + doctor | NORMAL | add when reschedule flow exists |
| `APPOINTMENT_NO_SHOW` | marked no-show | front desk + doctor | NORMAL | helps clinic ops |
| `APPOINTMENT_CONFIRMED` | confirmation received | front desk | LOW | optional (avoid spam) |

### Consultations (only when staff action changes)
| Type | When it fires | Who | Priority | Notes |
|---|---|---|---|---|
| `CONSULTATION_STARTED` | consultation begins | doctor | LOW | optional |
| `CONSULTATION_SIGNED` | clinician finalizes/signs | doctor | LOW | audit-like |
| `CONSULTATION_PENDING_ACTION` | blocking item (e.g. missing signature) | doctor | HIGH | must be actionable |

### Prescriptions
| Type | When it fires | Who | Priority | Notes |
|---|---|---|---|---|
| `PRESCRIPTION_PENDING` | requires approval to send | doctor | HIGH | already exists |
| `PRESCRIPTION_SENT` | successfully delivered | doctor | LOW | avoid spam; use if requested |
| `PRESCRIPTION_FAILED` | delivery failure | doctor + admin doctor | HIGH | actionable |

### Invoices
| Type | When it fires | Who | Priority | Notes |
|---|---|---|---|---|
| `INVOICE_PENDING` | requires approval to send | admin | HIGH | already exists |
| `INVOICE_SENT` | successfully delivered | admin | LOW | optional |
| `INVOICE_FAILED` | delivery failure | admin | HIGH | actionable |

### Payments & plan / billing
| Type | When it fires | Who | Priority | Notes |
|---|---|---|---|---|
| `SUBSCRIPTION_PAYMENT_DUE_SOON` | within N days of due | admin | NORMAL | avoid daily spam; coalesce |
| `SUBSCRIPTION_PAYMENT_OVERDUE` | payment missed | admin | HIGH | actionable |
| `SUBSCRIPTION_PAYMENT_SUCCESS` | payment succeeds | admin | LOW | FYI |
| `SUBSCRIPTION_PAYMENT_FAILED` | payment fails | admin | HIGH | actionable |
| `PAYMENT_PROVIDER_STATUS_UPDATE` | provider async update | admin | NORMAL | include provider + reference ids |

### System
| Type | When it fires | Who | Priority |
|---|---|---|---|
| `SYSTEM_ALERT` | platform/automation warnings | admins | varies |

## UI grouping guidance (for tabs)
- **Appointment requests**: `APPOINTMENT_REQUEST_*`\n+- **Appointments**: `APPOINTMENT_*` (excluding request types)\n+- **Consultations**: `CONSULTATION_*`\n+- **Prescriptions**: `PRESCRIPTION_*`\n+- **Invoices**: `INVOICE_*`\n+- **Payments & plan**: `SUBSCRIPTION_*`, `PAYMENT_PROVIDER_*`\n+- **System**: `SYSTEM_ALERT`\n+
