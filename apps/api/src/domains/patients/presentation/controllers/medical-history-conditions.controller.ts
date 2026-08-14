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
  UseGuards,
} from '@nestjs/common';
import { MedicalHistoryService } from '@/domains/patients/application/services/medical-history.service';
import { ConsentType, Role } from '@workspace/db';
import { PatientsBasicManagementAccess } from '@/domains/patients/presentation/controllers/patients.controller.access';
import {
  ConsentGuard,
  RequirePatientConsent,
} from '@/shared/modules/auth/guards/consent.guard';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import {
  auditViewHistory,
  verifyMedicalHistoryPatientAccess,
} from '@/domains/patients/presentation/controllers/medical-history-controller.helpers';
import {
  CreateMedicalConditionDto,
  UpdateMedicalConditionDto,
  CreateAllergyDto,
  UpdateAllergyDto,
} from '@/domains/patients/application/dto/medical-history.dto';

@Controller('patients/:patientId/medical-history')
@PatientsBasicManagementAccess(
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.DOCTOR,
  Role.NURSE,
  Role.PATIENT,
)
// Writes below carry @RequirePatientConsent(TREATMENT); enforcement is opt-in per
// clinic (Clinic.settings.requireTreatmentConsent), so it never blocks by default.
@UseGuards(ConsentGuard)
export class MedicalHistoryConditionsController {
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

  @Get()
  // jscpd:ignore-end
  async getFullMedicalHistory(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    await this.auditView(patientId, req);
    return this.medicalHistoryService.getFullMedicalHistory(patientId);
  }

  @Get('conditions')
  async getConditions(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    await this.auditView(patientId, req);
    return this.medicalHistoryService.getConditions(patientId);
  }

  @RequirePatientConsent(ConsentType.TREATMENT)
  @Post('conditions')
  async createCondition(
    @Param('patientId') patientId: string,
    @Body() dto: CreateMedicalConditionDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.createCondition(patientId, dto);
  }

  @RequirePatientConsent(ConsentType.TREATMENT)
  @Patch('conditions/:id')
  async updateCondition(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalConditionDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.updateCondition(id, patientId, dto);
  }

  @RequirePatientConsent(ConsentType.TREATMENT)
  @Delete('conditions/:id')
  async deleteCondition(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.deleteCondition(id, patientId);
  }

  @Get('allergies')
  async getAllergies(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    await this.auditView(patientId, req);
    return this.medicalHistoryService.getAllergies(patientId);
  }

  @RequirePatientConsent(ConsentType.TREATMENT)
  @Post('allergies')
  async createAllergy(
    @Param('patientId') patientId: string,
    @Body() dto: CreateAllergyDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.createAllergy(patientId, dto);
  }

  @RequirePatientConsent(ConsentType.TREATMENT)
  @Patch('allergies/:id')
  async updateAllergy(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAllergyDto,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.updateAllergy(id, patientId, dto);
  }

  @RequirePatientConsent(ConsentType.TREATMENT)
  @Delete('allergies/:id')
  async deleteAllergy(
    @Param('patientId') patientId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.verifyAccess(patientId, req);
    return this.medicalHistoryService.deleteAllergy(id, patientId);
  }
}
