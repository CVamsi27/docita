import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Subscription } from '@/domains/subscriptions/core/entities';
import { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { SubscriptionMapper } from '@/domains/subscriptions/infrastructure/mappers/subscription.mapper';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionStatus, Prisma } from '@workspace/db';
import { TaxCalculatorService } from '@/domains/billing/core/services/tax-calculator.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  taxRegistrationSnapshotSchema,
  taxSettingsSchema,
  type InvoiceTaxSummary,
  type TaxRegistrationSnapshot,
} from '@workspace/types';

const toPrismaJson = <T>(value: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const isJsonObject = (
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readJsonString = (
  object: Prisma.JsonObject | undefined,
  key: string,
): string | undefined => {
  const value = object?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

@Injectable()
export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalculator: TaxCalculatorService,
    private readonly configService: AppConfigService,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async save(subscription: Subscription): Promise<void> {
    try {
      const data = SubscriptionMapper.toPersistence(subscription);
      const existing = await this.prisma.subscription.findUnique({
        where: { id: subscription.id },
        select: { version: true },
      });

      if (existing) {
        if (existing.version !== subscription.version) {
          throw new BadRequestException(
            'Subscription was modified by another user. Please refresh and try again.',
          );
        }

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            ...(data as Prisma.SubscriptionUncheckedUpdateInput),
            version: { increment: 1 },
          },
        });
        return;
      }

      await this.prisma.subscription.create({
        data: data,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to save subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findById(id: string): Promise<Subscription | null> {
    try {
      const prismaSubscription =
        await this.getReadClient().subscription.findUnique({
          where: { id },
        });

      if (!prismaSubscription) {
        return null;
      }

      return SubscriptionMapper.toDomain(prismaSubscription);
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findByClinicId(clinicId: string): Promise<Subscription | null> {
    try {
      const prismaSubscription =
        await this.getReadClient().subscription.findUnique({
          where: { clinicId },
        });

      if (!prismaSubscription) {
        return null;
      }

      return SubscriptionMapper.toDomain(prismaSubscription);
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findByStatus(status: string): Promise<Subscription[]> {
    try {
      const prismaSubscriptions =
        await this.getReadClient().subscription.findMany({
          where: { status: status as SubscriptionStatus },
        });

      return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findApproachingRenewal(daysThreshold: number): Promise<Subscription[]> {
    try {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + daysThreshold);

      const prismaSubscriptions =
        await this.getReadClient().subscription.findMany({
          where: {
            currentPeriodEnd: {
              lte: renewalDate,
              gte: new Date(),
            },
            status: 'ACTIVE',
          },
        });

      return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
    } catch (error) {
      throw new BadRequestException(
        `Failed to find approaching renewals: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async update(subscription: Subscription): Promise<void> {
    try {
      const existing = await this.prisma.subscription.findUnique({
        where: { id: subscription.id },
      });

      if (!existing) {
        throw new NotFoundException(
          `Subscription ${subscription.id} not found`,
        );
      }

      if (existing.version !== subscription.version) {
        throw new BadRequestException(
          'Subscription was modified by another user. Please refresh and try again.',
        );
      }

      const data = SubscriptionMapper.toPersistence(subscription);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          ...(data as Prisma.SubscriptionUncheckedUpdateInput),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription ${id} not found`);
      }

      await this.prisma.subscription.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async savePayment(payment: {
    clinicId: string;
    subscriptionId?: string;
    amountCents: number;
    currency: string;
    status: string;
    razorpayOrderId: string;
    description: string;
    razorpayPaymentId?: string;
    paidAt?: Date | null;
  }): Promise<void> {
    try {
      const taxFields = await this.calculateSubscriptionTaxFields(payment);
      const resolvedPaidAt =
        payment.status === 'paid' || payment.status === 'PAID'
          ? (payment.paidAt ?? new Date())
          : undefined;
      await this.prisma.subscriptionPayment.create({
        data: {
          clinicId: payment.clinicId,
          subscriptionId: payment.subscriptionId,
          amountCents: payment.amountCents,
          currency: payment.currency,
          status: payment.status,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          description: payment.description,
          invoiceType: taxFields.invoiceType,
          subtotalCents: taxFields.subtotalCents,
          taxCents: taxFields.taxCents,
          grandTotalCents: taxFields.grandTotalCents,
          taxSummary: toPrismaJson(taxFields.taxSummary),
          sellerTaxSnapshot: toPrismaJson(taxFields.seller),
          buyerTaxSnapshot: toPrismaJson(taxFields.buyer),
          placeOfSupplyStateCode: taxFields.taxSummary.placeOfSupply?.stateCode,
          reverseCharge: taxFields.taxSummary.reverseCharge,
          paidAt: resolvedPaidAt,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to save payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updatePaymentStatus(
    orderId: string,
    status: string,
    details?: {
      paymentId?: string;
      signature?: string;
      subscriptionId?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.subscriptionPayment.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          status: status,
          razorpayPaymentId: details?.paymentId,
          razorpaySignature: details?.signature,
          subscriptionId: details?.subscriptionId,
          paidAt: status === 'paid' ? new Date() : undefined,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findPaymentsByClinicId(
    clinicId: string,
    limit: number,
  ): Promise<
    Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs>[]
  > {
    return this.getReadClient().subscriptionPayment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findPaymentById(
    clinicId: string,
    paymentId: string,
  ): Promise<Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs> | null> {
    return this.getReadClient().subscriptionPayment.findFirst({
      where: { id: paymentId, clinicId },
    });
  }

  async findPaymentByOrderId(
    clinicId: string,
    orderId: string,
  ): Promise<Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs> | null> {
    return this.getReadClient().subscriptionPayment.findFirst({
      where: { clinicId, razorpayOrderId: orderId },
    });
  }

  async updatePaymentLink(params: {
    clinicId: string;
    paymentId: string;
    payUrl: string;
  }): Promise<void> {
    await this.prisma.subscriptionPayment.updateMany({
      where: { id: params.paymentId, clinicId: params.clinicId },
      data: {
        invoiceUrl: params.payUrl,
      },
    });
  }

  async expireDuplicatePendingCheckouts(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    keepOrderId: string;
  }): Promise<number> {
    const result = await this.prisma.subscriptionPayment.updateMany({
      where: {
        clinicId: params.clinicId,
        status: { in: ['pending', 'PENDING'] },
        amountCents: params.amountCents,
        currency: params.currency,
        description: params.description,
        razorpayOrderId: { not: params.keepOrderId },
      },
      data: { status: 'expired' },
    });

    return result.count;
  }

  async findReusablePendingCheckout(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    withinMinutes: number;
  }): Promise<{ razorpayOrderId: string } | null> {
    const threshold = new Date(Date.now() - params.withinMinutes * 60 * 1000);
    const row = await this.getReadClient().subscriptionPayment.findFirst({
      where: {
        clinicId: params.clinicId,
        status: { in: ['pending', 'PENDING'] },
        amountCents: params.amountCents,
        currency: params.currency,
        description: params.description,
        razorpayOrderId: { not: null },
        razorpayPaymentId: null,
        createdAt: { gte: threshold },
      },
      select: { razorpayOrderId: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!row?.razorpayOrderId) return null;
    return { razorpayOrderId: row.razorpayOrderId };
  }

  private async calculateSubscriptionTaxFields(payment: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
  }): Promise<{
    invoiceType: string;
    subtotalCents: number;
    taxCents: number;
    grandTotalCents: number;
    taxSummary: InvoiceTaxSummary;
    seller: TaxRegistrationSnapshot;
    buyer: TaxRegistrationSnapshot;
  }> {
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: payment.clinicId },
      select: {
        id: true,
        name: true,
        address: true,
        currency: true,
        settings: true,
      },
    });
    const platformTaxConfig = this.configService.getPlatformTaxConfig();
    const seller = taxRegistrationSnapshotSchema.parse(
      platformTaxConfig.seller,
    );
    const taxSettings = taxSettingsSchema.parse({
      countryCode: 'IN',
      regime: 'IN_GST',
      ...this.extractClinicTaxSettings(clinic?.settings),
    });
    const buyer = taxRegistrationSnapshotSchema.parse({
      countryCode: taxSettings.countryCode,
      regime: taxSettings.regime,
      registrationId: taxSettings.registrationId,
      registrationLabel: taxSettings.registrationLabel,
      legalName: clinic?.name,
      address: clinic?.address ?? undefined,
      stateCode: taxSettings.stateCode,
      stateName: taxSettings.stateName,
    });

    const taxRate =
      payment.currency === 'INR' && seller.countryCode === 'IN'
        ? platformTaxConfig.subscriptionTaxRate
        : 0;
    const grandTotal = roundCurrency(payment.amountCents / 100);
    const subtotal =
      taxRate > 0
        ? roundCurrency(grandTotal / (1 + taxRate / 100))
        : grandTotal;
    const calculation = this.taxCalculator.calculateInvoice({
      currency: payment.currency || clinic?.currency || 'INR',
      seller,
      buyer,
      items: [
        {
          description: payment.description,
          quantity: 1,
          price: subtotal,
          taxTreatment: taxRate > 0 ? 'TAXABLE' : 'EXEMPT',
          taxRate,
          sacCode: '998313',
        },
      ],
    });

    return {
      invoiceType: calculation.invoiceType,
      subtotalCents: Math.round(calculation.subtotal * 100),
      taxCents: Math.round(calculation.taxTotal * 100),
      grandTotalCents: payment.amountCents,
      taxSummary: {
        ...calculation.summary,
        grandTotal,
      },
      seller,
      buyer,
    };
  }

  private extractClinicTaxSettings(
    settings: Prisma.JsonValue | null | undefined,
  ): Record<string, string | undefined> {
    const settingsObject = isJsonObject(settings) ? settings : undefined;
    const taxSettings = settingsObject?.taxSettings;
    const taxSettingsObject = isJsonObject(taxSettings)
      ? taxSettings
      : undefined;

    return {
      registrationId:
        readJsonString(settingsObject, 'gstin') ??
        readJsonString(taxSettingsObject, 'registrationId'),
      registrationLabel: readJsonString(taxSettingsObject, 'registrationLabel'),
      countryCode: readJsonString(taxSettingsObject, 'countryCode'),
      regime: readJsonString(taxSettingsObject, 'regime'),
      stateCode: readJsonString(taxSettingsObject, 'stateCode'),
      stateName: readJsonString(taxSettingsObject, 'stateName'),
    };
  }
}
