import type { MedicationDoseSource, MedicationDoseStatus } from '@workspace/db';

export const DOSE_INSERT_BATCH_SIZE = 500;
export const MAX_GENERATED_DOSES = 5000;

type ScheduledDoseDraft = {
  scheduledAt: Date;
  medicationId: string;
  patientId: string;
  clinicId: string;
  prescriptionId: string;
  status: MedicationDoseStatus;
  source: MedicationDoseSource;
};

type BuildScheduledDosesResult = {
  doses: ScheduledDoseDraft[];
  truncated: boolean;
};

export function buildScheduledDoses(input: {
  startDate: Date;
  durationDays: number;
  dosesPerDay: number;
  medicationId: string;
  patientId: string;
  clinicId: string;
  prescriptionId: string;
}): BuildScheduledDosesResult {
  const {
    startDate,
    durationDays,
    dosesPerDay,
    medicationId,
    patientId,
    clinicId,
    prescriptionId,
  } = input;

  const dayStep = dosesPerDay < 1 ? Math.round(1 / dosesPerDay) : 1;
  const perDay = Math.max(1, Math.round(dosesPerDay));
  const intervalHours = 24 / perDay;

  const doses: ScheduledDoseDraft[] = [];
  let truncated = false;

  for (let day = 0; day < durationDays; day += dayStep) {
    for (let dose = 0; dose < perDay; dose++) {
      if (doses.length >= MAX_GENERATED_DOSES) {
        truncated = true;
        break;
      }

      const scheduledAt = new Date(startDate);
      scheduledAt.setDate(scheduledAt.getDate() + day);
      scheduledAt.setHours(
        scheduledAt.getHours() + Math.round(dose * intervalHours),
      );

      doses.push({
        scheduledAt,
        medicationId,
        patientId,
        clinicId,
        prescriptionId,
        status: 'PENDING',
        source: 'SYSTEM_GENERATED',
      });
    }

    if (truncated) break;
  }

  return { doses, truncated };
}

export function chunkDoseDrafts<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}
