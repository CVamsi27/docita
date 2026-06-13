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
    public readonly labId?: string,
    public readonly orderedBy?: string,
    public readonly collectedAt?: Date,
    public readonly completedAt?: Date,
    public readonly resultUploadedBy?: string,
    public readonly resultUploadedAt?: Date,
    public readonly paidAt?: Date,
    public readonly paymentVerifiedBy?: string,
    public readonly paymentMethod?: string,
    public readonly paymentReference?: string,
    public readonly releasedAt?: Date,
    // Read-only relations populated on list/detail reads so the lab worklist
    // can show patient, test, and ordering-doctor names instead of raw ids.
    public readonly patient?: {
      id: string;
      firstName: string;
      lastName: string;
    },
    public readonly labTest?: {
      id: string;
      name: string;
      category: string;
      code?: string;
      price?: number;
    },
    public readonly doctor?: { name: string },
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
    labId?: string;
    orderedBy?: string;
  }): LabOrder {
    if (!props.patientId)
      throw new InvariantViolationError('Patient ID is required');
    if (!props.labTestId)
      throw new InvariantViolationError('Lab Test ID is required');
    if (!props.clinicId)
      throw new InvariantViolationError('Clinic ID is required');

    return new LabOrder(
      props.id || '',
      props.patientId,
      props.labTestId,
      props.status ?? LabTestOrderStatus.ORDERED,
      props.clinicId,
      props.appointmentId,
      props.result,
      props.resultUrl,
      props.notes,
      props.createdAt,
      props.updatedAt,
      props.labId,
      props.orderedBy,
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
      this.labId,
      this.orderedBy,
      this.collectedAt,
      this.completedAt,
      this.resultUploadedBy,
      this.resultUploadedAt,
      this.paidAt,
      this.paymentVerifiedBy,
      this.paymentMethod,
      this.paymentReference,
      this.releasedAt,
    );
  }

  /** A result file has been uploaded by the lab. */
  hasResult(): boolean {
    return Boolean(this.resultUrl);
  }

  /** Payment for this order has been verified at the hospital front desk. */
  isPaid(): boolean {
    return Boolean(this.paidAt);
  }

  isTerminal(): boolean {
    return (
      this.status === LabTestOrderStatus.COMPLETED ||
      this.status === LabTestOrderStatus.CANCELLED
    );
  }

  /**
   * Results may only be released to the patient once the lab has uploaded a
   * result AND the front desk has verified payment. A released/cancelled order
   * cannot be released again.
   */
  canRelease(): boolean {
    return !this.isTerminal() && this.hasResult() && this.isPaid();
  }
}
