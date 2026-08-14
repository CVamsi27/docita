// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external SDK types
import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import type { ClinicTier, StaffNotificationType } from '@workspace/db';
import { isFrontDeskPlanMode, type TierName } from '@workspace/types';
import { meetsMinimumTier, getTierValue } from '@workspace/utils';

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
      select: { tier: true, planMode: true },
    });
    if (!clinic) return false;

    if (
      FRONT_DESK_OPERATION_NOTIFICATION_TYPES.has(type) &&
      isFrontDeskPlanMode(clinic.tier, clinic.planMode)
    ) {
      return true;
    }

    if (
      SCALED_FRONT_DESK_NOTIFICATION_TYPES.has(type) &&
      isFrontDeskPlanMode(clinic.tier, clinic.planMode)
    ) {
      return true;
    }

    return meetsMinimumTier(
      clinic.tier as TierName,
      getTierValue(required as TierName),
    );
  }

  async isWhatsappEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation !== 'object'
    )
      return true;

    const automation = isJsonObject(clinic.whatsappAutomation)
      ? clinic.whatsappAutomation
      : {};
    return automation.enabled !== false;
  }
}
