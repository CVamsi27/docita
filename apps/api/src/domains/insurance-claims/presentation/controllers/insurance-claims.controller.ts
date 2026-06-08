import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { RequiresIdempotency } from '@/shared/modules/idempotency';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import { InsuranceClaimsService } from '@/domains/insurance-claims/application/services/insurance-claims.service';
import {
  AttachClaimDocumentDto,
  AttachableClaimDocumentsResponseDto,
  ClaimStatusTransitionDto,
  CreateInsuranceClaimDto,
  InsuranceClaimResponseDto,
  ListInsuranceClaimsQueryDto,
  PaginatedInsuranceClaimResponseDto,
  UpdateInsuranceClaimDto,
} from '@/domains/insurance-claims/application/dto/insurance-claims.dto';

@Controller('insurance-claims')
@UseGuards(TierGuard)
@RequireFeature(Feature.INSURANCE_BILLING)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class InsuranceClaimsController {
  constructor(
    private readonly claimsService: InsuranceClaimsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ZodSerializerDto(PaginatedInsuranceClaimResponseDto)
  async findAll(
    @Request() req: RequestWithUser,
    @Query() query?: ListInsuranceClaimsQueryDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    const { patientId, invoiceId, status, claimType, search, cursor, limit } =
      // jscpd:ignore-start
      query ?? {};

    if (patientId) {
      await logPatientPhiRead(
        this.auditService,
        req,
        patientId,
        'VIEW_PROFILE',
      );
    } else {
      await logClinicPhiListRead(
        this.auditService,
        req,
        'VIEW_PATIENT_LIST',
        'Patient',
        { scope: 'insurance-claims', status, claimType, search, cursor, limit },
        // jscpd:ignore-end
      );
    }

    return this.claimsService.findAll({
      clinicId,
      patientId,
      invoiceId,
      status,
      claimType,
      search,
      cursor,
      limit,
    });
  }

  @Get(':id')
  @ZodSerializerDto(InsuranceClaimResponseDto)
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);
    const claim = await this.claimsService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      claim.patientId,
      'VIEW_PROFILE',
    );
    return claim;
  }

  @Get(':id/attachable-documents')
  @ZodSerializerDto(AttachableClaimDocumentsResponseDto)
  async findAttachableDocuments(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    const claim = await this.claimsService.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      claim.patientId,
      'VIEW_HISTORY',
    );
    return this.claimsService.findAttachableDocuments(id, clinicId);
  }

  @Post()
  @RequiresIdempotency()
  @ZodSerializerDto(InsuranceClaimResponseDto)
  create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateInsuranceClaimDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.claimsService.create(dto, clinicId);
  }

  @Patch(':id')
  @ZodSerializerDto(InsuranceClaimResponseDto)
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceClaimDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.claimsService.update(id, clinicId, dto);
  }

  @Post(':id/transition')
  @ZodSerializerDto(InsuranceClaimResponseDto)
  transition(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: ClaimStatusTransitionDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.claimsService.transition(id, clinicId, dto, userId);
  }

  @Post(':id/documents')
  @ZodSerializerDto(InsuranceClaimResponseDto)
  attachDocument(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: AttachClaimDocumentDto,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.claimsService.attachDocument(id, clinicId, dto.documentId);
  }
}
