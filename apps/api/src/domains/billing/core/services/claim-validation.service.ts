import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CLAIM_VALIDATION_REPOSITORY_TOKEN,
  IClaimValidationRepository,
} from '@/domains/billing/core/repositories/claim-validation.repository';

export interface ClaimReadinessResult {
  invoiceId: string;
  appointmentId: string | null;
  requiresClinicalCoding: boolean;
  claimReady: boolean;
  issues: string[];
  summary: {
    diagnoses: number;
    procedures: number;
    uncodedDiagnoses: number;
    uncodedProcedures: number;
  };
}

@Injectable()
export class ClaimValidationService {
  constructor(
    @Inject(CLAIM_VALIDATION_REPOSITORY_TOKEN)
    private readonly repo: IClaimValidationRepository,
  ) {}

  async evaluateClaimReadiness(
    invoiceId: string,
    clinicId?: string,
  ): Promise<ClaimReadinessResult> {
    const invoice = await this.repo.findInvoiceForClaimReadiness(invoiceId);

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (clinicId && invoice.patient?.clinicId !== clinicId) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (!invoice.appointmentId) {
      return {
        invoiceId: invoice.id,
        appointmentId: null,
        requiresClinicalCoding: false,
        claimReady: true,
        issues: [],
        summary: {
          diagnoses: 0,
          procedures: 0,
          uncodedDiagnoses: 0,
          uncodedProcedures: 0,
        },
      };
    }

    const appointment = await this.repo.findAppointmentForClaimReadiness(
      invoice.appointmentId,
    );

    if (!appointment) {
      return {
        invoiceId: invoice.id,
        appointmentId: invoice.appointmentId,
        requiresClinicalCoding: true,
        claimReady: false,
        issues: ['Appointment linked to invoice could not be found.'],
        summary: {
          diagnoses: 0,
          procedures: 0,
          uncodedDiagnoses: 0,
          uncodedProcedures: 0,
        },
      };
    }

    const diagnoses = appointment.diagnoses ?? [];
    const procedures = appointment.procedures ?? [];

    const uncodedDiagnoses = diagnoses.filter((d) => !d.icdCodeId).length;
    const uncodedProcedures = procedures.filter((p) => !p.cptCodeId).length;

    const issues: string[] = [];
    if (diagnoses.length === 0) {
      issues.push('At least one diagnosis is required for claim submission.');
    }
    if (procedures.length === 0) {
      issues.push('At least one procedure is required for claim submission.');
    }
    if (uncodedDiagnoses > 0) {
      issues.push(
        `${uncodedDiagnoses} diagnosis entry/entries are missing ICD codes.`,
      );
    }
    if (uncodedProcedures > 0) {
      issues.push(
        `${uncodedProcedures} procedure entry/entries are missing CPT/HCPCS codes.`,
      );
    }

    return {
      invoiceId: invoice.id,
      appointmentId: appointment.id,
      requiresClinicalCoding: true,
      claimReady: issues.length === 0,
      issues,
      summary: {
        diagnoses: diagnoses.length,
        procedures: procedures.length,
        uncodedDiagnoses,
        uncodedProcedures,
      },
    };
  }

  async assertClaimReady(invoiceId: string, clinicId?: string): Promise<void> {
    const result = await this.evaluateClaimReadiness(invoiceId, clinicId);
    if (result.claimReady) return;

    throw new BadRequestException({
      message: 'Invoice is not ready for claim submission.',
      code: 'CLAIM_VALIDATION_FAILED',
      details: result,
    });
  }
}
