import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  IClinicOperations,
  ClinicDetails,
  ClinicUpdateData,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  PaymentWebSocketGateway,
  ClinicUpdateData as WsClinicUpdateData,
} from '@/gateways/payment.websocket.gateway';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';

function toClinicTier(value?: string): ClinicTier | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(ClinicTier).find((tier) => tier === value);
}

function toSubscriptionStatus(value?: string): SubscriptionStatus | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(SubscriptionStatus).find((status) => status === value);
}

@Injectable()
export class ClinicOperationsAdapter implements IClinicOperations {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly paymentGateway?: PaymentWebSocketGateway,
    @Optional()
    private readonly clinicAuthCache?: ClinicAuthCacheService,
  ) {}

  async getClinicDetails(clinicId: string): Promise<ClinicDetails> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic ${clinicId} not found`);
    }

    return {
      id: clinic.id,
      name: clinic.name,
      email: clinic.email || '',
      phone: clinic.phone || '',
      razorpayCustomerId: clinic.razorpayCustomerId || undefined,
    };
  }

  async updateRazorpayCustomerId(
    clinicId: string,
    customerId: string,
  ): Promise<void> {
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { razorpayCustomerId: customerId },
    });
  }

  async updateTierAndFeatures(
    clinicId: string,
    tier: string,
    subscriptionStatus: string,
    features: Record<string, boolean>,
  ): Promise<void> {
    const existingClinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { features: true },
    });

    const existingFeatures =
      (existingClinic?.features as Record<string, boolean>) || {};

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        tier: tier as ClinicTier,
        subscriptionStatus: subscriptionStatus as SubscriptionStatus,
        features: {
          ...existingFeatures,
          ...features,
        },
      },
    });
    this.clinicAuthCache?.invalidate(clinicId);
  }

  emitUpdate(clinicId: string, data: ClinicUpdateData): Promise<void> {
    if (this.paymentGateway) {
      const wsData: WsClinicUpdateData = {
        clinicId: data.clinicId,
        intelligenceAddon: data.intelligenceAddon,
        tier: toClinicTier(data.tier),
        subscriptionStatus: toSubscriptionStatus(data.subscriptionStatus),
        subscriptionGraceUntil:
          data.subscriptionGraceUntil === undefined
            ? undefined
            : data.subscriptionGraceUntil,
      };

      this.paymentGateway.emitClinicUpdate(clinicId, wsData);
    }
    return Promise.resolve();
  }
}
