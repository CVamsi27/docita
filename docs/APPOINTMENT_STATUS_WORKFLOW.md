# Appointment Status Workflow

This document explains how appointment statuses change throughout the application lifecycle.

## Status Flow Diagram

```
┌─────────────┐
│  scheduled  │ ← Initial state when appointment is created
└──────┬──────┘
       │
       │ (1) Check-in via Queue
       ↓
┌─────────────┐
│  confirmed  │ ← Patient checked into queue/waiting
└──────┬──────┘
       │
       │ (2) Start Consultation
       ↓
┌─────────────┐
│ in-progress │ ← Doctor is currently seeing the patient
└──────┬──────┘
       │
       │ (3) Save Clinical Notes
       ↓
┌─────────────┐
│  completed  │ ← Consultation finished
└─────────────┘

Alternative Flows:
┌─────────────┐
│  scheduled  │
└──────┬──────┘
       │
       ├─ (Manual) → cancelled
       │
       └─ (Manual) → no-show
```

## 1. SCHEDULED → CONFIRMED

**When**: Patient checks into the queue system  
**Where**: Queue Check-in

### Backend Implementation

**File**: [`apps/api/src/queue/queue.service.ts`](../apps/api/src/queue/queue.service.ts)

```typescript
// Line 238
async checkInAppointment(clinicId: string, appointmentId: string) {
  // ... validation logic ...
  
  // Create queue token
  const queueToken = await this.prisma.queueToken.create({
    data: {
      clinicId: appointment.clinicId,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      tokenNumber,
      priority: 0,
      status: 'waiting',
      tokenType,
      scheduledTime: isLate ? null : scheduledTime,
      estimatedDuration: settings.avgConsultationMinutes,
      notes: isLate
        ? `Late arrival (scheduled: ${scheduledTime.toLocaleTimeString()})`
        : null,
    },
  });

  // Update appointment status to confirmed (Line 318-321)
  await this.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'confirmed' },
  });

  return queueToken;
}
```

**API Endpoint**: `POST /api/queue/check-in/:appointmentId`

**File**: [`apps/api/src/queue/queue.controller.ts`](../apps/api/src/queue/queue.controller.ts)

```typescript
// Line 125
@Post('check-in/:appointmentId')
checkInAppointment(
  @Body('clinicId') clinicId: string,
  @Param('appointmentId') appointmentId: string,
) {
  return this.queueService.checkInAppointment(clinicId, appointmentId);
}
```

### Frontend Implementation

**File**: [`apps/app/app/(protected)/appointments/page.tsx`](../apps/app/app/(protected)/appointments/page.tsx)

```typescript
// Line 148
const handleCheckIn = useCallback(
  async (appointmentId: string) => {
    setCheckingIn(appointmentId);
    try {
      const response = await fetch(`/api/queue/check-in/${appointmentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to check in");
      }

      toast.success("Patient checked in to queue");
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to check in",
      );
    } finally {
      setCheckingIn(null);
    }
  },
  [refetch],
);
```

**UI Button**: Check-in button appears on scheduled appointments in the appointments list

---

## 2. CONFIRMED → IN-PROGRESS

**When**: Doctor starts seeing the patient  
**Where**: Queue Management or Consultation Start

### Backend Implementation

**File**: [`apps/api/src/queue/queue.service.ts`](../apps/api/src/queue/queue.service.ts)

```typescript
// Line 345 - When updating queue token status
if (data.status === 'in-progress') {
  updateData.calledAt = now;
  updateData.consultationStart = now;

  // Sync with appointment (Line 351-355)
  if (token.appointmentId) {
    await this.prisma.appointment.update({
      where: { id: token.appointmentId },
      data: { status: 'in-progress' },
    });
  }
}
```

**Also triggered by "Call Next Patient"**:

```typescript
// Line 470 - callNextPatient() method
async callNextPatient(clinicId: string, doctorId?: string) {
  // ... logic to find next patient ...
  
  if (scheduledToken) {
    return this.update(scheduledToken.id, { status: 'in-progress' });
  }
  
  if (walkInToken) {
    return this.update(walkInToken.id, { status: 'in-progress' });
  }
  
  if (anyWaiting) {
    return this.update(anyWaiting.id, { status: 'in-progress' });
  }
  
  return null;
}
```

**API Endpoint**: `PATCH /api/queue/:id`

### Frontend Implementation

**File**: [`apps/app/app/(protected)/queue/page.tsx`](../apps/app/app/(protected)/queue/page.tsx)

```typescript
// Line 57
const handleUpdateStatus = async (id: string, status: string) => {
  try {
    const response = await fetch(`${API_URL}/queue/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("docita_token")}`,
      },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      const statusMessages: Record<string, string> = {
        "in-progress": "Patient called for consultation",
        completed: "Consultation marked as completed",
        "no-show": "Patient marked as no-show",
        cancelled: "Appointment cancelled",
      };
      toast.success(statusMessages[status] || "Status updated");
      handleRefresh();
    }
  } catch (error) {
    toast.error("Failed to update status");
  }
};
```

**File**: [`apps/app/components/queue/queue-table.tsx`](../apps/app/components/queue/queue-table.tsx)

```typescript
// Line 320 - Start Consultation Button
{item.status === "waiting" && (
  <Button
    size="sm"
    className="gap-1"
    onClick={() => onUpdateStatus(item.id, "in-progress")}
    asChild
  >
    <Link
      href={
        item.appointmentId
          ? `/consultation/${item.appointmentId}?from=queue`
          : `/patients/${item.patientId}?from=queue`
      }
    >
      <Stethoscope className="h-4 w-4" />
      Start Consultation
    </Link>
  </Button>
)}
```

**UI Location**: "Start Consultation" button in Queue Management page

---

## 3. IN-PROGRESS → COMPLETED

**When**: Doctor saves clinical documentation  
**Where**: Consultation page (auto-complete)

### Backend Implementation

**File**: [`apps/api/src/appointments/appointments.service.ts`](../apps/api/src/appointments/appointments.service.ts)

```typescript
// Line 233 - Auto-completion logic in update() method
// Check if clinical documentation fields are being saved
// Auto-completion criteria:
// 1. Appointment status must be 'in-progress'
// 2. At least one clinical documentation field is being saved
// 3. Clinical documentation fields include:
//    - chiefComplaint
//    - historyOfPresentIllness
//    - provisionalDiagnosis
//    - finalDiagnosis
//    - treatmentPlan
//    - clinicalImpression
const clinicalDocFields = [
  'chiefComplaint',
  'historyOfPresentIllness',
  'provisionalDiagnosis',
  'finalDiagnosis',
  'treatmentPlan',
  'clinicalImpression',
];

const hasClinicalDoc = clinicalDocFields.some(
  (field) => dataRecord[field] !== undefined && dataRecord[field] !== '',
);

// If clinical documentation is being saved, check if we should auto-complete
let shouldAutoComplete = false;
if (hasClinicalDoc) {
  const currentAppointment = await this.prisma.appointment.findUnique({
    where: { id },
    select: { status: true },
  });
  
  if (currentAppointment?.status === 'in-progress') {
    shouldAutoComplete = true;
  }
}

const updateData: Prisma.AppointmentUpdateInput = {
  ...(rest as object),
  // ... other fields ...
  
  // Auto-complete if saving clinical documentation for in-progress appointment
  ...(shouldAutoComplete && { status: 'completed' }),
};

const appointment = await this.prisma.appointment.update({
  where: { id },
  data: updateData,
  // ... select fields ...
});

// Also update queue token status if exists (Line 348-356)
if (shouldAutoComplete) {
  await this.prisma.queueToken.updateMany({
    where: {
      appointmentId: id,
      status: 'in-progress',
    },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });
}
```

**API Endpoint**: `PATCH /api/appointments/:id`

### Frontend Implementation

**File**: [`apps/app/components/consultation/clinical-documentation.tsx`](../apps/app/components/consultation/clinical-documentation.tsx)

When any clinical documentation form is saved (Chief Complaint, Treatment Plan, etc.), the data is sent to the appointment update endpoint. The backend automatically detects if clinical documentation is being saved and changes the status to "completed" if the appointment is currently "in-progress".

**No explicit status change call is needed from the frontend** - it's handled automatically by the backend logic.

---

## 4. Manual Status Changes

### CANCELLED

**When**: Staff manually cancels an appointment  
**Where**: Appointments page

**File**: [`apps/app/app/(protected)/appointments/page.tsx`](../apps/app/app/(protected)/appointments/page.tsx)

```typescript
// Line 178
const handleCancelAppointment = async () => {
  if (!cancellingAptId) return;
  try {
    await updateAppointmentMutation.mutateAsync({
      status: "cancelled",
    });
    toast.success("Appointment cancelled successfully");
    refetch();
  } catch {
    toast.error("Failed to cancel appointment");
  }
};
```

**API Endpoint**: `PATCH /api/appointments/:id` with `{ status: "cancelled" }`

### NO-SHOW

**When**: Patient doesn't arrive for appointment  
**Where**: Appointments page

```typescript
// Line 188
const handleNoShowAppointment = async () => {
  if (!noShowAptId) return;
  try {
    await updateAppointmentMutation.mutateAsync({
      status: "no-show",
    });
    toast.success("Appointment marked as no-show");
    refetch();
  } catch {
    toast.error("Failed to mark appointment as no-show");
  }
};
```

**API Endpoint**: `PATCH /api/appointments/:id` with `{ status: "no-show" }`

---

## Summary Table

| Transition | Trigger | Location | Automatic/Manual |
|------------|---------|----------|------------------|
| scheduled → confirmed | Check-in | Queue check-in | Manual (staff) |
| confirmed → in-progress | Start consultation | Queue management / Consultation start | Manual (doctor) |
| in-progress → completed | Save clinical notes | Consultation page | **Automatic** |
| scheduled → cancelled | Cancel appointment | Appointments page | Manual (staff) |
| scheduled → no-show | Mark no-show | Appointments page | Manual (staff) |

---

## Database Schema

**Appointment Model** (`packages/db/prisma/schema.prisma`):

```prisma
model Appointment {
  id                    String    @id @default(cuid())
  patientId             String
  doctorId              String
  clinicId              String
  startTime             DateTime
  endTime               DateTime
  status                String    // scheduled, confirmed, in-progress, completed, cancelled, no-show
  type                  String
  // ... other fields
}
```

**QueueToken Model** (synced with Appointment status):

```prisma
model QueueToken {
  id              String    @id @default(cuid())
  appointmentId   String?   @unique
  status          String    // waiting, in-progress, completed, no-show, cancelled
  consultationStart DateTime?
  completedAt     DateTime?
  // ... other fields
}
```

---

## Key Points

1. **Queue and Appointment are synchronized**: When queue token status changes, the associated appointment status is updated automatically

2. **Auto-completion is smart**: The system automatically marks appointments as completed when clinical documentation is saved during an in-progress consultation

3. **No manual completion needed**: Doctors don't need to remember to mark appointments as completed - it happens automatically when they save their clinical notes

4. **Status changes are logged**: All status changes can be tracked through the appointment history

5. **Queue token lifecycle mirrors appointment lifecycle**: Both maintain consistent status throughout the workflow
