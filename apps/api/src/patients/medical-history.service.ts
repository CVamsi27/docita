import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MedicalConditionType,
  ConditionStatus,
  ConditionSeverity,
  AllergySeverity,
  AllergyType,
  SmokingStatus,
  AlcoholUseStatus,
} from '@workspace/db';

// DTOs
interface CreateMedicalConditionDto {
  conditionName: string;
  icdCode?: string;
  conditionType?: MedicalConditionType;
  status?: ConditionStatus;
  severity?: ConditionSeverity;
  diagnosedDate?: string;
  resolvedDate?: string;
  notes?: string;
  diagnosedBy?: string;
}

interface CreateAllergyDto {
  allergen: string;
  allergyType?: AllergyType;
  severity?: AllergySeverity;
  reaction?: string;
  notes?: string;
  onsetDate?: string;
}

interface CreateFamilyHistoryDto {
  relationship: string;
  condition: string;
  ageAtOnset?: number;
  notes?: string;
}

interface CreateSocialHistoryDto {
  smokingStatus?: SmokingStatus;
  smokingPackYears?: number;
  smokingQuitDate?: string;
  alcoholUse?: AlcoholUseStatus;
  alcoholFrequency?: string;
  substanceUse?: string;
  occupation?: string;
  occupationalHazards?: string;
  exerciseFrequency?: string;
  dietaryRestrictions?: string;
  notes?: string;
}

interface CreateSurgicalHistoryDto {
  procedureName: string;
  procedureDate?: string;
  hospital?: string;
  surgeon?: string;
  complications?: string;
  notes?: string;
}

@Injectable()
export class MedicalHistoryService {
  constructor(private prisma: PrismaService) {}

  // ========== Medical Conditions ==========
  async getConditions(patientId: string) {
    return this.prisma.patientMedicalCondition.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCondition(patientId: string, dto: CreateMedicalConditionDto) {
    return this.prisma.patientMedicalCondition.create({
      data: {
        patientId,
        conditionName: dto.conditionName,
        icdCode: dto.icdCode,
        conditionType: dto.conditionType || 'CHRONIC',
        status: dto.status || 'ACTIVE',
        severity: dto.severity,
        diagnosedDate: dto.diagnosedDate ? new Date(dto.diagnosedDate) : null,
        resolvedDate: dto.resolvedDate ? new Date(dto.resolvedDate) : null,
        notes: dto.notes,
        diagnosedBy: dto.diagnosedBy,
      },
    });
  }

  async updateCondition(id: string, dto: Partial<CreateMedicalConditionDto>) {
    const existing = await this.prisma.patientMedicalCondition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    }

    return this.prisma.patientMedicalCondition.update({
      where: { id },
      data: {
        conditionName: dto.conditionName,
        icdCode: dto.icdCode,
        conditionType: dto.conditionType,
        status: dto.status,
        severity: dto.severity,
        diagnosedDate: dto.diagnosedDate
          ? new Date(dto.diagnosedDate)
          : undefined,
        resolvedDate: dto.resolvedDate ? new Date(dto.resolvedDate) : undefined,
        notes: dto.notes,
        diagnosedBy: dto.diagnosedBy,
      },
    });
  }

  async deleteCondition(id: string) {
    const existing = await this.prisma.patientMedicalCondition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    }

    return this.prisma.patientMedicalCondition.delete({
      where: { id },
    });
  }

  // ========== Allergies ==========
  async getAllergies(patientId: string) {
    return this.prisma.patientAllergy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAllergy(patientId: string, dto: CreateAllergyDto) {
    return this.prisma.patientAllergy.create({
      data: {
        patientId,
        allergen: dto.allergen,
        allergyType: dto.allergyType || 'OTHER',
        severity: dto.severity || 'MODERATE',
        reaction: dto.reaction,
        notes: dto.notes,
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : null,
      },
    });
  }

  async updateAllergy(id: string, dto: Partial<CreateAllergyDto>) {
    const existing = await this.prisma.patientAllergy.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Allergy with ID ${id} not found`);
    }

    return this.prisma.patientAllergy.update({
      where: { id },
      data: {
        allergen: dto.allergen,
        allergyType: dto.allergyType,
        severity: dto.severity,
        reaction: dto.reaction,
        notes: dto.notes,
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
      },
    });
  }

  async deleteAllergy(id: string) {
    const existing = await this.prisma.patientAllergy.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Allergy with ID ${id} not found`);
    }

    return this.prisma.patientAllergy.delete({
      where: { id },
    });
  }

  // ========== Family History ==========
  async getFamilyHistory(patientId: string) {
    return this.prisma.patientFamilyHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFamilyHistory(patientId: string, dto: CreateFamilyHistoryDto) {
    return this.prisma.patientFamilyHistory.create({
      data: {
        patientId,
        relationship: dto.relationship,
        condition: dto.condition,
        ageAtOnset: dto.ageAtOnset,
        notes: dto.notes,
      },
    });
  }

  async updateFamilyHistory(id: string, dto: Partial<CreateFamilyHistoryDto>) {
    const existing = await this.prisma.patientFamilyHistory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Family history with ID ${id} not found`);
    }

    return this.prisma.patientFamilyHistory.update({
      where: { id },
      data: {
        relationship: dto.relationship,
        condition: dto.condition,
        ageAtOnset: dto.ageAtOnset,
        notes: dto.notes,
      },
    });
  }

  async deleteFamilyHistory(id: string) {
    const existing = await this.prisma.patientFamilyHistory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Family history with ID ${id} not found`);
    }

    return this.prisma.patientFamilyHistory.delete({
      where: { id },
    });
  }

  // ========== Social History ==========
  async getSocialHistory(patientId: string) {
    // Social history is a single record per patient
    return this.prisma.patientSocialHistory.findUnique({
      where: { patientId },
    });
  }

  async createOrUpdateSocialHistory(
    patientId: string,
    dto: CreateSocialHistoryDto,
  ) {
    return this.prisma.patientSocialHistory.upsert({
      where: { patientId },
      create: {
        patientId,
        smokingStatus: dto.smokingStatus,
        smokingPackYears: dto.smokingPackYears,
        smokingQuitDate: dto.smokingQuitDate
          ? new Date(dto.smokingQuitDate)
          : null,
        alcoholUse: dto.alcoholUse,
        alcoholFrequency: dto.alcoholFrequency,
        substanceUse: dto.substanceUse,
        occupation: dto.occupation,
        occupationalHazards: dto.occupationalHazards,
        exerciseFrequency: dto.exerciseFrequency,
        dietaryRestrictions: dto.dietaryRestrictions,
        notes: dto.notes,
      },
      update: {
        smokingStatus: dto.smokingStatus,
        smokingPackYears: dto.smokingPackYears,
        smokingQuitDate: dto.smokingQuitDate
          ? new Date(dto.smokingQuitDate)
          : undefined,
        alcoholUse: dto.alcoholUse,
        alcoholFrequency: dto.alcoholFrequency,
        substanceUse: dto.substanceUse,
        occupation: dto.occupation,
        occupationalHazards: dto.occupationalHazards,
        exerciseFrequency: dto.exerciseFrequency,
        dietaryRestrictions: dto.dietaryRestrictions,
        notes: dto.notes,
      },
    });
  }

  async deleteSocialHistory(patientId: string) {
    const existing = await this.prisma.patientSocialHistory.findUnique({
      where: { patientId },
    });
    if (!existing) {
      throw new NotFoundException(
        `Social history for patient ${patientId} not found`,
      );
    }

    return this.prisma.patientSocialHistory.delete({
      where: { patientId },
    });
  }

  // ========== Surgical History ==========
  async getSurgicalHistory(patientId: string) {
    return this.prisma.patientSurgicalHistory.findMany({
      where: { patientId },
      orderBy: { procedureDate: 'desc' },
    });
  }

  async createSurgicalHistory(
    patientId: string,
    dto: CreateSurgicalHistoryDto,
  ) {
    return this.prisma.patientSurgicalHistory.create({
      data: {
        patientId,
        procedureName: dto.procedureName,
        procedureDate: dto.procedureDate ? new Date(dto.procedureDate) : null,
        hospital: dto.hospital,
        surgeon: dto.surgeon,
        complications: dto.complications,
        notes: dto.notes,
      },
    });
  }

  async updateSurgicalHistory(
    id: string,
    dto: Partial<CreateSurgicalHistoryDto>,
  ) {
    const existing = await this.prisma.patientSurgicalHistory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Surgical history with ID ${id} not found`);
    }

    return this.prisma.patientSurgicalHistory.update({
      where: { id },
      data: {
        procedureName: dto.procedureName,
        procedureDate: dto.procedureDate
          ? new Date(dto.procedureDate)
          : undefined,
        hospital: dto.hospital,
        surgeon: dto.surgeon,
        complications: dto.complications,
        notes: dto.notes,
      },
    });
  }

  async deleteSurgicalHistory(id: string) {
    const existing = await this.prisma.patientSurgicalHistory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Surgical history with ID ${id} not found`);
    }

    return this.prisma.patientSurgicalHistory.delete({
      where: { id },
    });
  }

  // ========== Full Medical History ==========
  async getFullMedicalHistory(patientId: string) {
    const [
      conditions,
      allergies,
      familyHistory,
      socialHistory,
      surgicalHistory,
    ] = await Promise.all([
      this.getConditions(patientId),
      this.getAllergies(patientId),
      this.getFamilyHistory(patientId),
      this.getSocialHistory(patientId),
      this.getSurgicalHistory(patientId),
    ]);

    return {
      conditions,
      allergies,
      familyHistory,
      socialHistory,
      surgicalHistory,
    };
  }
}
