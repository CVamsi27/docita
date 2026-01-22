import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MedicalHistoryFactory } from './factories/medical-history.factory';
import {
  MedicalConditionInput,
  AllergyInput,
  FamilyHistoryInput,
  SocialHistoryInput,
  SurgicalHistoryInput,
} from './schemas/medical-history.schema';
import { AiService } from '../ai-core/ai.service';
import { AiFactory } from '../ai-core/factories/ai.factory';

@Injectable()
export class MedicalHistoryService {
  constructor(
    private prisma: PrismaService,
    private medicalHistoryFactory: MedicalHistoryFactory,
    private aiService: AiService,
    private aiFactory: AiFactory, // Used for creating prompts
  ) {}

  /**
   * Generates a clinical summary of the patient's medical history using AI.
   */
  async summarizeMedicalHistory(patientId: string): Promise<string> {
    const conditions = await this.prisma.patientMedicalCondition.findMany({
      where: { patientId },
    });
    const allergies = await this.prisma.patientAllergy.findMany({
      where: { patientId },
    });
    const meds = await this.prisma.prescription.findMany({
      where: { patientId, approvalStatus: 'APPROVED' }, // Only approved meds
      include: { medications: true },
    });

    // Prepare context
    const context = {
      conditions: conditions
        .map((c) => `${c.conditionName} (${c.status})`)
        .join(', '),
      allergies: allergies
        .map((a) => `${a.allergen} (${a.reaction})`)
        .join(', '),
      medications: meds
        .flatMap((p) => p.medications.map((m) => m.name))
        .join(', '),
    };

    const prompt = this.aiFactory.createPrompt(
      {
        system:
          'You are a clinical assistant. Summarize the following patient history into a concise paragraph suitable for a doctor to read quickly.',
        user: `
          Medical Conditions: {{conditions}}
          Allergies: {{allergies}}
          Active Medications: {{medications}}
          
          Please provide a brief clinical summary.
        `,
      },
      context,
    );

    return this.aiService.generateText(prompt);
  }

  // ========== Medical Conditions ==========
  async getConditions(patientId: string) {
    return this.prisma.patientMedicalCondition.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCondition(patientId: string, dto: MedicalConditionInput) {
    // Validate and set defaults via factory
    const validated = this.medicalHistoryFactory.createCondition(dto);

    return this.prisma.patientMedicalCondition.create({
      data: {
        patientId,
        conditionName: validated.conditionName,
        icdCode: validated.icdCode,
        conditionType: validated.conditionType,
        status: validated.status,
        severity: validated.severity,
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

  async updateCondition(id: string, dto: Partial<MedicalConditionInput>) {
    const existing = await this.prisma.patientMedicalCondition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    }

    // Partial validation or manual mapping since factory is for full creation
    // For updates, we trust the DTO partiality but could add partial schema later

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

  async createAllergy(patientId: string, dto: AllergyInput) {
    const validated = this.medicalHistoryFactory.createAllergy(dto);

    return this.prisma.patientAllergy.create({
      data: {
        patientId,
        allergen: validated.allergen,
        allergyType: validated.allergyType,
        severity: validated.severity,
        reaction: validated.reaction,
        notes: validated.notes,
        onsetDate: validated.onsetDate ? new Date(validated.onsetDate) : null,
      },
    });
  }

  async updateAllergy(id: string, dto: Partial<AllergyInput>) {
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

  async createFamilyHistory(patientId: string, dto: FamilyHistoryInput) {
    const validated = this.medicalHistoryFactory.createFamilyHistory(dto);

    return this.prisma.patientFamilyHistory.create({
      data: {
        patientId,
        relationship: validated.relationship,
        condition: validated.condition,
        ageAtOnset: validated.ageAtOnset,
        notes: validated.notes,
      },
    });
  }

  async updateFamilyHistory(id: string, dto: Partial<FamilyHistoryInput>) {
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
    return this.prisma.patientSocialHistory.findUnique({
      where: { patientId },
    });
  }

  async createOrUpdateSocialHistory(
    patientId: string,
    dto: SocialHistoryInput,
  ) {
    const validated = this.medicalHistoryFactory.createSocialHistory(dto);

    return this.prisma.patientSocialHistory.upsert({
      where: { patientId },
      create: {
        patientId,
        smokingStatus: validated.smokingStatus,
        smokingPackYears: validated.smokingPackYears,
        smokingQuitDate: validated.smokingQuitDate
          ? new Date(validated.smokingQuitDate)
          : null,
        alcoholUse: validated.alcoholUse,
        alcoholFrequency: validated.alcoholFrequency,
        substanceUse: validated.substanceUse,
        occupation: validated.occupation,
        occupationalHazards: validated.occupationalHazards,
        exerciseFrequency: validated.exerciseFrequency,
        dietaryRestrictions: validated.dietaryRestrictions,
        notes: validated.notes,
      },
      update: {
        smokingStatus: validated.smokingStatus,
        smokingPackYears: validated.smokingPackYears,
        smokingQuitDate: validated.smokingQuitDate
          ? new Date(validated.smokingQuitDate)
          : undefined,
        alcoholUse: validated.alcoholUse,
        alcoholFrequency: validated.alcoholFrequency,
        substanceUse: validated.substanceUse,
        occupation: validated.occupation,
        occupationalHazards: validated.occupationalHazards,
        exerciseFrequency: validated.exerciseFrequency,
        dietaryRestrictions: validated.dietaryRestrictions,
        notes: validated.notes,
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

  async createSurgicalHistory(patientId: string, dto: SurgicalHistoryInput) {
    const validated = this.medicalHistoryFactory.createSurgicalHistory(dto);

    return this.prisma.patientSurgicalHistory.create({
      data: {
        patientId,
        procedureName: validated.procedureName,
        procedureDate: validated.procedureDate
          ? new Date(validated.procedureDate)
          : null,
        hospital: validated.hospital,
        surgeon: validated.surgeon,
        complications: validated.complications,
        notes: validated.notes,
      },
    });
  }

  async updateSurgicalHistory(id: string, dto: Partial<SurgicalHistoryInput>) {
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
