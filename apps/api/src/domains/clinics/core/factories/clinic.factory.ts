import { Injectable } from '@nestjs/common';
import { Prisma, ClinicTier } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
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
      settings: toPrismaInputJsonValue(finalSettings),
    };
  }
}
