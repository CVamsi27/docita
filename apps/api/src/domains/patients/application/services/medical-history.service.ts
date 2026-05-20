import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  PATIENT_PERSISTENCE_PORT,
  type PatientPersistencePort,
} from '@/domains/patients/application/ports/patient-persistence.port';
import { MedicalHistoryFactory } from '@/domains/patients/core/factories/medical-history.factory';
import {
  CreateMedicalConditionInput,
  UpdateMedicalConditionInput,
  CreatePatientAllergyInput,
  UpdatePatientAllergyInput,
  CreatePatientFamilyHistoryInput,
  UpdatePatientFamilyHistoryInput,
  CreatePatientSocialHistoryInput,
  CreatePatientSurgicalHistoryInput,
  UpdatePatientSurgicalHistoryInput,
} from '@workspace/types';
import { AiService } from '@/shared/modules/ai-core/ai.service';
import { AiFactory } from '@/shared/modules/ai-core/factories/ai.factory';
import { SmokingStatus, AlcoholUseStatus } from '@workspace/db';
import { MedicalHistoryConditionsService } from './medical-history-conditions.service';

/**
 * Facade — delegates condition/allergy CRUD to MedicalHistoryConditionsService;
 * other medical-history sections use patient persistence and AI helpers.
 */
@Injectable()
export class MedicalHistoryService {
  constructor(
    @Inject(PATIENT_PERSISTENCE_PORT)
    private readonly persistence: PatientPersistencePort,
    private readonly medicalHistoryFactory: MedicalHistoryFactory,
    private readonly aiService: AiService,
    private readonly aiFactory: AiFactory,
    private readonly conditionsService: MedicalHistoryConditionsService,
  ) {}

  // ── Delegated to MedicalHistoryConditionsService ─────────────────────────

  getConditions(patientId: string) {
    return this.conditionsService.getConditions(patientId);
  }
  createCondition(patientId: string, dto: CreateMedicalConditionInput) {
    return this.conditionsService.createCondition(patientId, dto);
  }
  updateCondition(
    id: string,
    patientId: string,
    dto: UpdateMedicalConditionInput,
  ) {
    return this.conditionsService.updateCondition(id, patientId, dto);
  }
  deleteCondition(id: string, patientId: string) {
    return this.conditionsService.deleteCondition(id, patientId);
  }
  getAllergies(patientId: string) {
    return this.conditionsService.getAllergies(patientId);
  }
  createAllergy(patientId: string, dto: CreatePatientAllergyInput) {
    return this.conditionsService.createAllergy(patientId, dto);
  }
  updateAllergy(id: string, patientId: string, dto: UpdatePatientAllergyInput) {
    return this.conditionsService.updateAllergy(id, patientId, dto);
  }
  deleteAllergy(id: string, patientId: string) {
    return this.conditionsService.deleteAllergy(id, patientId);
  }

  // ── AI summarization ─────────────────────────────────────────────────────

  async summarizeMedicalHistory(patientId: string): Promise<string> {
    const [conditions, allergies, meds] = await Promise.all([
      this.persistence.patientMedicalCondition.findMany({ where: { patientId } }),
      this.persistence.patientAllergy.findMany({ where: { patientId } }),
      this.persistence.prescription.findMany({
        where: { patientId, approvalStatus: 'APPROVED' },
        include: { medications: true },
      }),
    ]);

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
        user: `Medical Conditions: {{conditions}}\nAllergies: {{allergies}}\nActive Medications: {{medications}}\n\nPlease provide a brief clinical summary.`,
      },
      context,
    );

    return this.aiService.generateText(prompt);
  }

  // ── Family history ────────────────────────────────────────────────────────

  async getFamilyHistory(patientId: string) {
    return this.persistence.patientFamilyHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFamilyHistory(
    patientId: string,
    dto: CreatePatientFamilyHistoryInput,
  ) {
    const validated = this.medicalHistoryFactory.createFamilyHistory(dto);
    return this.persistence.patientFamilyHistory.create({
      data: {
        patientId,
        relationship: validated.relationship,
        condition: validated.condition,
        ageAtOnset: validated.ageAtOnset,
        notes: validated.notes,
      },
    });
  }

  async updateFamilyHistory(
    id: string,
    patientId: string,
    dto: UpdatePatientFamilyHistoryInput,
  ) {
    const existing = await this.persistence.patientFamilyHistory.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Family history with ID ${id} not found`);
    return this.persistence.patientFamilyHistory.update({
      where: { id },
      data: {
        relationship: dto.relationship,
        condition: dto.condition,
        ageAtOnset: dto.ageAtOnset,
        notes: dto.notes,
      },
    });
  }

  async deleteFamilyHistory(id: string, patientId: string) {
    const existing = await this.persistence.patientFamilyHistory.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Family history with ID ${id} not found`);
    return this.persistence.patientFamilyHistory.delete({ where: { id } });
  }

  // ── Social history ────────────────────────────────────────────────────────

  async getSocialHistory(patientId: string) {
    return this.persistence.patientSocialHistory.findFirst({ where: { patientId } });
  }

  async createOrUpdateSocialHistory(
    patientId: string,
    dto: CreatePatientSocialHistoryInput,
  ) {
    const validated = this.medicalHistoryFactory.createSocialHistory(dto);
    const socialData = {
      smokingStatus: validated.smokingStatus as SmokingStatus,
      smokingPackYears: validated.smokingPackYears,
      alcoholUse: validated.alcoholUse as AlcoholUseStatus,
      alcoholFrequency: validated.alcoholFrequency,
      substanceUse: validated.substanceUse,
      occupation: validated.occupation,
      occupationalHazards: validated.occupationalHazards,
      exerciseFrequency: validated.exerciseFrequency,
      dietaryRestrictions: validated.dietaryRestrictions,
      notes: validated.notes,
    };
    const smokingQuitDate = validated.smokingQuitDate
      ? new Date(validated.smokingQuitDate)
      : null;

    return this.persistence.$transaction(async (tx) => {
      const existing = await tx.patientSocialHistory.findFirst({
        where: { patientId },
      });
      if (existing) {
        await tx.patientSocialHistory.updateMany({
          where: { patientId },
          data: {
            ...socialData,
            smokingQuitDate: smokingQuitDate ?? undefined,
          },
        });
        return tx.patientSocialHistory.findFirst({
          where: { patientId },
        });
      }
      return tx.patientSocialHistory.create({
        data: {
          patientId,
          ...socialData,
          smokingQuitDate,
        },
      });
    });
  }

  async deleteSocialHistory(patientId: string) {
    return this.persistence.$transaction(async (tx) => {
      const existing = await tx.patientSocialHistory.findFirst({
        where: { patientId },
      });
      if (!existing) {
        throw new NotFoundException(
          `Social history for patient ${patientId} not found`,
        );
      }
      await tx.patientSocialHistory.deleteMany({ where: { patientId } });
      return existing;
    });
  }

  // ── Surgical history ──────────────────────────────────────────────────────

  async getSurgicalHistory(patientId: string) {
    return this.persistence.patientSurgicalHistory.findMany({
      where: { patientId },
      orderBy: { procedureDate: 'desc' },
    });
  }

  async createSurgicalHistory(
    patientId: string,
    dto: CreatePatientSurgicalHistoryInput,
  ) {
    const validated = this.medicalHistoryFactory.createSurgicalHistory(dto);
    return this.persistence.patientSurgicalHistory.create({
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

  async updateSurgicalHistory(
    id: string,
    patientId: string,
    dto: UpdatePatientSurgicalHistoryInput,
  ) {
    const existing = await this.persistence.patientSurgicalHistory.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Surgical history with ID ${id} not found`);
    return this.persistence.patientSurgicalHistory.update({
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

  async deleteSurgicalHistory(id: string, patientId: string) {
    const existing = await this.persistence.patientSurgicalHistory.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Surgical history with ID ${id} not found`);
    return this.persistence.patientSurgicalHistory.delete({ where: { id } });
  }

  // ── Composite ─────────────────────────────────────────────────────────────

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
