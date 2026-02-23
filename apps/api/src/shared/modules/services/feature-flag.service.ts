import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Feature Flag Value Types
 */
export type FeatureFlagValue =
  | boolean
  | number
  | string
  | Record<string, unknown>;

/**
 * Feature Flag Configuration
 */
export interface FeatureFlagConfig {
  key: string;
  defaultValue: FeatureFlagValue;
  description: string;
  /** If true, can be overridden per clinic */
  perClinic?: boolean;
}

/**
 * Default Feature Flags
 * Add new feature flags here with their defaults
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig[] = [
  // Core Features
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

  // UI Features
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

  // Limits
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

  // Beta Features
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
];

/**
 * Feature Flag Service
 *
 * Provides feature flag management with database persistence
 * and per-clinic overrides.
 *
 * Usage:
 * ```typescript
 * // Check if feature is enabled
 * if (await this.featureFlags.isEnabled('enable_ai_features', clinicId)) {
 *   // AI features available
 * }
 *
 * // Get a numeric value
 * const maxSize = await this.featureFlags.getValue<number>('max_file_upload_size_mb', clinicId);
 * ```
 */
@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagService.name);
  private cache: Map<string, FeatureFlagValue> = new Map();
  private cacheExpiry: Date = new Date(0);
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags in the database
   */
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
              value: flag.defaultValue as any,
              description: flag.description,
              clinicId: null,
            },
          });
          this.logger.debug(`Initialized feature flag: ${flag.key}`);
        }
      }
    } catch (error) {
      // FeatureFlag model might not exist yet
      this.logger.warn('FeatureFlag model not available, using defaults');
    }
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(key: string, clinicId?: string): Promise<boolean> {
    const value = await this.getValue<boolean>(key, clinicId);
    return value === true;
  }

  /**
   * Get a feature flag value
   */
  async getValue<T extends FeatureFlagValue>(
    key: string,
    clinicId?: string,
    defaultValue?: T,
  ): Promise<T> {
    try {
      // Check clinic-specific override first
      if (clinicId) {
        const clinicFlag = await this.prisma.featureFlag?.findFirst({
          where: { key, clinicId },
        });
        if (clinicFlag) {
          return clinicFlag.value as T;
        }
      }

      // Check cache
      const cacheKey = `global:${key}`;
      if (this.cache.has(cacheKey) && this.cacheExpiry > new Date()) {
        return this.cache.get(cacheKey) as T;
      }

      // Get global flag
      const globalFlag = await this.prisma.featureFlag?.findFirst({
        where: { key, clinicId: null },
      });

      if (globalFlag) {
        this.cache.set(cacheKey, globalFlag.value as FeatureFlagValue);
        this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);
        return globalFlag.value as T;
      }
    } catch (error) {
      // FeatureFlag model might not exist
    }

    // Return default from config or provided default
    const configDefault = DEFAULT_FEATURE_FLAGS.find(
      (f) => f.key === key,
    )?.defaultValue;
    return (defaultValue ?? configDefault ?? false) as T;
  }

  /**
   * Set a feature flag value
   */
  async setValue(
    key: string,
    value: FeatureFlagValue,
    clinicId?: string,
  ): Promise<void> {
    try {
      const existing = await this.prisma.featureFlag?.findFirst({
        where: { key, clinicId: clinicId ?? null },
      });

      if (existing) {
        await this.prisma.featureFlag?.update({
          where: { id: existing.id },
          data: { value: value as any },
        });
      } else {
        await this.prisma.featureFlag?.create({
          data: {
            key,
            value: value as any,
            clinicId: clinicId ?? null,
          },
        });
      }

      // Invalidate cache
      this.cache.delete(`global:${key}`);
      this.logger.log(
        `Feature flag updated: ${key} = ${JSON.stringify(value)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to set feature flag: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get all feature flags for a clinic
   */
  async getAllForClinic(
    clinicId: string,
  ): Promise<Record<string, FeatureFlagValue>> {
    const result: Record<string, FeatureFlagValue> = {};

    // Start with defaults
    for (const flag of DEFAULT_FEATURE_FLAGS) {
      result[flag.key] = flag.defaultValue;
    }

    try {
      // Get global flags
      const globalFlags =
        (await this.prisma.featureFlag?.findMany({
          where: { clinicId: null },
        })) ?? [];

      for (const flag of globalFlags) {
        result[flag.key] = flag.value as FeatureFlagValue;
      }

      // Get clinic-specific overrides
      const clinicFlags =
        (await this.prisma.featureFlag?.findMany({
          where: { clinicId },
        })) ?? [];

      for (const flag of clinicFlags) {
        result[flag.key] = flag.value as FeatureFlagValue;
      }
    } catch (error) {
      // FeatureFlag model might not exist
    }

    return result;
  }

  /**
   * Delete a clinic-specific override
   */
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

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.cache.clear();
    this.cacheExpiry = new Date(0);
  }
}
