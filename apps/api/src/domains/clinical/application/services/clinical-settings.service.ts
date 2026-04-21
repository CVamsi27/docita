import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';

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

@Injectable()
export class ClinicalSettingsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const settings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};
    return this.normalizeSettings(settings);
  }

  async updateMedicalCodingSettings(
    clinicId: string,
    patch: MedicalCodingSettings,
  ): Promise<ResolvedMedicalCodingSettings> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const current =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

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

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { settings: next },
    });

    return this.normalizeSettings(next);
  }
}
