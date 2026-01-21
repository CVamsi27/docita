import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MedicalHistoryService } from './medical-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../modules/audit/audit.service';

import {
  CreateMedicalConditionDto,
  CreateAllergyDto,
  CreateFamilyHistoryDto,
  CreateSocialHistoryDto,
  CreateSurgicalHistoryDto,
} from './dto/medical-history.dto';

@Controller('patients/:patientId/medical-history')
@UseGuards(JwtAuthGuard)
export class MedicalHistoryController {
  constructor(
    private readonly medicalHistoryService: MedicalHistoryService,
    private readonly auditService: AuditService,
  ) {}

  // ========== Medical Conditions ==========
  @Get('conditions')
  getConditions(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.getConditions(patientId);
  }

  @Post('conditions')
  createCondition(
    @Param('patientId') patientId: string,
    @Body() dto: CreateMedicalConditionDto,
  ) {
    return this.medicalHistoryService.createCondition(patientId, dto);
  }

  @Patch('conditions/:id')
  updateCondition(
    @Param('id') id: string,
    @Body() dto: Partial<CreateMedicalConditionDto>,
  ) {
    return this.medicalHistoryService.updateCondition(id, dto);
  }

  @Delete('conditions/:id')
  deleteCondition(@Param('id') id: string) {
    return this.medicalHistoryService.deleteCondition(id);
  }

  // ========== Allergies ==========
  @Get('allergies')
  getAllergies(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.getAllergies(patientId);
  }

  @Post('allergies')
  createAllergy(
    @Param('patientId') patientId: string,
    @Body() dto: CreateAllergyDto,
  ) {
    return this.medicalHistoryService.createAllergy(patientId, dto);
  }

  @Patch('allergies/:id')
  updateAllergy(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAllergyDto>,
  ) {
    return this.medicalHistoryService.updateAllergy(id, dto);
  }

  @Delete('allergies/:id')
  deleteAllergy(@Param('id') id: string) {
    return this.medicalHistoryService.deleteAllergy(id);
  }

  // ========== Family History ==========
  @Get('family')
  getFamilyHistory(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.getFamilyHistory(patientId);
  }

  @Post('family')
  createFamilyHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateFamilyHistoryDto,
  ) {
    return this.medicalHistoryService.createFamilyHistory(patientId, dto);
  }

  @Patch('family/:id')
  updateFamilyHistory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFamilyHistoryDto>,
  ) {
    return this.medicalHistoryService.updateFamilyHistory(id, dto);
  }

  @Delete('family/:id')
  deleteFamilyHistory(@Param('id') id: string) {
    return this.medicalHistoryService.deleteFamilyHistory(id);
  }

  // ========== Social History ==========
  @Get('social')
  getSocialHistory(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.getSocialHistory(patientId);
  }

  @Post('social')
  createOrUpdateSocialHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateSocialHistoryDto,
  ) {
    return this.medicalHistoryService.createOrUpdateSocialHistory(
      patientId,
      dto,
    );
  }

  @Delete('social')
  deleteSocialHistory(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.deleteSocialHistory(patientId);
  }

  // ========== Surgical History ==========
  @Get('surgical')
  getSurgicalHistory(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.getSurgicalHistory(patientId);
  }

  @Post('surgical')
  createSurgicalHistory(
    @Param('patientId') patientId: string,
    @Body() dto: CreateSurgicalHistoryDto,
  ) {
    return this.medicalHistoryService.createSurgicalHistory(patientId, dto);
  }

  @Patch('surgical/:id')
  updateSurgicalHistory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSurgicalHistoryDto>,
  ) {
    return this.medicalHistoryService.updateSurgicalHistory(id, dto);
  }

  @Delete('surgical/:id')
  deleteSurgicalHistory(@Param('id') id: string) {
    return this.medicalHistoryService.deleteSurgicalHistory(id);
  }

  // ========== Complete Medical History ==========
  @Get()
  async getFullMedicalHistory(
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const clinicId = req.user?.clinicId;
    const ipAddress = req.ip;
    const userAgent = req.headers?.['user-agent'];

    // Log access for audit trail (DPDP Compliance)
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
