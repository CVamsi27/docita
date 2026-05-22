import { VitalSign, Appointment } from '@workspace/db';

export type VitalWithRelations = Pick<
  VitalSign,
  | 'id'
  | 'appointmentId'
  | 'systolicBP'
  | 'diastolicBP'
  | 'pulse'
  | 'temperature'
  | 'spo2'
  | 'respiratoryRate'
  | 'height'
  | 'weight'
  | 'bmi'
  | 'bloodGlucose'
> & {
  appointment: Pick<Appointment, 'patientId' | 'startTime'> & {
    patient: { firstName: string; lastName: string };
  };
};

export type VitalObservationContext = {
  effectiveDateTime: string;
  patientDisplay: string;
  encounterRef: string;
  subjectRef: string;
};
