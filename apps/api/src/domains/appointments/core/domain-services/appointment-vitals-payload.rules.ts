import type { VitalSign } from '@workspace/db';

/** Whitelisted vital sign fields persisted on `VitalSign` rows. */
export type AppointmentVitalsPayload = {
  height?: VitalSign['height'];
  weight?: VitalSign['weight'];
  bloodPressure?: VitalSign['bloodPressure'];
  systolicBP?: VitalSign['systolicBP'];
  diastolicBP?: VitalSign['diastolicBP'];
  pulse?: VitalSign['pulse'];
  temperature?: VitalSign['temperature'];
  spo2?: VitalSign['spo2'];
  bloodGlucose?: VitalSign['bloodGlucose'];
  notes?: VitalSign['notes'];
  painScore?: VitalSign['painScore'];
  respiratoryRate?: VitalSign['respiratoryRate'];
  bmi?: VitalSign['bmi'];
  headCircumference?: VitalSign['headCircumference'];
  waistCircumference?: VitalSign['waistCircumference'];
  oxygenFlowRate?: VitalSign['oxygenFlowRate'];
  oxygenDelivery?: VitalSign['oxygenDelivery'];
  bpPosition?: VitalSign['bpPosition'];
  bpMigrationStatus?: VitalSign['bpMigrationStatus'];
};

/** Whitelist vital sign fields persisted on `VitalSign` rows. */
export function cleanVitalsPayload(
  data: Partial<VitalSign>,
): AppointmentVitalsPayload {
  return {
    height: data.height,
    weight: data.weight,
    bloodPressure: data.bloodPressure,
    systolicBP: data.systolicBP,
    diastolicBP: data.diastolicBP,
    pulse: data.pulse,
    temperature: data.temperature,
    spo2: data.spo2,
    bloodGlucose: data.bloodGlucose,
    notes: data.notes,
    painScore: data.painScore,
    respiratoryRate: data.respiratoryRate,
    bmi: data.bmi,
    headCircumference: data.headCircumference,
    waistCircumference: data.waistCircumference,
    oxygenFlowRate: data.oxygenFlowRate,
    oxygenDelivery: data.oxygenDelivery,
    bpPosition: data.bpPosition,
    bpMigrationStatus: data.bpMigrationStatus,
  };
}

export interface VitalsNumericMetricDefinition {
  key: string;
  label: string;
  unit?: string;
  value: number;
}

/** Numeric vitals mapped to patient metric definitions (Prisma-free). */
export function buildVitalsNumericMetricDefinitions(
  vitals: AppointmentVitalsPayload,
): VitalsNumericMetricDefinition[] {
  const mappings: Array<{
    key: string;
    label: string;
    unit?: string;
    value?: number | null;
  }> = [
    { key: 'height', label: 'Height', unit: 'cm', value: vitals.height },
    { key: 'weight', label: 'Weight', unit: 'kg', value: vitals.weight },
    {
      key: 'systolic_bp',
      label: 'Systolic BP',
      unit: 'mmHg',
      value: vitals.systolicBP,
    },
    {
      key: 'diastolic_bp',
      label: 'Diastolic BP',
      unit: 'mmHg',
      value: vitals.diastolicBP,
    },
    { key: 'pulse', label: 'Pulse', unit: 'bpm', value: vitals.pulse },
    {
      key: 'respiratory_rate',
      label: 'Respiratory Rate',
      unit: 'breaths/min',
      value: vitals.respiratoryRate,
    },
    {
      key: 'temperature',
      label: 'Temperature',
      unit: '°C',
      value: vitals.temperature,
    },
    { key: 'spo2', label: 'SpO2', unit: '%', value: vitals.spo2 },
    {
      key: 'pain_score',
      label: 'Pain Score',
      unit: 'score',
      value: vitals.painScore,
    },
    {
      key: 'blood_glucose',
      label: 'Blood Glucose',
      unit: 'mg/dL',
      value: vitals.bloodGlucose,
    },
  ];

  return mappings.filter(
    (metric): metric is VitalsNumericMetricDefinition =>
      typeof metric.value === 'number' && !Number.isNaN(metric.value),
  );
}
