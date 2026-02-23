import { Injectable } from '@nestjs/common';
import { Prisma, ClinicTier } from '@workspace/db';
import { SettingsFactory } from './settings.factory';

@Injectable()
export class ClinicFactory {
  constructor(private readonly settingsFactory: SettingsFactory) {}

  create(data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    tier?: ClinicTier;
    settings?: Record<string, unknown>;
  }): Prisma.ClinicCreateInput {
    // Get default settings from factory
    const defaultSettings = this.settingsFactory.createDefault();

    // Merge defaults with provided settings
    const finalSettings = {
      ...defaultSettings,
      ...(data.settings || {}),
    };

    return {
      name: data.name,
      email: data.email,
      phone: data.phone || '', // Provide default if undefined
      address: data.address || '', // Provide default if undefined
      tier: data.tier || 'CORE', // Default to CORE tier
      active: true, // Default to active
      settings: finalSettings as unknown as Prisma.InputJsonValue,
    };
  }
}
