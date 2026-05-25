/** Handles CRUD for medical conditions and allergies sub-resources. */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import {
  CreateMedicalConditionInput,
  UpdateMedicalConditionInput,
  CreatePatientAllergyInput,
  UpdatePatientAllergyInput,
} from '@workspace/types';
import {
  DOMAIN_TO_PRISMA_ALLERGY_SEVERITY,
  DOMAIN_TO_PRISMA_ALLERGY_TYPE,
  DOMAIN_TO_PRISMA_CONDITION_SEVERITY,
  DOMAIN_TO_PRISMA_CONDITION_STATUS,
  DOMAIN_TO_PRISMA_MEDICAL_CONDITION_TYPE,
} from './medical-history-prisma-maps';
import {
  PATIENT_PERSISTENCE_PORT,
  type PatientPersistencePort,
} from '@/domains/patients/application/ports/patient-persistence.port';
import { MedicalHistoryFactory } from '@/domains/patients/core/factories/medical-history.factory';
import { findDuplicateAllergy } from '@/domains/patients/core/domain-services/patient-medical-history.rules';

@Injectable()
export class MedicalHistoryConditionsService {
  constructor(
    @Inject(PATIENT_PERSISTENCE_PORT)
    private readonly persistence: PatientPersistencePort,
    private readonly medicalHistoryFactory: MedicalHistoryFactory,
  ) {}

  async getConditions(patientId: string) {
    return this.persistence.patientMedicalCondition.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCondition(patientId: string, dto: CreateMedicalConditionInput) {
    const validated = this.medicalHistoryFactory.createCondition(dto);
    return this.persistence.patientMedicalCondition.create({
      data: {
        patientId,
        conditionName: validated.conditionName,
        icdCode: validated.icdCode,
        conditionType:
          DOMAIN_TO_PRISMA_MEDICAL_CONDITION_TYPE[validated.conditionType],
        status: DOMAIN_TO_PRISMA_CONDITION_STATUS[validated.status],
        severity: validated.severity
          ? DOMAIN_TO_PRISMA_CONDITION_SEVERITY[validated.severity]
          : null,
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
    const existing = await this.persistence.patientMedicalCondition.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    return this.persistence.patientMedicalCondition.update({
      where: { id },
      data: {
        conditionName: dto.conditionName,
        icdCode: dto.icdCode,
        ...(dto.conditionType !== undefined
          ? {
              conditionType:
                DOMAIN_TO_PRISMA_MEDICAL_CONDITION_TYPE[dto.conditionType],
            }
          : {}),
        ...(dto.status !== undefined
          ? { status: DOMAIN_TO_PRISMA_CONDITION_STATUS[dto.status] }
          : {}),
        ...(dto.severity !== undefined
          ? { severity: DOMAIN_TO_PRISMA_CONDITION_SEVERITY[dto.severity] }
          : {}),
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
    const existing = await this.persistence.patientMedicalCondition.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Medical condition with ID ${id} not found`);
    return this.persistence.patientMedicalCondition.delete({ where: { id } });
  }

  async getAllergies(patientId: string) {
    return this.persistence.patientAllergy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAllergy(patientId: string, dto: CreatePatientAllergyInput) {
    const validated = this.medicalHistoryFactory.createAllergy(dto);

    return this.persistence.$transaction(async (tx) => {
      const existingAllergies = await tx.patientAllergy.findMany({
        where: { patientId },
        select: { id: true, allergen: true },
      });
      if (findDuplicateAllergy(validated.allergen, existingAllergies)) {
        throw new ConflictException(
          'An allergy with this allergen already exists for this patient',
        );
      }
      return tx.patientAllergy.create({
        data: {
          patientId,
          allergen: validated.allergen,
          allergyType: DOMAIN_TO_PRISMA_ALLERGY_TYPE[validated.allergyType],
          severity: DOMAIN_TO_PRISMA_ALLERGY_SEVERITY[validated.severity],
          reaction: validated.reaction,
          notes: validated.notes,
          onsetDate: validated.onsetDate ? new Date(validated.onsetDate) : null,
        },
      });
    });
  }

  async updateAllergy(
    id: string,
    patientId: string,
    dto: UpdatePatientAllergyInput,
  ) {
    return this.persistence.$transaction(async (tx) => {
      const existing = await tx.patientAllergy.findFirst({
        where: { id, patientId },
      });
      if (!existing)
        throw new NotFoundException(`Allergy with ID ${id} not found`);

      if (dto.allergen !== undefined) {
        const existingAllergies = await tx.patientAllergy.findMany({
          where: { patientId },
          select: { id: true, allergen: true },
        });
        if (findDuplicateAllergy(dto.allergen, existingAllergies, id)) {
          throw new ConflictException(
            'An allergy with this allergen already exists for this patient',
          );
        }
      }
      return tx.patientAllergy.update({
        where: { id },
        data: {
          allergen: dto.allergen,
          ...(dto.allergyType !== undefined
            ? { allergyType: DOMAIN_TO_PRISMA_ALLERGY_TYPE[dto.allergyType] }
            : {}),
          ...(dto.severity !== undefined
            ? { severity: DOMAIN_TO_PRISMA_ALLERGY_SEVERITY[dto.severity] }
            : {}),
          reaction: dto.reaction,
          notes: dto.notes,
          onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        },
      });
    });
  }

  async deleteAllergy(id: string, patientId: string) {
    const existing = await this.persistence.patientAllergy.findFirst({
      where: { id, patientId },
    });
    if (!existing)
      throw new NotFoundException(`Allergy with ID ${id} not found`);
    return this.persistence.patientAllergy.delete({ where: { id } });
  }
}
