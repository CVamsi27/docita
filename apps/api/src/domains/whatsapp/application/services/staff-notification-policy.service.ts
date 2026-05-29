import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import type { ClinicTier, StaffNotificationType } from '@workspace/db';

function isJsonObject(value: unknown): value is { enabled?: unknown } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const NOTIFICATION_TYPE_MIN_TIER: Partial<
  Record<StaffNotificationType, ClinicTier>
> = {
  PATIENT_RESPONSE: 'ESSENTIAL',
  INVOICE_PENDING: 'ESSENTIAL',
  INVOICE_SENT: 'ESSENTIAL',
  INVOICE_FAILED: 'ESSENTIAL',
  INVOICE_PAID: 'ESSENTIAL',
  PAYMENT_PROVIDER_STATUS_UPDATE: 'PROFESSIONAL',
};

const FRONT_DESK_OPERATION_NOTIFICATION_TYPES = new Set<StaffNotificationType>([
  'INVOICE_PENDING',
  'INVOICE_SENT',
  'INVOICE_FAILED',
  'INVOICE_PAID',
]);

const SCALED_FRONT_DESK_NOTIFICATION_TYPES = new Set<StaffNotificationType>([
  'PAYMENT_PROVIDER_STATUS_UPDATE',
]);

const TIER_RANK: Record<ClinicTier, number> = {
  STARTER: 0,
  FRONT_DESK: 0,
  FRONT_DESK_CLINIC: 1,
  FRONT_DESK_HOSPITAL: 1,
  ESSENTIAL: 1,
  PROFESSIONAL: 2,
  HOSPITAL: 3,
  ENTERPRISE: 4,
};

@Injectable()
export class StaffNotificationPolicyService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
  ) {}

  async isTierAllowed(
    clinicId: string,
    type: StaffNotificationType,
  ): Promise<boolean> {
    const required = NOTIFICATION_TYPE_MIN_TIER[type];
    if (!required) return true;

    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });
    if (!clinic) return false;

    if (
      FRONT_DESK_OPERATION_NOTIFICATION_TYPES.has(type) &&
      clinic.tier === 'FRONT_DESK'
    ) {
      return true;
    }

    if (
      SCALED_FRONT_DESK_NOTIFICATION_TYPES.has(type) &&
      (clinic.tier === 'FRONT_DESK_CLINIC' ||
        clinic.tier === 'FRONT_DESK_HOSPITAL')
    ) {
      return true;
    }

    return TIER_RANK[clinic.tier] >= TIER_RANK[required];
  }

  async isWhatsappEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation !== 'object'
    ) {
      return true;
    }

    const automation = isJsonObject(clinic.whatsappAutomation)
      ? clinic.whatsappAutomation
      : {};
    return automation.enabled !== false;
  }
}
