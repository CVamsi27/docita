import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

export interface AppointmentProps {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  consultationNotes?: string;
  observations?: string;
  chiefComplaint?: string;
  treatmentHistory?: string;
  clinicalImpression?: string;
  differentialDiagnosis?: string;
  finalDiagnosis?: string;
  followUpPlan?: string;
  serviceId?: string;
  type?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class Appointment {
  readonly id: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly doctorId: string;
  private startTime: Date;
  private endTime: Date;
  private status: AppointmentStatus;
  private reason?: string;
  private notes?: string;
  private consultationNotes?: string;
  private observations?: string;
  private chiefComplaint?: string;
  private treatmentHistory?: string;
  private clinicalImpression?: string;
  private differentialDiagnosis?: string;
  private finalDiagnosis?: string;
  private followUpPlan?: string;
  private serviceId?: string;
  private type?: string;
  private cancellationReason?: string;
  private cancelledAt?: Date;
  private metadata: Record<string, unknown>;
  readonly createdAt: Date;
  private updatedAt: Date;
  readonly version: number;

  constructor(props: AppointmentProps) {
    this.id = props.id;
    this.clinicId = props.clinicId;
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.status = props.status;
    this.reason = props.reason;
    this.notes = props.notes;
    this.consultationNotes = props.consultationNotes;
    this.observations = props.observations;
    this.chiefComplaint = props.chiefComplaint;
    this.treatmentHistory = props.treatmentHistory;
    this.clinicalImpression = props.clinicalImpression;
    this.differentialDiagnosis = props.differentialDiagnosis;
    this.finalDiagnosis = props.finalDiagnosis;
    this.followUpPlan = props.followUpPlan;
    this.serviceId = props.serviceId;
    this.type = props.type;
    this.cancellationReason = props.cancellationReason;
    this.cancelledAt = props.cancelledAt;
    this.metadata = props.metadata || {};
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.version = props.version;

    this.validate();
  }

  private validate(): void {
    if (this.startTime >= this.endTime) {
      throw new Error('Appointment start time must be before end time');
    }

    if (!this.clinicId || !this.patientId || !this.doctorId) {
      throw new Error('Clinic, Patient, and Doctor IDs are required');
    }
  }

  getStartTime(): Date {
    return this.startTime;
  }

  getEndTime(): Date {
    return this.endTime;
  }

  getStatus(): AppointmentStatus {
    return this.status;
  }

  getReason(): string | undefined {
    return this.reason;
  }

  getType(): string | undefined {
    return this.type;
  }

  getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  reschedule(startTime: Date, endTime: Date): void {
    if (this.status.isCompleted() || this.status.isCancelled()) {
      throw new Error('Cannot reschedule a completed or cancelled appointment');
    }

    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }

    this.startTime = startTime;
    this.endTime = endTime;
    this.updatedAt = new Date();
  }

  cancel(reason: string): void {
    if (this.status.isCompleted()) {
      throw new Error('Cannot cancel a completed appointment');
    }

    if (this.status.isCancelled()) {
      return;
    }

    this.status = AppointmentStatus.cancelled();
    this.cancellationReason = reason;
    this.cancelledAt = new Date();
    this.updatedAt = new Date();
  }

  complete(): void {
    if (this.status.isCancelled()) {
      throw new Error('Cannot complete a cancelled appointment');
    }

    this.status = AppointmentStatus.completed();
    this.updatedAt = new Date();
  }

  toPlain() {
    return {
      id: this.id,
      clinicId: this.clinicId,
      patientId: this.patientId,
      doctorId: this.doctorId,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status.getValue(),
      reason: this.reason,
      notes: this.notes,
      consultationNotes: this.consultationNotes,
      observations: this.observations,
      chiefComplaint: this.chiefComplaint,
      treatmentHistory: this.treatmentHistory,
      clinicalImpression: this.clinicalImpression,
      differentialDiagnosis: this.differentialDiagnosis,
      finalDiagnosis: this.finalDiagnosis,
      followUpPlan: this.followUpPlan,
      serviceId: this.serviceId,
      type: this.type,
      cancellationReason: this.cancellationReason,
      cancelledAt: this.cancelledAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
