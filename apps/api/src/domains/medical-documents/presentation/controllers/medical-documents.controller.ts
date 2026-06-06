import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MedicalDocumentsService } from '../../application/services/medical-documents.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { FrontDeskClinicalBlockGuard } from '@/shared/modules/clinic-workspace/front-desk-clinical-block.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';

@Controller('medical-documents')
@UseGuards(TierGuard, FrontDeskClinicalBlockGuard)
@RequireFeature(
  requireFeatureForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS),
)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS))
export class MedicalDocumentsController {
  constructor(
    private readonly service: MedicalDocumentsService,
    private readonly auditService: AuditService,
  ) {}

  private getClinicId(req: RequestWithUser): string {
    const clinicId = req.user?.clinicId;
    if (!clinicId)
      throw new BadRequestException('No clinic associated with this user');
    return clinicId;
  }

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      type: string;
      patientId: string;
      appointmentId?: string;
      title: string;
      content: Record<string, unknown>;
      validFrom?: string;
      validUntil?: string;
      doctorId: string;
      pdfUrl?: string;
    },
  ) {
    const clinicId = this.getClinicId(req);
    return this.service.create({ ...body, clinicId });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithUser,
    @Query('patientId') patientId: string,
  ) {
    const clinicId = this.getClinicId(req);
    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_HISTORY');
    return this.service.findAllForPatient(clinicId, patientId);
  }

  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const clinicId = this.getClinicId(req);
    const doc = await this.service.findOne(id, clinicId);
    await logPatientPhiRead(
      this.auditService,
      req,
      doc.patientId,
      'VIEW_HISTORY',
    );
    return doc;
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const clinicId = this.getClinicId(req);
    return this.service.update(id, clinicId, body);
  }

  @Patch(':id/sign')
  async sign(@Req() req: RequestWithUser, @Param('id') id: string) {
    const clinicId = this.getClinicId(req);
    return this.service.sign(id, clinicId);
  }

  @Patch(':id/revoke')
  async revoke(@Req() req: RequestWithUser, @Param('id') id: string) {
    const clinicId = this.getClinicId(req);
    return this.service.revoke(id, clinicId);
  }

  @Delete(':id')
  async delete(@Req() req: RequestWithUser, @Param('id') id: string) {
    const clinicId = this.getClinicId(req);
    return this.service.delete(id, clinicId);
  }
}
