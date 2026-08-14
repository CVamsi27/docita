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
  isRecord,
  isSubscriptionBillingRowPaid,
  resolveSubscriptionBillingContact,
} from '@workspace/utils';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  CLINIC_OPERATIONS_TOKEN,
  IClinicOperations,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { parseSubscriptionPaymentLookup } from '@/domains/subscriptions/application/services/subscription-payment-history.types';

type SubscriptionPaymentRecord = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  paidAt?: Date | null;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
  description?: string | null;
};

function parseResumeSubscriptionPayment(
  value: unknown,
): SubscriptionPaymentRecord | null {
  const base = parseSubscriptionPaymentLookup(value);
  if (!base || !isRecord(value)) {
    return null;
  }

  return {
    ...base,
    invoiceUrl: typeof value.invoiceUrl === 'string' ? value.invoiceUrl : null,
    invoiceNumber:
      typeof value.invoiceNumber === 'string' ? value.invoiceNumber : null,
    description:
      typeof value.description === 'string' ? value.description : null,
  };
}

@Injectable()
export class ResumeSubscriptionPaymentUseCase {
  private readonly logger = new Logger(ResumeSubscriptionPaymentUseCase.name);

  constructor(
    private readonly configService: AppConfigService,
    @Inject(DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN)
    private readonly paymentLinkProvider: IPaymentLinkProvider,
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
  ) {}

  async execute(params: { clinicId: string; paymentId: string }) {
    const payment = parseResumeSubscriptionPayment(
      await this.subscriptionRepo.findPaymentById(
        params.clinicId,
        params.paymentId,
      ),
    );

    if (!payment) throw new BadRequestException('Payment not found');

    if (isSubscriptionBillingRowPaid(payment.status, payment.paidAt)) {
      throw new BadRequestException('Payment is already completed');
    }

    if (payment.amountCents <= 0)
      throw new BadRequestException('Payment amount is invalid');

    // AuditLogged: subscription payment resumed
    this.logger.log({
      action: 'subscription.payment-resumed',
      clinicId: params.clinicId,
      paymentId: params.paymentId,
    });

    if (payment.invoiceUrl) {
      return { id: payment.id, payUrl: payment.invoiceUrl };
    }

    const [billingContact, clinic] = await Promise.all([
      this.subscriptionRepo.findBillingContact(params.clinicId),
      this.clinicOps.getClinicDetails(params.clinicId),
    ]);
    const razorpayContact = resolveSubscriptionBillingContact({
      billingContact,
      clinic,
    });
    const callbackUrl = `${this.configService.getFrontendAppUrl().replace(/\/$/, '')}/settings?tab=subscription&resolvePayment=1`;

    const link = await this.paymentLinkProvider.createPaymentLink({
      amount: Money.fromCents(payment.amountCents, payment.currency),
      description:
        payment.description ??
        `Subscription payment ${payment.invoiceNumber ?? payment.id}`,
      customer: {
        name: razorpayContact.name,
        email: razorpayContact.email,
        phone: razorpayContact.phone,
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
