/** Handles CRUD for medical conditions and allergies sub-resources. */
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MedicalConditionType,
  ConditionStatus,
  ConditionSeverity,
  AllergyType,
  AllergySeverity,
} from '@workspace/db';
import {
  CreateMedicalConditionInput,
  UpdateMedicalConditionInput,
  CreatePatientAllergyInput,
  UpdatePatientAllergyInput,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { MedicalHistoryFactory } from '@/domains/patients/core/factories/medical-history.factory';

@Injectable()
export class MedicalHistoryConditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly medicalHistoryFactory: MedicalHistoryFactory,
  ) {}

  async getConditions(patientId: string) {
    return this.prisma.patientMedicalCondition.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCondition(patientId: string, dto: CreateMedicalConditionInput) {
    const validated = this.medicalHistoryFactory.createCondition(dto);
    return this.prisma.patientMedicalCondition.create({
      data: {
        patientId,
        conditionName: validated.conditionName,
        icdCode: validated.icdCode,
        conditionType: validated.conditionType as MedicalConditionType,
        status: validated.status as ConditionStatus,
        severity: validated.severity as ConditionSeverity,
        diagnosedDate: validated.diagnosedDate
          ? new Date(validated.diagnosedDate)
          : null,
        resolvedDate: validated.resolvedDate
          ? new Date(validated.resolvedDate)
          : null,
        notes: validated.notes,
        diagnosedBy: validated.diagnosedBy,
      },
    });
  }

  async updateCondition(
    id: string,
    patientId: string,
    dto: UpdateMedicalConditionInput,
  ) {
    const existing = await this.prisma.patientMedicalCondition.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    return this.prisma.patientMedicalCondition.update({
      where: { id },
      data: {
        conditionName: dto.conditionName,
        icdCode: dto.icdCode,
        conditionType: dto.conditionType as MedicalConditionType,
        status: dto.status as ConditionStatus,
        severity: dto.severity as ConditionSeverity,
        diagnosedDate: dto.diagnosedDate
          ? new Date(dto.diagnosedDate)
          : undefined,
        resolvedDate: dto.resolvedDate ? new Date(dto.resolvedDate) : undefined,
        notes: dto.notes,
        diagnosedBy: dto.diagnosedBy,
      },
    });
  }

  async deleteCondition(id: string, patientId: string) {
    const existing = await this.prisma.patientMedicalCondition.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    return this.prisma.patientMedicalCondition.delete({ where: { id } });
  }

  async getAllergies(patientId: string) {
    return this.prisma.patientAllergy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAllergy(patientId: string, dto: CreatePatientAllergyInput) {
    const validated = this.medicalHistoryFactory.createAllergy(dto);
    return this.prisma.patientAllergy.create({
      data: {
        patientId,
        allergen: validated.allergen,
        allergyType: validated.allergyType as AllergyType,
        severity: validated.severity as AllergySeverity,
        reaction: validated.reaction,
        notes: validated.notes,
        onsetDate: validated.onsetDate ? new Date(validated.onsetDate) : null,
      },
    });
  }

  async updateAllergy(
    id: string,
    patientId: string,
    dto: UpdatePatientAllergyInput,
  ) {
    const existing = await this.prisma.patientAllergy.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Allergy with ID ${id} not found`);
    return this.prisma.patientAllergy.update({
      where: { id },
      data: {
        allergen: dto.allergen,
        allergyType: dto.allergyType as AllergyType,
        severity: dto.severity as AllergySeverity,
        reaction: dto.reaction,
        notes: dto.notes,
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
      },
    });
  }

  async deleteAllergy(id: string, patientId: string) {
    const existing = await this.prisma.patientAllergy.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Allergy with ID ${id} not found`);
    return this.prisma.patientAllergy.delete({ where: { id } });
  }
}
