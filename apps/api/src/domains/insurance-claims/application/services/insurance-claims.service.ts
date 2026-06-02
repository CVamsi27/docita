import { Injectable } from '@nestjs/common';
import type {
  ClaimStatusTransitionInput,
  CreateInsuranceClaimInput,
  UpdateInsuranceClaimInput,
} from '@workspace/types';
import {
  ClaimDocumentSummary,
  InsuranceClaimRecord,
  InsuranceClaimSearchParams,
  PaginatedResult,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';
import { InsuranceClaimsQueryService } from './insurance-claims-query.service';
import { InsuranceClaimsCommandService } from './insurance-claims-command.service';

/** Facade combining the claim query/command services for the controller. */
@Injectable()
export class InsuranceClaimsService {
  constructor(
    private readonly queryService: InsuranceClaimsQueryService,
    private readonly commandService: InsuranceClaimsCommandService,
  ) {}

  findAll(
    params: InsuranceClaimSearchParams,
  ): Promise<PaginatedResult<InsuranceClaimRecord>> {
    return this.queryService.findAll(params);
  }

  findOne(id: string, clinicId: string): Promise<InsuranceClaimRecord> {
    return this.queryService.findOne(id, clinicId);
  }

  findAttachableDocuments(
    id: string,
    clinicId: string,
  ): Promise<ClaimDocumentSummary[]> {
    return this.queryService.findAttachableDocuments(id, clinicId);
  }

  create(
    input: CreateInsuranceClaimInput,
    clinicId: string,
    idempotencyKey?: string,
  ): Promise<InsuranceClaimRecord> {
    return this.commandService.create(input, clinicId, idempotencyKey);
  }

  update(
    id: string,
    clinicId: string,
    dto: UpdateInsuranceClaimInput,
  ): Promise<InsuranceClaimRecord> {
    return this.commandService.update(id, clinicId, dto);
  }

  transition(
    id: string,
    clinicId: string,
    dto: ClaimStatusTransitionInput,
    actorUserId?: string,
  ): Promise<InsuranceClaimRecord> {
    return this.commandService.transition(id, clinicId, dto, actorUserId);
  }

  attachDocument(
    id: string,
    clinicId: string,
    documentId: string,
  ): Promise<InsuranceClaimRecord> {
    return this.commandService.attachDocument(id, clinicId, documentId);
  }
}
