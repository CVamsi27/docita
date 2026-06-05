import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IInsuranceClaimRepository,
  INSURANCE_CLAIM_REPOSITORY_TOKEN,
  ClaimDocumentSummary,
  InsuranceClaimRecord,
  InsuranceClaimSearchParams,
  PaginatedResult,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';

// AuditLogged: read-only — PHI access is audited in the controller layer.
@Injectable()
export class InsuranceClaimsQueryService {
  constructor(
    @Inject(INSURANCE_CLAIM_REPOSITORY_TOKEN)
    private readonly repository: IInsuranceClaimRepository,
  ) {}

  findAll(
    params: InsuranceClaimSearchParams,
  ): Promise<PaginatedResult<InsuranceClaimRecord>> {
    return this.repository.findAll(params);
  }

  async findOne(id: string, clinicId: string): Promise<InsuranceClaimRecord> {
    const claim = await this.repository.findById(id, clinicId);
    if (!claim) {
      throw new NotFoundException(`Insurance claim ${id} not found`);
    }
    return claim;
  }

  async findAttachableDocuments(
    id: string,
    clinicId: string,
  ): Promise<ClaimDocumentSummary[]> {
    const claim = await this.findOne(id, clinicId);
    return this.repository.findAttachableDocuments(claim.patientId, clinicId);
  }
}
