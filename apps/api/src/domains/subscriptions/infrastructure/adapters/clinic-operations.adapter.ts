import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IClinicOperations,
  ClinicDetails,
} from '../../application/ports/clinic-operations.port';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentWebSocketGateway } from '../../../../gateways/payment.websocket.gateway';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';

@Injectable()
export class ClinicOperationsAdapter implements IClinicOperations {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGateway: PaymentWebSocketGateway,
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
  }

  emitUpdate(clinicId: string, data: any): Promise<void> {
    this.paymentGateway.emitClinicUpdate(clinicId, data);
    return Promise.resolve();
  }
}
