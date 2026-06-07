// jscpd:ignore-start
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { MedicalHistoryService } from '@/domains/patients/application/services/medical-history.service';
import { Role } from '@workspace/db';
import { PatientsBasicManagementAccess } from '@/domains/patients/presentation/controllers/patients.controller.access';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import {
  auditViewHistory,
  verifyMedicalHistoryPatientAccess,
} from '@/domains/patients/presentation/controllers/medical-history-controller.helpers';
import {
  CreateFamilyHistoryDto,
  UpdateFamilyHistoryDto,
  CreateSocialHistoryDto,
  CreateSurgicalHistoryDto,
  UpdateSurgicalHistoryDto,
} from '@/domains/patients/application/dto/medical-history.dto';

@Controller('patients/:patientId/medical-history')
@PatientsBasicManagementAccess(
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.DOCTOR,
  Role.NURSE,
  Role.PATIENT,
)
export class MedicalHistoryExtendedController {
  constructor(
    private readonly medicalHistoryService: MedicalHistoryService,
    private readonly auditService: AuditService,
    private readonly patientService: PatientService,
  ) {}

  private verifyAccess(patientId: string, req: RequestWithUser) {
    return verifyMedicalHistoryPatientAccess(
      patientId,
      req,
      this.patientService,
    );
  }

  private auditView(patientId: string, req: RequestWithUser) {
    return auditViewHistory(patientId, req, this.auditService);
  }

  @Get('family')
// jscpd:ignore-end
  async getFamilyHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    await this.auditView(patientId, req);
    return this.medicalHistoryService.getFamilyHistory(patientId);
  }

  @Post('family')
  async createFamilyHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateFamilyHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.createFamilyHistory(patientId, dto);
  }

  @Patch('family/:id')
  async updateFamilyHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.updateFamilyHistory(id, patientId, dto);
  }

  @Delete('family/:id')
  async deleteFamilyHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.deleteFamilyHistory(id, patientId);
  }

  @Get('social')
  async getSocialHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    await this.auditView(patientId, req);
    return this.medicalHistoryService.getSocialHistory(patientId);
  }

  @Post('social')
  async createOrUpdateSocialHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateSocialHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.createOrUpdateSocialHistory(
      patientId,
      dto,
    );
  }

  @Delete('social')
  async deleteSocialHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.deleteSocialHistory(patientId);
  }

  @Get('surgical')
  async getSurgicalHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    await this.auditView(patientId, req);
    return this.medicalHistoryService.getSurgicalHistory(patientId);
  }

  @Post('surgical')
  async createSurgicalHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateSurgicalHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.createSurgicalHistory(patientId, dto);
  }

  @Patch('surgical/:id')
  async updateSurgicalHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSurgicalHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.updateSurgicalHistory(id, patientId, dto);
  }

  @Delete('surgical/:id')
  async deleteSurgicalHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.deleteSurgicalHistory(id, patientId);
  }
}
