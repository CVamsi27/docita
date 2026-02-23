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
  NotFoundException,
} from '@nestjs/common';
import { MedicalHistoryService } from './medical-history.service';
import { Role } from '@workspace/db';
import { Roles } from '../../shared/modules/auth/auth/roles.decorator';
import { AuditService } from '../../shared/modules/audit/audit/audit.service';
import { RequestWithUser } from '../../common/types/common.types';
import { PatientsService } from './patients.service';

import {
  CreateMedicalConditionDto,
  CreateAllergyDto,
  CreateFamilyHistoryDto,
  CreateSocialHistoryDto,
  CreateSurgicalHistoryDto,
} from './dto/medical-history.dto';

@Controller('patients/:patientId/medical-history')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
export class MedicalHistoryController {
  constructor(
    private readonly medicalHistoryService: MedicalHistoryService,
    private readonly auditService: AuditService,
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * Verify the patient belongs to the requesting user's clinic
   */
  private async verifyPatientAccess(
    patientId: string,
    req: RequestWithUser,
  ): Promise<void> {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new NotFoundException('Clinic context required');
    await this.patientsService.findOne(patientId, clinicId);
  }

  // ========== Medical Conditions ==========
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
    @Body() dto: Partial<CreateMedicalConditionDto>,
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

  // ========== Allergies ==========
  @Get('allergies')
  async getAllergies(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyPatientAccess(patientId, req);
    return this.medicalHistoryService.getAllergies(patientId);
  }

  @Post('allergies')
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
    @Body() dto: Partial<CreateAllergyDto>,
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

  // ========== Family History ==========
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
    @Body() dto: Partial<CreateFamilyHistoryDto>,
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

  // ========== Social History ==========
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

  // ========== Surgical History ==========
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
    @Body() dto: Partial<CreateSurgicalHistoryDto>,
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

  // ========== Complete Medical History ==========
  @Get()
  async getFullMedicalHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
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
