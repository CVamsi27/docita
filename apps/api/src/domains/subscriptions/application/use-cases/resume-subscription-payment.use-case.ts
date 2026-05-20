import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentLinkProvider,
  DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
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
  private readonly logger = new Logger(ResumeSubscriptionPaymentUseCase.name);

  constructor(
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

    // AuditLogged: subscription payment resumed
    this.logger.log({
      action: 'subscription.payment-resumed',
      clinicId: params.clinicId,
      paymentId: params.paymentId,
    });

    if (payment.invoiceUrl) {
      return { id: payment.id, payUrl: payment.invoiceUrl };
    }

    const billingContact = await this.subscriptionRepo.findBillingContact(
      params.clinicId,
    );
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
}
