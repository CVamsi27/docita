import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentLinkProvider,
  DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { Role } from '@workspace/db';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';

type SubscriptionPaymentRecord = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
  description?: string | null;
};

@Injectable()
export class ResumeSubscriptionPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigService,
    @Inject(DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN)
    private readonly paymentLinkProvider: IPaymentLinkProvider,
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async execute(params: { clinicId: string; paymentId: string }) {
    const payment = (await this.subscriptionRepo.findPaymentById(
      params.clinicId,
      params.paymentId,
    )) as SubscriptionPaymentRecord | null;

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (payment.status.toLowerCase() === 'paid') {
      throw new BadRequestException('Payment is already completed');
    }

    if (payment.amountCents <= 0) {
      throw new BadRequestException('Payment amount is invalid');
    }

    if (payment.invoiceUrl) {
      return { id: payment.id, payUrl: payment.invoiceUrl };
    }

    const billingContact = await this.getBillingContact(params.clinicId);
    const callbackUrl = `${this.configService.getFrontendAppUrl().replace(/\/$/, '')}/settings?tab=subscription`;

    const link = await this.paymentLinkProvider.createPaymentLink({
      amount: Money.fromCents(payment.amountCents, payment.currency),
      description:
        payment.description ??
        `Subscription payment ${payment.invoiceNumber ?? payment.id}`,
      customer: {
        name:
          billingContact.name ??
          `Clinic ${payment.clinicId.slice(-6).toUpperCase()}`,
        email: billingContact.email ?? undefined,
        phone: billingContact.phoneNumber ?? undefined,
      },
      callbackUrl,
      metadata: {
        source: 'subscription_payment_resume',
        clinicId: payment.clinicId,
        subscriptionPaymentId: payment.id,
        invoiceNumber: payment.invoiceNumber ?? '',
      },
    });

    const payUrl = link.shortUrl || link.url;
    await this.subscriptionRepo.updatePaymentLink({
      clinicId: params.clinicId,
      paymentId: payment.id,
      payUrl,
    });

    return { id: payment.id, payUrl };
  }

  private async getBillingContact(clinicId: string): Promise<{
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
  }> {
    const primaryAdmin = await this.prisma.user.findFirst({
      where: {
        clinicId,
        role: { in: [Role.ADMIN, Role.ADMIN_DOCTOR] },
      },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (primaryAdmin) {
      return primaryAdmin;
    }

    const fallbackUser = await this.prisma.user.findFirst({
      where: { clinicId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fallbackUser) {
      return fallbackUser;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    return {
      name: clinic?.name ?? null,
      email: null,
      phoneNumber: null,
    };
  }
}
