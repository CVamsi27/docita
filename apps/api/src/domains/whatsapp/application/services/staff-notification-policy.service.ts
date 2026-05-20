import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ClinicTier, StaffNotificationType } from '@workspace/db';

const NOTIFICATION_TYPE_MIN_TIER: Partial<
  Record<StaffNotificationType, ClinicTier>
> = {
  PATIENT_RESPONSE: 'ESSENTIAL',
  INVOICE_PENDING: 'ESSENTIAL',
  INVOICE_SENT: 'ESSENTIAL',
  INVOICE_FAILED: 'ESSENTIAL',
  PAYMENT_PROVIDER_STATUS_UPDATE: 'PROFESSIONAL',
};

const TIER_RANK: Record<ClinicTier, number> = {
  STARTER: 0,
  FRONT_DESK: 0,
  ESSENTIAL: 1,
  PROFESSIONAL: 2,
  HOSPITAL: 3,
  ENTERPRISE: 4,
};

@Injectable()
export class StaffNotificationPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async isTierAllowed(
    clinicId: string,
    type: StaffNotificationType,
  ): Promise<boolean> {
    const required = NOTIFICATION_TYPE_MIN_TIER[type];
    if (!required) return true;

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });
    if (!clinic) return false;

    return TIER_RANK[clinic.tier] >= TIER_RANK[required];
  }

  async isWhatsappEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    if (
      !clinic?.whatsappAutomation ||
      typeof clinic.whatsappAutomation !== 'object'
    ) {
      return true;
    }

    const automation = clinic.whatsappAutomation as { enabled?: boolean };
    return automation.enabled !== false;
  }
}
