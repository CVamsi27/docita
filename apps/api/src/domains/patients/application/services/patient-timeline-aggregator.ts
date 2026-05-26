import { formatChiefComplaintSummary } from '@workspace/utils';

export type TimelineEventType =
  | 'APPOINTMENT'
  | 'PRESCRIPTION'
  | 'METRIC_RECORD'
  | 'LAB_TEST'
  | 'MEDICAL_DOCUMENT'
  | 'FOLLOW_UP'
  | 'IMMUNIZATION'
  | 'ADMISSION'
  | 'MEDICATION_DOSE';

export interface TimelineEvent {
  type: TimelineEventType;
  id: string;
  date: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
}

export function mapAppointments(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      startTime: Date;
      chiefComplaint: string | null;
      finalDiagnosis: string | null;
      status: string;
      type: string;
      treatmentPlan: string | null;
      observations: string | null;
      doctor?: { name: string } | null;
      vitalSign?: {
        systolicBP: number | null;
        diastolicBP: number | null;
        pulse: number | null;
        temperature: number | null;
        spo2: number | null;
        weight: number | null;
        height: number | null;
      } | null;
      prescription?: {
        medications?: Array<{
          name: string;
          dosage: string;
          frequency: string;
        }>;
      } | null;
      diagnoses?: Array<{
        icdCode?: { code: string; description: string } | null;
        notes: string | null;
        isPrimary: boolean;
      }>;
    }>
  ).map((a) => ({
    type: 'APPOINTMENT' as TimelineEventType,
    id: a.id,
    date: a.startTime.toISOString(),
    title:
      formatChiefComplaintSummary(a.chiefComplaint) ?? `${a.type} Appointment`,
    description: a.finalDiagnosis ?? null,
    metadata: {
      status: a.status,
      type: a.type,
      doctorName: a.doctor?.name ?? null,
      observations: a.observations ?? null,
      treatmentPlan: a.treatmentPlan ?? null,
      vitals: a.vitalSign
        ? {
            bp:
              a.vitalSign.systolicBP && a.vitalSign.diastolicBP
                ? `${a.vitalSign.systolicBP}/${a.vitalSign.diastolicBP}`
                : null,
            pulse: a.vitalSign.pulse,
            temp: a.vitalSign.temperature,
            spo2: a.vitalSign.spo2,
            weight: a.vitalSign.weight,
            height: a.vitalSign.height,
          }
        : null,
      medications:
        a.prescription?.medications?.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })) ?? [],
      diagnoses:
        a.diagnoses?.map((d) => ({
          code: d.icdCode?.code,
          description: d.icdCode?.description ?? d.notes,
          isPrimary: d.isPrimary,
        })) ?? [],
    },
  }));
}

export function mapPrescriptions(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      date: Date;
      medications: Array<{ name: string }>;
    }>
  ).map((p) => ({
    type: 'PRESCRIPTION' as TimelineEventType,
    id: p.id,
    date: p.date.toISOString(),
    title: `Prescription (${p.medications.length} medication${p.medications.length !== 1 ? 's' : ''})`,
    description: p.medications.map((m) => m.name).join(', ') || null,
    metadata: {
      medicationCount: p.medications.length,
      medications: p.medications.map((m) => m.name),
    },
  }));
}

export function mapMetricRecords(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      recordedAt: Date;
      values: Array<{ definition: { label: string } }>;
    }>
  ).map((r) => ({
    type: 'METRIC_RECORD' as TimelineEventType,
    id: r.id,
    date: r.recordedAt.toISOString(),
    title: 'Health Metrics Recorded',
    description: r.values.map((v) => v.definition.label).join(', ') || null,
    metadata: { metricsCount: r.values.length },
  }));
}

export function mapLabTests(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      createdAt: Date;
      status: string;
      completedAt: Date | null;
      labTest: { name: string; category: string | null };
    }>
  ).map((l) => ({
    type: 'LAB_TEST' as TimelineEventType,
    id: l.id,
    date: l.createdAt.toISOString(),
    title: l.labTest.name,
    description: l.labTest.category ?? null,
    metadata: { status: l.status, completedAt: l.completedAt },
  }));
}

export function mapMedicalDocuments(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      createdAt: Date;
    }>
  ).map((d) => ({
    type: 'MEDICAL_DOCUMENT' as TimelineEventType,
    id: d.id,
    date: d.createdAt.toISOString(),
    title: d.title,
    description: d.type.replace(/_/g, ' '),
    metadata: { documentType: d.type, status: d.status },
  }));
}

export function mapFollowUps(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      reason: string;
      scheduledDate: Date;
      status: string;
    }>
  ).map((f) => ({
    type: 'FOLLOW_UP' as TimelineEventType,
    id: f.id,
    date: f.scheduledDate.toISOString(),
    title: `Follow-up: ${f.reason}`,
    description: null,
    metadata: { status: f.status },
  }));
}

export function mapImmunizations(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      vaccineName: string;
      administeredDate: Date;
      lotNumber: string | null;
      notes: string | null;
    }>
  ).map((i) => ({
    type: 'IMMUNIZATION' as TimelineEventType,
    id: i.id,
    date: i.administeredDate.toISOString(),
    title: `Immunization: ${i.vaccineName}`,
    description: i.notes ?? null,
    metadata: { lotNumber: i.lotNumber },
  }));
}

export function mapAdmissions(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      admittedAt: Date;
      dischargedAt: Date | null;
      reason: string | null;
      diagnosis: string | null;
      status: string;
    }>
  ).map((a) => ({
    type: 'ADMISSION' as TimelineEventType,
    id: a.id,
    date: a.admittedAt.toISOString(),
    title: `Admission: ${a.reason ?? 'Hospital Admission'}`,
    description: a.diagnosis ?? null,
    metadata: { status: a.status, dischargedAt: a.dischargedAt },
  }));
}

export function mapMedicationDoses(items: unknown[]): TimelineEvent[] {
  return (
    items as Array<{
      id: string;
      takenAt: Date | null;
      scheduledAt: Date;
      status: string;
      notes: string | null;
      doseAmount: string | null;
      source: string;
      medication: { name: string };
    }>
  ).map((d) => ({
    type: 'MEDICATION_DOSE' as TimelineEventType,
    id: d.id,
    date: (d.takenAt ?? d.scheduledAt).toISOString(),
    title: `${d.medication.name} - ${d.status.toLowerCase()}`,
    description: d.notes ?? null,
    metadata: {
      status: d.status,
      doseAmount: d.doseAmount,
      source: d.source,
    },
  }));
}

export function sortAndSummarize(allEvents: TimelineEvent[]): {
  sorted: TimelineEvent[];
  summary: Partial<Record<TimelineEventType, number>>;
} {
  allEvents.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const summary: Partial<Record<TimelineEventType, number>> = {};
  for (const event of allEvents) {
    summary[event.type] = (summary[event.type] ?? 0) + 1;
  }

  return { sorted: allEvents, summary };
}

export function buildAdherenceMap(
  groupedCounts: Array<{
    medicationId: string;
    status: string;
    _count: { status: number };
  }>,
): Map<string, number | null> {
  const aggregateMap = new Map<string, { taken: number; total: number }>();
  for (const row of groupedCounts) {
    const current = aggregateMap.get(row.medicationId) ?? {
      taken: 0,
      total: 0,
    };
    const count = row._count.status;
    current.total += count;
    if (row.status === 'TAKEN' || row.status === 'ADMINISTERED') {
      current.taken += count;
    }
    aggregateMap.set(row.medicationId, current);
  }

  const result = new Map<string, number | null>();
  for (const [medicationId, counts] of aggregateMap.entries()) {
    result.set(
      medicationId,
      counts.total > 0 ? (counts.taken / counts.total) * 100 : null,
    );
  }
  return result;
}
