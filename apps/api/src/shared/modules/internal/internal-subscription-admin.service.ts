import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import type { Prisma } from '@workspace/db';
import { addDays } from '@workspace/utils';
import {
  getBillingTierDetails,
  INTERNAL_BILLING_TIER_ORDER,
} from './internal-billing-tier.constants';

@Injectable()
export class InternalSubscriptionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async sendReminder(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        clinic: { select: { id: true, name: true, email: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscriptionReminder.create({
      data: {
        clinicId: subscription.clinicId,
        subscriptionId,
        type: 'expiry_7d',
        channel: 'email',
        status: 'sent',
        sentAt: this.clock.now(),
      },
    });

    return { success: true, message: 'Reminder sent successfully' };
  }

  async extendGracePeriod(subscriptionId: string, days: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.GRACE) {
      throw new BadRequestException('Subscription is not in grace period');
    }

    const newEndDate = addDays(new Date(subscription.currentPeriodEnd), days);

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { currentPeriodEnd: newEndDate },
    });

    return { success: true, message: `Grace period extended by ${days} days` };
  }

  async processPaymentAndUpdateTier(
    clinicId: string,
    data: {
      paymentId: string;
      amount: number;
      currency: string;
      newTier: ClinicTier;
      paymentMethod: string;
      notes?: string;
    },
  ) {
    const clinic = await this.findClinicOrThrow(clinicId);

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier: data.newTier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });

    return {
      success: true,
      payment: {
        paymentId: data.paymentId,
        status: 'completed',
        amount: data.amount,
        currency: data.currency || clinic.currency,
        paymentMethod: data.paymentMethod,
        timestamp: this.clock.now(),
      },
      clinic: updatedClinic,
    };
  }

  async getClinicTierInfo(clinicId: string) {
    const clinic = await this.findClinicWithSelectOrThrow(clinicId, {
      id: true,
      name: true,
      tier: true,
      currency: true,
      subscriptionStatus: true,
      intelligenceAddon: true,
    });
    return {
      clinic,
      tierInfo: getBillingTierDetails(String(clinic.tier)),
    };
  }

  async upgradeTier(clinicId: string, newTier: ClinicTier) {
    await this.findClinicOrThrow(clinicId);

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { tier: newTier },
    });

    return {
      success: true,
      clinic: updatedClinic,
      message: `Clinic upgraded to ${newTier}`,
    };
  }

  async downgradeTier(clinicId: string, newTier: ClinicTier) {
    await this.findClinicOrThrow(clinicId);

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { tier: newTier },
    });

    return {
      success: true,
      clinic: updatedClinic,
      message: `Clinic downgraded to ${newTier}`,
    };
  }

  getTierPricingInfo() {
    return INTERNAL_BILLING_TIER_ORDER.map((tier) => ({
      tier,
      ...getBillingTierDetails(String(tier)),
    }));
  }

  private async findClinicOrThrow(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) throw new BadRequestException('Clinic not found');

    return clinic;
  }

  private async findClinicWithSelectOrThrow<S extends Prisma.ClinicSelect>(
    clinicId: string,
    select: S,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select,
    });

    if (!clinic) throw new BadRequestException('Clinic not found');

    return clinic;
  }
}
