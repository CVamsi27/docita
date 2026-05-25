import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { PaymentWebhookPayload } from '@workspace/types';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/invoice.repository';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  BILLING_PERSISTENCE_PORT,
  type BillingPersistencePort,
} from '@/domains/billing/application/ports/billing-persistence.port';
import {
  IOrderProvider,
  ORDER_PROVIDER_TOKEN,
} from '@/domains/payments/core/ports/order-provider.port';

/**
 * Clinic-invoice Razorpay webhook handler. Subscription webhooks live in a
 * separate domain — this service is concerned only with Flow B (clinic
 * invoice payment).
 *
 * Signature verification happens upstream in `WebhooksController`; this
 * service is responsible only for downstream state mutation.
 */
// AuditLogged: clinic-invoice Razorpay webhook processing
@Injectable()
export class RazorpayInvoiceWebhookService {
  private readonly logger = new Logger(RazorpayInvoiceWebhookService.name);

  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(ORDER_PROVIDER_TOKEN)
    private readonly orderProvider: IOrderProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    @Inject(BILLING_PERSISTENCE_PORT)
    private readonly persistence: BillingPersistencePort,
  ) {}

  async handle(payload: PaymentWebhookPayload, signature: string) {
    const event = payload?.event;
    const signaturePresent =
      typeof signature === 'string' && signature.length > 0;

    // Audit P-FL1 (2026-05-23). Only payment.captured is implemented today;
    // payment.failed / payment_link.paid / refund.processed are acked
    // without processing so the upstream webhook store does not flag a
    // critical failure on known events.
    if (event !== 'payment.captured') {
      this.logger.log(
        `Razorpay webhook event '${event}' acknowledged without processing (only payment.captured is implemented)`,
        { event, signaturePresent },
      );
      return { status: 'ignored', event };
    }

    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity) {
      throw new BadRequestException(
        'payment.captured webhook is missing payload.payment.entity',
      );
    }

    const razorpayPaymentId = paymentEntity.id;
    const orderId = paymentEntity.order_id;

    // 1. Resolve invoiceId — prefer payment notes, fall back to order notes.
    const resolvedInvoiceId =
      readStringField(paymentEntity.notes, 'invoiceId') ??
      (orderId
        ? readStringField(
            (await this.orderProvider.getOrder(orderId))?.metadata,
            'invoiceId',
          )
        : undefined);

    if (!resolvedInvoiceId) {
      throw new BadRequestException(
        `payment.captured webhook (payment=${razorpayPaymentId}) could not be matched to a docita invoice — notes.invoiceId missing on both payment and order`,
      );
    }
    const invoiceId: string = resolvedInvoiceId;

    // 2. Load the invoice. Webhooks have no tenant context; we use the
    // unscoped lookup and tenant-scope subsequent writes via clinicId.
    const invoice = await this.invoiceRepository.findByIdUnscoped(invoiceId);
    if (!invoice) {
      throw new NotFoundException(
        `Invoice ${invoiceId} referenced by Razorpay payment ${razorpayPaymentId} not found`,
      );
    }
    const { clinicId, patientId } = invoice;
    if (!clinicId) {
      throw new BadRequestException(
        `Invoice ${invoiceId} has no clinicId — cannot record payment from webhook`,
      );
    }
    if (!patientId) {
      throw new BadRequestException(
        `Invoice ${invoiceId} has no patientId — cannot record payment from webhook`,
      );
    }

    // 3. Terminal-state idempotency.
    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      this.logger.log(
        `Razorpay payment.captured (payment=${razorpayPaymentId}) ignored — invoice ${invoiceId} already ${invoice.status}`,
      );
      return {
        status: 'already_settled',
        invoiceId,
        invoiceStatus: invoice.status,
      };
    }

    // 4. Per-payment idempotency.
    const existingSessions = await this.repository.findByInvoiceId(
      invoiceId,
      clinicId,
    );
    const alreadyRecorded = existingSessions.some(
      (session) =>
        readStringField(session.meta, 'razorpayPaymentId') ===
        razorpayPaymentId,
    );
    if (alreadyRecorded) {
      this.logger.log(
        `Razorpay payment.captured (payment=${razorpayPaymentId}) ignored — PaymentSession with this razorpayPaymentId already exists for invoice ${invoiceId}`,
      );
      return { status: 'duplicate', invoiceId, razorpayPaymentId };
    }

    // 5. Write session + flip invoice atomically (same ordering as P-FL2).
    await this.persistence.$transaction(async (tx) => {
      await tx.paymentSession.create({
        data: {
          clinic: { connect: { id: clinicId } },
          invoice: { connect: { id: invoiceId } },
          patient: { connect: { id: patientId } },
          provider: 'razorpay',
          providerSessionId: orderId,
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
          status: PaymentSessionStatus.CAPTURED,
          expiresAt: this.clock.now(),
          meta: toPrismaInputJsonValue({
            razorpayPaymentId,
            razorpayOrderId: orderId,
            event,
            source: 'webhook',
          }),
        },
      });

      const result = await tx.invoice.updateMany({
        where: { id: invoiceId, clinicId },
        data: { status: InvoiceStatus.PAID },
      });
      if (result.count === 0) {
        throw new NotFoundException(
          `Invoice ${invoiceId} not found while applying payment ${razorpayPaymentId}`,
        );
      }
    });

    this.logger.log(
      `Razorpay payment.captured applied — invoice=${invoiceId} payment=${razorpayPaymentId}`,
    );

    return { status: 'captured', invoiceId, razorpayPaymentId };
  }
}

function readStringField(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== 'object' || !(key in source))
    return undefined;
  const value: unknown = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
