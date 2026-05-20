import { LabTestOrderStatus } from '@workspace/db';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export class LabOrder {
  constructor(
    public readonly id: string,
    public readonly patientId: string,
    public readonly labTestId: string,
    public readonly status: LabTestOrderStatus,
    public readonly clinicId: string,
    public readonly appointmentId?: string,
    public readonly result?: Record<string, unknown>,
    public readonly resultUrl?: string,
    public readonly notes?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id?: string;
    patientId: string;
    labTestId: string;
    status?: LabTestOrderStatus;
    clinicId: string;
    appointmentId?: string;
    result?: Record<string, unknown>;
    resultUrl?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): LabOrder {
    if (!props.patientId) {
      throw new InvariantViolationError('Patient ID is required');
    }
    if (!props.labTestId) {
      throw new InvariantViolationError('Lab Test ID is required');
    }
    if (!props.clinicId) {
      throw new InvariantViolationError('Clinic ID is required');
    }

    return new LabOrder(
      props.id || '',
      props.patientId,
      props.labTestId,
      props.status || ('ORDERED' as LabTestOrderStatus),
      props.clinicId,
      props.appointmentId,
      props.result,
      props.resultUrl,
      props.notes,
      props.createdAt,
      props.updatedAt,
    );
  }

  update(
    props: {
      status?: LabTestOrderStatus;
      result?: Record<string, unknown>;
      resultUrl?: string;
      notes?: string;
    },
    now: Date,
  ): LabOrder {
    return new LabOrder(
      this.id,
      this.patientId,
      this.labTestId,
      props.status ?? this.status,
      this.clinicId,
      this.appointmentId,
      props.result ?? this.result,
      props.resultUrl ?? this.resultUrl,
      props.notes ?? this.notes,
      this.createdAt,
      now,
    );
  }
}
