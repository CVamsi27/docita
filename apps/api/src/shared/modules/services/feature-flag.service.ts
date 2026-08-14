import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  coerceFeatureFlagValue,
  parseClinicPricingOffer,
} from '@/shared/modules/services/feature-flag-value';
import type {
  ClinicPricingOffer,
  FeatureFlagConfig,
  FeatureFlagValue,
} from '@/shared/modules/services/feature-flag.types';

export type { ClinicPricingOffer };

const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    key: 'enable_whatsapp_reminders',
    defaultValue: true,
    description: 'Enable WhatsApp appointment reminders',
    perClinic: true,
  },
  {
    key: 'enable_ai_features',
    defaultValue: false,
    description: 'Enable AI-powered features (diagnosis suggestions, etc.)',
    perClinic: true,
  },
  {
    key: 'enable_queue_management',
    defaultValue: true,
    description: 'Enable patient queue management',
    perClinic: true,
  },
  {
    key: 'enable_inventory_management',
    defaultValue: false,
    description: 'Enable inventory/stock management',
    perClinic: true,
  },
  {
    key: 'enable_lab_integration',
    defaultValue: false,
    description: 'Enable lab test integration',
    perClinic: true,
  },

  {
    key: 'enable_dark_mode',
    defaultValue: true,
    description: 'Enable dark mode in UI',
    perClinic: false,
  },
  {
    key: 'enable_compact_view',
    defaultValue: false,
    description: 'Enable compact view for patient lists',
    perClinic: true,
  },

  {
    key: 'max_file_upload_size_mb',
    defaultValue: 10,
    description: 'Maximum file upload size in MB',
    perClinic: true,
  },
  {
    key: 'max_appointments_per_day',
    defaultValue: 100,
    description: 'Maximum appointments per day per doctor',
    perClinic: true,
  },

  {
    key: 'enable_beta_prescription_editor',
    defaultValue: false,
    description: 'Enable new prescription editor (beta)',
    perClinic: true,
  },
  {
    key: 'enable_fhir_export',
    defaultValue: false,
    description: 'Enable FHIR data export',
    perClinic: true,
  },
  {
    key: 'enable_telemedicine',
    defaultValue: false,
    description: 'Enable telemedicine/video consultations',
    perClinic: true,
  },
  {
    key: 'clinic_pricing_offer',
    defaultValue: {
      title: '',
      description: '',
      percentOff: 0,
    },
    description: 'Per-clinic pricing offer for requested hospitals',
    perClinic: true,
  },
];

@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagService.name);
  private cache: Map<string, unknown> = new Map();
  private cacheExpiry: Date = new Date(0);
  private readonly CACHE_TTL_MS = 60000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  onModuleInit(): void {
    void this.initializeDefaultFlags().catch((error: unknown) => {
      this.logger.warn(
        `Feature flag initialization failed; defaults will be used: ${this.formatErrorMessage(error)}`,
      );
    });
  }

  private formatErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async initializeDefaultFlags(): Promise<void> {
    try {
      const keys = DEFAULT_FEATURE_FLAGS.map((f) => f.key);
      const existing = await this.prisma.featureFlag?.findMany({
        where: { key: { in: keys }, clinicId: null },
        select: { key: true },
      });
      const existingKeys = new Set(existing?.map((f) => f.key) ?? []);

      const missing = DEFAULT_FEATURE_FLAGS.filter(
        (f) => !existingKeys.has(f.key),
      );
      if (missing.length > 0) {
        await this.prisma.featureFlag?.createMany({
          data: missing.map((f) => ({
            key: f.key,
            value: toPrismaInputJsonValue(f.defaultValue),
            description: f.description,
            clinicId: null,
          })),
          skipDuplicates: true,
        });
        this.logger.debug(
          `Initialized feature flags: ${missing.map((f) => f.key).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `FeatureFlag model not available, using defaults: ${this.formatErrorMessage(error)}`,
      );
    }
  }

  async isEnabled(key: string, clinicId?: string): Promise<boolean> {
    const value = await this.getValue(key, clinicId);
    return value === true;
  }

  async getValue(
    key: string,
    clinicId?: string,
    defaultValue?: FeatureFlagValue,
  ): Promise<FeatureFlagValue> {
    try {
      if (clinicId) {
        const clinicFlag = await this.prisma.featureFlag?.findFirst({
          where: { key, clinicId },
        });
        if (clinicFlag) return coerceFeatureFlagValue(clinicFlag.value);
      }

      const cacheKey = `global:${key}`;
      if (this.cache.has(cacheKey) && this.cacheExpiry > this.clock.now()) {
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) return coerceFeatureFlagValue(cached);
      }

      const globalFlag = await this.prisma.featureFlag?.findFirst({
        where: { key, clinicId: null },
      });

      if (globalFlag) {
        const resolved = coerceFeatureFlagValue(globalFlag.value);
        this.cache.set(cacheKey, resolved);
        this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);
        return resolved;
      }
    } catch (error) {
      this.logger.warn(
        `Feature flag lookup failed for ${key}; using fallback: ${this.formatErrorMessage(error)}`,
      );
    }

    const configDefault = DEFAULT_FEATURE_FLAGS.find(
      (f) => f.key === key,
    )?.defaultValue;
    return defaultValue ?? configDefault ?? false;
  }

  async setValue(
    key: string,
    value: unknown,
    clinicId?: string,
  ): Promise<void> {
    try {
      const existing = await this.prisma.featureFlag?.findFirst({
        where: { key, clinicId: clinicId ?? null },
      });

      if (existing) {
        await this.prisma.featureFlag?.update({
          where: { id: existing.id },
          data: { value: toPrismaInputJsonValue(value) },
        });
      } else {
        await this.prisma.featureFlag?.create({
          data: {
            key,
            value: toPrismaInputJsonValue(value),
            clinicId: clinicId ?? null,
          },
        });
      }

      this.cache.delete(`global:${key}`);
      this.logger.log(
        `Feature flag updated: ${key} = ${JSON.stringify(value)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to set feature flag: ${key}`, error);
      throw error;
    }
  }

  async getAllForClinic(
    clinicId: string,
  ): Promise<Record<string, FeatureFlagValue>> {
    const result: Record<string, FeatureFlagValue> = {};

    for (const flag of DEFAULT_FEATURE_FLAGS) {
      result[flag.key] = flag.defaultValue;
    }

    try {
      const globalFlags =
        (await this.prisma.featureFlag?.findMany({
          where: { clinicId: null },
        })) ?? [];

      for (const flag of globalFlags) {
        result[flag.key] = coerceFeatureFlagValue(flag.value);
      }

      const clinicFlags =
        (await this.prisma.featureFlag?.findMany({
          where: { clinicId },
        })) ?? [];

      for (const flag of clinicFlags) {
        result[flag.key] = coerceFeatureFlagValue(flag.value);
      }
    } catch (error) {
      this.logger.warn(
        `Feature flag list lookup failed for clinic ${clinicId}; returning defaults: ${this.formatErrorMessage(error)}`,
      );
    }

    return result;
  }

  async deleteClinicOverride(key: string, clinicId: string): Promise<void> {
    try {
      await this.prisma.featureFlag?.deleteMany({
        where: { key, clinicId },
      });
      this.logger.log(
        `Deleted clinic override for: ${key} (clinic: ${clinicId})`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete clinic override: ${key}`, error);
      throw error;
    }
  }

  async getClinicPricingOffer(
    clinicId: string,
  ): Promise<ClinicPricingOffer | null> {
    const offer = await this.getValue('clinic_pricing_offer', clinicId, null);

    const parsed = parseClinicPricingOffer(offer);
    if (!parsed || parsed.percentOff <= 0) return null;

    return parsed;
  }

  async setClinicPricingOffer(
    clinicId: string,
    offer: ClinicPricingOffer | null,
  ): Promise<void> {
    if (!offer) {
      await this.deleteClinicOverride('clinic_pricing_offer', clinicId);
      return;
    }

    await this.setValue('clinic_pricing_offer', offer, clinicId);
  }

  invalidateCache(): void {
    this.cache.clear();
    this.cacheExpiry = new Date(0);
  }
}
