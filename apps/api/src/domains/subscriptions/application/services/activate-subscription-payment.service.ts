import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';

export type SubscriptionPaymentRecord = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
};

export type ResolveSubscriptionPaymentInput = {
  clinicId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  payableAmountPaise: number;
  skipPaymentVerification?: boolean;
  verifiedAmountCents?: number;
};

@Injectable()
export class ActivateSubscriptionPaymentService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async resolvePaymentForActivation(
    input: ResolveSubscriptionPaymentInput,
  ): Promise<{
    payment: SubscriptionPaymentRecord;
    verifiedAmountCents: number | undefined;
  }> {
    const payment = (await this.subscriptionRepo.findPaymentByOrderId(
      input.clinicId,
      input.razorpayOrderId,
    )) as SubscriptionPaymentRecord | null;

    if (!payment) {
      throw new BadRequestException('Payment order not found for this clinic');
    }

    if (payment.amountCents !== input.payableAmountPaise) {
      throw new BadRequestException(
        'Payment amount does not match checkout quote',
      );
    }

    let verifiedAmountCents = input.verifiedAmountCents;
    if (!input.skipPaymentVerification) {
      const verification = await this.paymentGateway.verifyPayment({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      });

      if (!verification.verified) {
        throw new BadRequestException('Unable to verify payment');
      }

      if (
        verification.orderId &&
        verification.orderId !== input.razorpayOrderId
      ) {
        throw new BadRequestException('Payment order verification failed');
      }

      verifiedAmountCents = verification.amountCents;
    }

    if (
      verifiedAmountCents !== undefined &&
      verifiedAmountCents !== payment.amountCents
    ) {
      throw new BadRequestException(
        'Payment amount does not match selected plan',
      );
    }

    return { payment, verifiedAmountCents };
  }
}
