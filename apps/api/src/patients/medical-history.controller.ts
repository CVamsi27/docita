import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MedicalHistoryService } from './medical-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// DTOs for Medical Conditions
interface CreateMedicalConditionDto {
  conditionName: string;
  icdCode?: string;
  conditionType?:
    | 'CHRONIC'
    | 'ACUTE'
    | 'CONGENITAL'
    | 'INFECTIOUS'
    | 'AUTOIMMUNE'
    | 'PSYCHIATRIC'
    | 'OTHER';
  status?: 'ACTIVE' | 'MANAGED' | 'RESOLVED' | 'IN_REMISSION';
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  diagnosedDate?: string;
  resolvedDate?: string;
  notes?: string;
  diagnosedBy?: string;
}

// DTOs for Allergies
interface CreateAllergyDto {
  allergen: string;
  allergyType?:
    | 'DRUG'
    | 'FOOD'
    | 'ENVIRONMENTAL'
    | 'LATEX'
    | 'INSECT'
    | 'CONTRAST'
    | 'OTHER';
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  reaction?: string;
  notes?: string;
  onsetDate?: string;
}

// DTOs for Family History
interface CreateFamilyHistoryDto {
  relationship: string;
  condition: string;
  ageAtOnset?: number;
  notes?: string;
}

// DTOs for Social History
interface CreateSocialHistoryDto {
  smokingStatus?: 'NEVER' | 'FORMER' | 'CURRENT' | 'UNKNOWN';
  smokingPackYears?: number;
  smokingQuitDate?: string;
  alcoholUse?: 'NONE' | 'OCCASIONAL' | 'MODERATE' | 'HEAVY' | 'UNKNOWN';
  alcoholFrequency?: string;
  substanceUse?: string;
  occupation?: string;
  occupationalHazards?: string;
  exerciseFrequency?: string;
  dietaryRestrictions?: string;
  notes?: string;
}

// DTOs for Surgical History
interface CreateSurgicalHistoryDto {
  procedureName: string;
  procedureDate?: string;
  hospital?: string;
  surgeon?: string;
  complications?: string;
  notes?: string;
}

@Controller('patients/:patientId/medical-history')
@UseGuards(JwtAuthGuard)
export class MedicalHistoryController {
  constructor(private readonly medicalHistoryService: MedicalHistoryService) {}

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
  getFullMedicalHistory(@Param('patientId') patientId: string) {
    return this.medicalHistoryService.getFullMedicalHistory(patientId);
  }
}
