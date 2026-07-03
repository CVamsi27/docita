import type { IClock } from '@/shared/common/ports/clock.port';
import type { QueueTokenWithRelations } from '@/domains/appointments/core/repositories/queue.repository.interface';
import { parseStringEnumMember } from '@workspace/utils';
import {
  formatUtcInstantAsClinicPickerIso,
  getClinicLocalDayUtcBounds,
} from '@workspace/utils';

const QUEUE_TOKEN_TYPES = [
  'scheduled',
  'walk-in',
  'late-arrival',
  'pending',
] as const;

type QueueTokenType = (typeof QUEUE_TOKEN_TYPES)[number];

export function parseQueueTokenType(value: string): QueueTokenType {
  return parseStringEnumMember(QUEUE_TOKEN_TYPES, value) ?? 'pending';
}

export function getTodayRange(clock: IClock, timezone: string) {
  const now = clock.now();
  const pickerDateStr = formatUtcInstantAsClinicPickerIso(now, timezone);
  const bounds = getClinicLocalDayUtcBounds(pickerDateStr, timezone);
  if (bounds) {
    return {
      today: bounds.rangeStart,
      tomorrow: bounds.rangeEndExclusive,
    };
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

export function mapQueueToken(t: QueueTokenWithRelations) {
  return {
    id: t.id,
    clinicId: t.clinicId,
    patientId: t.patientId,
    appointmentId: t.appointmentId,
    doctorId: t.doctorId,
    tokenNumber: t.tokenNumber,
    status: t.status,
    priority: t.priority,
    notes: t.notes,
    calledAt: t.calledAt?.toISOString(),
    completedAt: t.completedAt?.toISOString(),
    createdAt: t.createdAt.toISOString(),
    tokenType: parseQueueTokenType(t.tokenType),
    scheduledTime: t.scheduledTime?.toISOString(),
    estimatedDuration: t.estimatedDuration,
    estimatedWaitTime: t.estimatedWaitTime,
    consultationStart: t.consultationStart?.toISOString(),
    patient: t.patient,
    doctor: t.doctor,
    appointment: t.appointment,
  };
}

export function calcAvgConsultationMinutes(
  completed: Array<{
    consultationStart: Date | null;
    completedAt: Date | null;
  }>,
): number {
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, t) => {
    if (!t.consultationStart || !t.completedAt) return sum;
    return sum + (t.completedAt.getTime() - t.consultationStart.getTime());
  }, 0);
  return Math.round(total / completed.length / 60000);
}
