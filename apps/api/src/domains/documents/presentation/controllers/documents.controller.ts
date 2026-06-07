// jscpd:ignore-start
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { DocumentsQueryService } from '../../application/services/documents.service';

@Controller('documents')
@UseGuards(TierGuard)
@RequireFeature(
  requireFeatureForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS),
)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS))
export class DocumentsController {
  constructor(
    private readonly documentsQueryService: DocumentsQueryService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('patientId') patientId?: string,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);

    if (patientId) {
      await logPatientPhiRead(
        this.auditService,
        req,
        patientId,
        'VIEW_HISTORY',
      );
    } else {
      await logClinicPhiListRead(
        this.auditService,
        req,
        'VIEW_PATIENT_LIST',
        'Patient',
      );
    }

    return this.documentsQueryService.findAll({
      clinicId,
      search,
      type,
      patientId,
    });
  }

  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const { clinicId } = getClinicStaffRequestContext(req);

    const doc = await this.documentsQueryService.findOne(id, clinicId);

    await logPatientPhiRead(
      this.auditService,
      req,
      doc.patientId,
      'VIEW_HISTORY',
    );

    return doc;
  }
}
