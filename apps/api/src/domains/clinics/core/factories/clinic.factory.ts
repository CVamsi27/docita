import { Injectable } from '@nestjs/common';
import { Prisma, ClinicTier } from '@workspace/db';
import { SettingsFactory } from './settings.factory';

@Injectable()
export class ClinicFactory {
  constructor(private readonly settingsFactory: SettingsFactory) {}

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  create(data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    tier?: ClinicTier;
    settings?: Record<string, unknown>;
  }): Prisma.ClinicCreateInput {
    const defaultSettings = this.settingsFactory.createDefault();

    const finalSettings = {
      ...defaultSettings,
      ...(data.settings || {}),
    };

    return {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      address: data.address || '',
      tier: data.tier || 'ESSENTIAL',
      active: true,
      settings: this.toInputJsonValue(finalSettings),
    };
  }
}
