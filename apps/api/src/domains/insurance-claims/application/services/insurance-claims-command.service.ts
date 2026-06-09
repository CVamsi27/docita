import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@workspace/db';
import type {
  ClaimStatusTransitionInput,
  CreateInsuranceClaimInput,
  UpdateInsuranceClaimInput,
} from '@workspace/types';
import {
  CLAIM_VALIDATION_PORT,
  type IClaimValidation,
} from '@/domains/insurance-claims/application/ports/claim-validation.port';
import {
  IInsuranceClaimRepository,
  INSURANCE_CLAIM_REPOSITORY_TOKEN,
  InsuranceClaimRecord,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';
import { InsuranceClaim } from '@/domains/insurance-claims/core/entities/insurance-claim.entity';
import { ClaimStatusEnum } from '@/domains/insurance-claims/core/value-objects/claim-status.value-object';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class InsuranceClaimsCommandService {
  constructor(
    @Inject(INSURANCE_CLAIM_REPOSITORY_TOKEN)
    private readonly repository: IInsuranceClaimRepository,
    @Inject(CLAIM_VALIDATION_PORT)
    private readonly claimValidationService: IClaimValidation,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async create(
    input: CreateInsuranceClaimInput,
    clinicId: string,
    idempotencyKey?: string,
  ): Promise<InsuranceClaimRecord> {
    if (idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(
        idempotencyKey,
        clinicId,
      );
      if (existing) return existing;
    }

    const belongs = await this.repository.patientBelongsToClinic(
      input.patientId,
      clinicId,
    );
    if (!belongs) {
      throw new NotFoundException(`Patient ${input.patientId} not found`);
    }
    this.assertCreateShape(input);
    await this.assertReferencesBelongToPatientClinic(input, clinicId);

    const data: Prisma.InsuranceClaimUncheckedCreateInput = {
      claimType: input.claimType,
      status: ClaimStatusEnum.DRAFT,
      insurerName: input.insurerName,
      tpaName: input.tpaName ?? null,
      policyNumber: input.policyNumber,
      groupNumber: input.groupNumber ?? null,
      currency: input.currency ?? 'INR',
      claimedAmountCents: input.claimedAmountCents,
      notes: input.notes ?? null,
      idempotencyKey: idempotencyKey ?? null,
      patientId: input.patientId,
      clinicId,
      appointmentId: input.appointmentId ?? null,
      invoiceId: input.invoiceId ?? null,
      parentClaimId: input.parentClaimId ?? null,
    };

    return this.repository.create(data);
  }

  async update(
    id: string,
    clinicId: string,
    dto: UpdateInsuranceClaimInput,
  ): Promise<InsuranceClaimRecord> {
    const current = await this.requireClaim(id, clinicId);
    if (current.status !== ClaimStatusEnum.DRAFT)
      throw new BadRequestException(
        'Only draft insurance claims can be edited.',
      );

    const { version, ...rest } = dto;
    this.assertCreateShape({
      claimType: rest.claimType ?? current.claimType,
      invoiceId:
        rest.invoiceId === undefined ? current.invoiceId : rest.invoiceId,
    });
    if (rest.parentClaimId === id)
      throw new BadRequestException('A claim cannot be its own parent.');
    await this.assertReferencesBelongToPatientClinic(
      {
        patientId: current.patientId,
        appointmentId: rest.appointmentId,
        invoiceId: rest.invoiceId,
        parentClaimId: rest.parentClaimId,
      },
      clinicId,
    );

    const data: Prisma.InsuranceClaimUncheckedUpdateManyInput = {
      ...(rest.claimType !== undefined && { claimType: rest.claimType }),
      ...(rest.insurerName !== undefined && { insurerName: rest.insurerName }),
      ...(rest.tpaName !== undefined && { tpaName: rest.tpaName }),
      ...(rest.policyNumber !== undefined && {
        policyNumber: rest.policyNumber,
      }),
      ...(rest.groupNumber !== undefined && { groupNumber: rest.groupNumber }),
      ...(rest.currency !== undefined && { currency: rest.currency }),
      ...(rest.claimedAmountCents !== undefined && {
        claimedAmountCents: rest.claimedAmountCents,
      }),
      ...(rest.notes !== undefined && { notes: rest.notes }),
      ...(rest.invoiceId !== undefined && { invoiceId: rest.invoiceId }),
      ...(rest.appointmentId !== undefined && {
        appointmentId: rest.appointmentId,
      }),
      ...(rest.parentClaimId !== undefined && {
        parentClaimId: rest.parentClaimId,
      }),
    };

    const updated = await this.repository.update(id, clinicId, version, data);
    if (!updated)
      throw new ConflictException(
        'Insurance claim was modified by another request. Reload and retry.',
      );
    return updated;
  }

  async transition(
    id: string,
    clinicId: string,
    dto: ClaimStatusTransitionInput,
    actorUserId?: string,
  ): Promise<InsuranceClaimRecord> {
    const current = await this.requireClaim(id, clinicId);

    // Reuse the billing claim-readiness gate (ICD/CPT coding) before submission.
    if (dto.targetStatus === ClaimStatusEnum.SUBMITTED && current.invoiceId) {
      await this.claimValidationService.assertClaimReady(
        current.invoiceId,
        clinicId,
      );
    }

    const entity = new InsuranceClaim({
      id: current.id,
      claimType: current.claimType,
      status: current.status,
      claimedAmountCents: current.claimedAmountCents,
      approvedAmountCents: current.approvedAmountCents,
      patientResponsibilityCents: current.patientResponsibilityCents,
      submittedAt: current.submittedAt,
      respondedAt: current.respondedAt,
      settledAt: current.settledAt,
    });

    const result = entity.transitionTo(dto.targetStatus, {
      now: this.clock.now(),
      approvedAmountCents: dto.approvedAmountCents,
      patientResponsibilityCents: dto.patientResponsibilityCents,
      denialReason: dto.denialReason,
    });

    const data: Prisma.InsuranceClaimUncheckedUpdateManyInput = {
      status: result.status,
      ...(result.submittedAt ? { submittedAt: result.submittedAt } : {}),
      ...(result.respondedAt ? { respondedAt: result.respondedAt } : {}),
      ...(result.settledAt ? { settledAt: result.settledAt } : {}),
      ...(result.approvedAmountCents !== undefined
        ? { approvedAmountCents: result.approvedAmountCents }
        : {}),
      ...(result.patientResponsibilityCents !== undefined
        ? { patientResponsibilityCents: result.patientResponsibilityCents }
        : {}),
      ...(result.denialReason !== undefined
        ? { denialReason: result.denialReason }
        : {}),
    };

    const updated = await this.repository.transition(
      id,
      clinicId,
      dto.version,
      data,
      {
        fromStatus: current.status,
        toStatus: result.status,
        actorUserId: actorUserId ?? null,
        note: dto.note ?? null,
        amountCents: result.approvedAmountCents ?? null,
      },
    );
    if (!updated)
      throw new ConflictException(
        'Insurance claim was modified by another request. Reload and retry.',
      );

    return updated;
  }

  async attachDocument(
    id: string,
    clinicId: string,
    documentId: string,
  ): Promise<InsuranceClaimRecord> {
    const claim = await this.requireClaim(id, clinicId);
    const attached = await this.repository.attachDocument(
      claim.id,
      clinicId,
      claim.patientId,
      documentId,
    );
    if (!attached) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return this.requireClaim(id, clinicId);
  }

  private assertCreateShape(
    input: Pick<CreateInsuranceClaimInput, 'claimType' | 'invoiceId'>,
  ): void {
    if (input.claimType === 'REIMBURSEMENT' && !input.invoiceId)
      throw new BadRequestException(
        'Reimbursement claims must be linked to a final invoice.',
      );
  }

  private async assertReferencesBelongToPatientClinic(
    input: {
      patientId: string;
      appointmentId?: string | null;
      invoiceId?: string | null;
      parentClaimId?: string | null;
    },
    clinicId: string,
  ): Promise<void> {
    const referencesAreScoped =
      await this.repository.referencesBelongToPatientClinic({
        ...input,
        clinicId,
      });
    if (!referencesAreScoped)
      throw new NotFoundException(
        'One or more insurance claim references were not found for this patient and clinic.',
      );
  }

  private async requireClaim(
    id: string,
    clinicId: string,
  ): Promise<InsuranceClaimRecord> {
    const claim = await this.repository.findById(id, clinicId);
    if (!claim) {
      throw new NotFoundException(`Insurance claim ${id} not found`);
    }
    return claim;
  }
}
