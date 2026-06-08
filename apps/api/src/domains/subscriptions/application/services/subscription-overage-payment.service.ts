import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentLinkProvider,
  DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { Role } from '@workspace/db';
import { OverageInvoiceComposer } from '@/domains/subscriptions/infrastructure/schedulers/overage-invoice.composer';

// AuditLogged: subscription overage invoice/payment recovery is billing-sensitive.
@Injectable()
/**
 * Facade for overage-payment recovery; persistence, payment-provider calls, and
 * invoice text composition stay behind injected ports/services.
 */
export class SubscriptionOveragePaymentService {
  private readonly logger = new Logger(SubscriptionOveragePaymentService.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    private readonly configService: AppConfigService,
    @Inject(DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN)
    private readonly paymentLinkProvider: IPaymentLinkProvider,
    private readonly invoiceComposer: OverageInvoiceComposer,
  ) {}

  async createOrUpdateOverageInvoicePayment(params: {
    clinicId: string;
    subscriptionId: string;
    periodStart: Date;
    periodEnd: Date;
    totalOverageCharges: number;
    currency: string;
    breakdown: Record<
      string,
      { quantity: number; rate: number; charge: number }
    >;
  }): Promise<void> {
    const {
      clinicId,
      subscriptionId,
      periodStart,
      periodEnd,
      totalOverageCharges,
      currency,
      breakdown,
    } = params;

    const amountCents = Math.round(totalOverageCharges * 100);
    const invoiceNumber = this.invoiceComposer.buildOverageInvoiceNumber(
      clinicId,
      periodStart,
    );
    const description = this.invoiceComposer.buildOverageDescription(
      periodStart,
      periodEnd,
      currency,
      breakdown,
    );

    let payment = await this.persistence.subscriptionPayment.upsert({
      where: {
        clinicId_invoiceNumber: {
          clinicId,
          invoiceNumber,
        },
      },
      update: {
        subscriptionId,
        amountCents,
        currency,
        description,
      },
      create: {
        clinicId,
        subscriptionId,
        amountCents,
        currency,
        status: 'pending',
        invoiceNumber,
        description,
      },
    });

    const normalizedStatus = payment.status.toLowerCase();
    if (normalizedStatus !== 'paid' && normalizedStatus !== 'pending') {
      payment = await this.persistence.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: 'pending' },
      });
    }

    await this.ensureOveragePaymentLink(payment);
  }

  async ensureOveragePaymentLink(payment: {
    id: string;
    clinicId: string;
    amountCents: number;
    currency: string;
    status: string;
    invoiceUrl: string | null;
    invoiceNumber: string | null;
    description: string | null;
  }): Promise<void> {
    if (payment.amountCents <= 0) return;
    if (payment.invoiceUrl) return;
    if (payment.status.toLowerCase() !== 'pending') return;
    if (!this.configService.getRazorpayKeyId()) return;
    if (!this.configService.getRazorpayKeySecret()) return;

    const billingContact = await this.getBillingContact(payment.clinicId);
    const callbackUrl = `${this.configService.getFrontendAppUrl().replace(/\/$/, '')}/settings?tab=billing`;

    try {
      const link = await this.paymentLinkProvider.createPaymentLink({
        amount: Money.fromCents(payment.amountCents, payment.currency),
        description:
          payment.description ??
          `Subscription usage overage ${payment.invoiceNumber ?? payment.id}`,
        customer: {
          name:
            billingContact.name ??
            `Clinic ${payment.clinicId.slice(-6).toUpperCase()}`,
          email: billingContact.email ?? undefined,
          phone: billingContact.phoneNumber ?? undefined,
        },
        callbackUrl,
        metadata: {
          source: 'subscription_overage',
          clinicId: payment.clinicId,
          subscriptionPaymentId: payment.id,
          invoiceNumber: payment.invoiceNumber ?? '',
        },
      });

      await this.persistence.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          invoiceUrl: link.shortUrl || link.url,
          razorpayOrderId: link.id,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create overage payment link for payment ${payment.id}`,
        error,
      );
    }
  }

  private async getBillingContact(clinicId: string): Promise<{
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
  }> {
    // jscpd:ignore-start
    const primaryAdmin = await this.persistence.user.findFirst({
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

    if (primaryAdmin) return primaryAdmin;

    const fallbackUser = await this.persistence.user.findFirst({
      where: { clinicId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fallbackUser) return fallbackUser;
    // jscpd:ignore-end

    const clinic = await this.persistence.clinic.findUnique({
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
