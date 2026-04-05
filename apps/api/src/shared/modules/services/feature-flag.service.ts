import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';

export type FeatureFlagValue =
  | boolean
  | number
  | string
  | Record<string, unknown>
  | null
  | unknown[];

export interface ClinicPricingOffer {
  title: string;
  description: string;
  percentOff: number;
  validUntil?: string;
  durationMonths?: number;
  notes?: string;
}

export interface FeatureFlagConfig {
  key: string;
  defaultValue: FeatureFlagValue;
  description: string;

  perClinic?: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig[] = [
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

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagService.name);
  private cache: Map<string, unknown> = new Map();
  private cacheExpiry: Date = new Date(0);
  private readonly CACHE_TTL_MS = 60000;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeDefaultFlags();
  }

  private async initializeDefaultFlags(): Promise<void> {
    try {
      for (const flag of DEFAULT_FEATURE_FLAGS) {
        const existing = await this.prisma.featureFlag?.findFirst({
          where: { key: flag.key, clinicId: null },
        });

        if (!existing) {
          await this.prisma.featureFlag?.create({
            data: {
              key: flag.key,
              value: toInputJsonValue(flag.defaultValue),
              description: flag.description,
              clinicId: null,
            },
          });
          this.logger.debug(`Initialized feature flag: ${flag.key}`);
        }
      }
    } catch (_error) {
      this.logger.warn('FeatureFlag model not available, using defaults');
    }
  }

  async isEnabled(key: string, clinicId?: string): Promise<boolean> {
    const value = await this.getValue<boolean>(key, clinicId);
    return value === true;
  }

  async getValue<T>(
    key: string,
    clinicId?: string,
    defaultValue?: T,
  ): Promise<T> {
    try {
      if (clinicId) {
        const clinicFlag = await this.prisma.featureFlag?.findFirst({
          where: { key, clinicId },
        });
        if (clinicFlag) {
          return clinicFlag.value as T;
        }
      }

      const cacheKey = `global:${key}`;
      if (this.cache.has(cacheKey) && this.cacheExpiry > new Date()) {
        return this.cache.get(cacheKey) as T;
      }

      const globalFlag = await this.prisma.featureFlag?.findFirst({
        where: { key, clinicId: null },
      });

      if (globalFlag) {
        this.cache.set(cacheKey, globalFlag.value as FeatureFlagValue);
        this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);
        return globalFlag.value as T;
      }
    } catch (_error) {}

    const configDefault = DEFAULT_FEATURE_FLAGS.find(
      (f) => f.key === key,
    )?.defaultValue;
    return (defaultValue ?? configDefault ?? false) as T;
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
          data: { value: toInputJsonValue(value) },
        });
      } else {
        await this.prisma.featureFlag?.create({
          data: {
            key,
            value: toInputJsonValue(value),
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
        result[flag.key] = flag.value as FeatureFlagValue;
      }

      const clinicFlags =
        (await this.prisma.featureFlag?.findMany({
          where: { clinicId },
        })) ?? [];

      for (const flag of clinicFlags) {
        result[flag.key] = flag.value as FeatureFlagValue;
      }
    } catch (_error) {}

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
    const offer = await this.getValue<ClinicPricingOffer | null>(
      'clinic_pricing_offer',
      clinicId,
      null,
    );

    if (!offer || !offer.percentOff || offer.percentOff <= 0) {
      return null;
    }

    return offer;
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
