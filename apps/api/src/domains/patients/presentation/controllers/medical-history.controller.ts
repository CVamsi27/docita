import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { MedicalHistoryService } from '@/domains/patients/application/services/medical-history.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { RequestWithUser } from '@/common/types/common.types';
import { PatientService } from '@/domains/patients/application/services/patient.service';

import {
  CreateMedicalConditionDto,
  UpdateMedicalConditionDto,
  CreateAllergyDto,
  UpdateAllergyDto,
  CreateFamilyHistoryDto,
  UpdateFamilyHistoryDto,
  CreateSocialHistoryDto,
  CreateSurgicalHistoryDto,
  UpdateSurgicalHistoryDto,
} from '@/domains/patients/application/dto/medical-history.dto';

@Controller('patients/:patientId/medical-history')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
export class MedicalHistoryController {
  constructor(
    private readonly medicalHistoryService: MedicalHistoryService,
    private readonly auditService: AuditService,
    private readonly patientService: PatientService,
  ) {}

  private async verifyPatientAccess(
    patientId: string,
    req: RequestWithUser,
  ): Promise<void> {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new NotFoundException('Clinic context required');
    await this.patientService.getPatient(patientId, clinicId);
  }

  @Get('conditions')
  async getConditions(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.getConditions(patientId);
  }

  @Post('conditions')
  async createCondition(
    @Param('patientId') patientId: string,
    @Body() dto: CreateMedicalConditionDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.createCondition(patientId, dto);
  }

  @Patch('conditions/:id')
  async updateCondition(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalConditionDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.updateCondition(id, dto);
  }

  @Delete('conditions/:id')
  async deleteCondition(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.deleteCondition(id);
  }

  @Get('allergies')
  async getAllergies(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.getAllergies(patientId);
  }
  async createAllergy(
    @Param('patientId') patientId: string,
    @Body() dto: CreateAllergyDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.createAllergy(patientId, dto);
  }

  @Patch('allergies/:id')
  async updateAllergy(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAllergyDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.updateAllergy(id, dto);
  }

  @Delete('allergies/:id')
  async deleteAllergy(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.deleteAllergy(id);
  }

  @Get('family')
  async getFamilyHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.getFamilyHistory(patientId);
  }

  @Post('family')
  async createFamilyHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateFamilyHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.createFamilyHistory(patientId, dto);
  }

  @Patch('family/:id')
  async updateFamilyHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.updateFamilyHistory(id, dto);
  }

  @Delete('family/:id')
  async deleteFamilyHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.deleteFamilyHistory(id);
  }

  @Get('social')
  async getSocialHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.getSocialHistory(patientId);
  }

  @Post('social')
  async createOrUpdateSocialHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateSocialHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
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
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.deleteSocialHistory(patientId);
  }

  @Get('surgical')
  async getSurgicalHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.getSurgicalHistory(patientId);
  }

  @Post('surgical')
  async createSurgicalHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateSurgicalHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.createSurgicalHistory(patientId, dto);
  }

  @Patch('surgical/:id')
  async updateSurgicalHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSurgicalHistoryDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.updateSurgicalHistory(id, dto);
  }

  @Delete('surgical/:id')
  async deleteSurgicalHistory(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.deleteSurgicalHistory(id);
  }

  @Get()
  async getFullMedicalHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    const clinicId = req.user?.clinicId;
    const ipAddress = req.ip;
    const userAgent = req.headers?.['user-agent'];

    if (userId && clinicId) {
      await this.auditService.logPatientAccess(
        userId,
        clinicId,
        patientId,
        'VIEW_HISTORY',
        ipAddress,
        userAgent,
      );
    }

    return this.medicalHistoryService.getFullMedicalHistory(patientId);
  }
}
