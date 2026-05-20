import { AppointmentStatus } from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import {
  findFirstSchedulingConflict,
  intervalsOverlap,
  type AppointmentTimeSlot,
} from '@/domains/appointments/core/domain-services/appointment-interval-overlap';
import type { DentalChartData, JsonValue } from '@workspace/types';

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
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  reviewOfSystems?: string;
  provisionalDiagnosis?: string;
  treatmentHistory?: string;
  treatmentPlan?: string;
  clinicalImpression?: string;
  differentialDiagnosis?: string;
  finalDiagnosis?: string;
  followUpPlan?: string;
  generalExamination?: unknown;
  systemicExamination?: unknown;
  investigations?: unknown;
  growthData?: unknown;
  ophthalmologyExam?: unknown;
  cardiologyExam?: unknown;
  gynecologyExam?: unknown;
  dermatologyExam?: unknown;
  psychiatryExam?: unknown;
  dentalChart?: DentalChartData;
  serviceId?: string;
  type?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  metadata?: Record<string, JsonValue | undefined>;
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
  private historyOfPresentIllness?: string;
  private pastMedicalHistory?: string;
  private reviewOfSystems?: string;
  private provisionalDiagnosis?: string;
  private treatmentHistory?: string;
  private treatmentPlan?: string;
  private clinicalImpression?: string;
  private differentialDiagnosis?: string;
  private finalDiagnosis?: string;
  private followUpPlan?: string;
  private generalExamination?: unknown;
  private systemicExamination?: unknown;
  private investigations?: unknown;
  private growthData?: unknown;
  private ophthalmologyExam?: unknown;
  private cardiologyExam?: unknown;
  private gynecologyExam?: unknown;
  private dermatologyExam?: unknown;
  private psychiatryExam?: unknown;
  private dentalChart?: DentalChartData;
  private serviceId?: string;
  private type?: string;
  private cancellationReason?: string;
  private cancelledAt?: Date;
  private metadata: Record<string, JsonValue | undefined>;
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
    this.historyOfPresentIllness = props.historyOfPresentIllness;
    this.pastMedicalHistory = props.pastMedicalHistory;
    this.reviewOfSystems = props.reviewOfSystems;
    this.provisionalDiagnosis = props.provisionalDiagnosis;
    this.treatmentHistory = props.treatmentHistory;
    this.treatmentPlan = props.treatmentPlan;
    this.clinicalImpression = props.clinicalImpression;
    this.differentialDiagnosis = props.differentialDiagnosis;
    this.finalDiagnosis = props.finalDiagnosis;
    this.followUpPlan = props.followUpPlan;
    this.generalExamination = props.generalExamination;
    this.systemicExamination = props.systemicExamination;
    this.investigations = props.investigations;
    this.growthData = props.growthData;
    this.ophthalmologyExam = props.ophthalmologyExam;
    this.cardiologyExam = props.cardiologyExam;
    this.gynecologyExam = props.gynecologyExam;
    this.dermatologyExam = props.dermatologyExam;
    this.psychiatryExam = props.psychiatryExam;
    this.dentalChart = props.dentalChart;
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

  getDentalChart(): DentalChartData | undefined {
    return this.dentalChart;
  }

  getMetadata(): Record<string, JsonValue | undefined> {
    return { ...this.metadata };
  }

  overlapsInterval(startTime: Date, endTime: Date): boolean {
    return intervalsOverlap(
      this.startTime,
      this.endTime,
      startTime,
      endTime,
    );
  }

  static findFirstSchedulingConflict(
    candidateStart: Date,
    candidateEnd: Date,
    existing: readonly AppointmentTimeSlot[],
    excludeAppointmentId?: string,
  ): AppointmentTimeSlot | undefined {
    return findFirstSchedulingConflict(
      candidateStart,
      candidateEnd,
      existing,
      excludeAppointmentId,
    );
  }

  reschedule(startTime: Date, endTime: Date, now: Date): void {
    if (this.status.isCompleted() || this.status.isCancelled()) {
      throw new Error('Cannot reschedule a completed or cancelled appointment');
    }

    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }

    this.startTime = startTime;
    this.endTime = endTime;
    this.updatedAt = now;
  }

  cancel(reason: string, now: Date): void {
    if (this.status.isCompleted()) {
      throw new Error('Cannot cancel a completed appointment');
    }

    if (this.status.isCancelled()) {
      return;
    }

    this.status = AppointmentStatus.cancelled();
    this.cancellationReason = reason;
    this.cancelledAt = now;
    this.updatedAt = now;
  }

  complete(now: Date): void {
    if (this.status.isCancelled()) {
      throw new Error('Cannot complete a cancelled appointment');
    }

    this.status = AppointmentStatus.completed();
    this.updatedAt = now;
  }

  /** Ensures Nest/Express JSON responses include all clinical fields (not only enumerable ctor props). */
  toJSON() {
    return this.toPlain();
  }

  toPlain() {
    return {
      id: this.id,
      clinicId: this.clinicId,
      patientId: this.patientId,
      doctorId: this.doctorId,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status.toJSON(),
      reason: this.reason,
      notes: this.notes,
      consultationNotes: this.consultationNotes,
      observations: this.observations,
      chiefComplaint: this.chiefComplaint,
      historyOfPresentIllness: this.historyOfPresentIllness,
      pastMedicalHistory: this.pastMedicalHistory,
      reviewOfSystems: this.reviewOfSystems,
      provisionalDiagnosis: this.provisionalDiagnosis,
      treatmentHistory: this.treatmentHistory,
      treatmentPlan: this.treatmentPlan,
      clinicalImpression: this.clinicalImpression,
      differentialDiagnosis: this.differentialDiagnosis,
      finalDiagnosis: this.finalDiagnosis,
      followUpPlan: this.followUpPlan,
      generalExamination: this.generalExamination,
      systemicExamination: this.systemicExamination,
      investigations: this.investigations,
      growthData: this.growthData,
      ophthalmologyExam: this.ophthalmologyExam,
      cardiologyExam: this.cardiologyExam,
      gynecologyExam: this.gynecologyExam,
      dermatologyExam: this.dermatologyExam,
      psychiatryExam: this.psychiatryExam,
      dentalChart: this.dentalChart,
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
