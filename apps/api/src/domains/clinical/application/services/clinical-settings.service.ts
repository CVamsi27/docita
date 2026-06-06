import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  CLINICAL_SETTINGS_REPOSITORY_TOKEN,
  IClinicalSettingsRepository,
} from '@/domains/clinical/core/repositories/clinical-settings.repository.interface';

export const medicalCodingSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    provider: z.string().min(1).optional(),
    autoSuggest: z.boolean().optional(),
    preferredSystem: z.string().min(1).optional(),
  })
  .strict();

export type MedicalCodingSettings = z.infer<typeof medicalCodingSettingsSchema>;

export interface ResolvedMedicalCodingSettings {
  enabled: boolean;
  provider: string;
  autoSuggest: boolean;
  preferredSystem: string;
}

/**
 * Thin facade — delegates clinical settings reads/writes to IClinicalSettingsRepository.
 */
@Injectable()
export class ClinicalSettingsService {
  constructor(
    @Inject(CLINICAL_SETTINGS_REPOSITORY_TOKEN)
    private readonly clinicalSettingsRepository: IClinicalSettingsRepository,
  ) {}

  private normalizeSettings(
    raw: Record<string, unknown>,
  ): ResolvedMedicalCodingSettings {
    return {
      enabled: raw.medicalCodingEnabled !== false,
      provider:
        typeof raw.medicalCodingProvider === 'string'
          ? raw.medicalCodingProvider
          : 'internal',
      autoSuggest: raw.medicalCodingAutoSuggest !== false,
      preferredSystem:
        typeof raw.medicalCodingPreferredSystem === 'string'
          ? raw.medicalCodingPreferredSystem
          : 'ICD-10',
    };
  }

  async getMedicalCodingSettings(
    clinicId: string,
  ): Promise<ResolvedMedicalCodingSettings> {
    const settings = await this.clinicalSettingsRepository.getClinicSettings(clinicId);
    return this.normalizeSettings(settings);
  }

  async updateMedicalCodingSettings(
    clinicId: string,
    patch: MedicalCodingSettings,
  ): Promise<ResolvedMedicalCodingSettings> {
    const current = await this.clinicalSettingsRepository.getClinicSettings(clinicId);

    const next = {
      ...current,
      ...(patch.enabled !== undefined
        ? { medicalCodingEnabled: patch.enabled }
        : {}),
      ...(patch.provider !== undefined
        ? { medicalCodingProvider: patch.provider }
        : {}),
      ...(patch.autoSuggest !== undefined
        ? { medicalCodingAutoSuggest: patch.autoSuggest }
        : {}),
      ...(patch.preferredSystem !== undefined
        ? { medicalCodingPreferredSystem: patch.preferredSystem }
        : {}),
    };

    await this.clinicalSettingsRepository.updateClinicSettings(clinicId, next);

    return this.normalizeSettings(next);
  }
}
