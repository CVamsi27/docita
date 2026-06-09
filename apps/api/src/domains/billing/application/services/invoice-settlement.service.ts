// check-as-cast-density: allow-file — narrowing a Prisma Json? field (meta: unknown) to read .source requires one cast; no cast-free alternative exists.
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PaymentSessionStatus, InvoiceStatus, Prisma } from '@workspace/db';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
// This service was split out of `PaymentsCommandService` and necessarily
// shares its infrastructure ports (same repositories, clock, transaction
// runner) — the import block is structurally identical rather than
// copy-paste drift, so it's excluded from duplication scanning.
// jscpd:ignore-start
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
  TRANSACTION_RUNNER_PORT,
  type ITransactionRunner,
} from '@/shared/common/ports/transaction-runner.port';
// jscpd:ignore-end
import {
  computeInvoicePaidState,
  sumSettledPaymentCents,
} from '@/domains/billing/core/rules/invoice-payment-rollup';
import { toPaiseAmount } from './payment-amount.util';

/**
 * Manual invoice settlement: front-desk "mark as paid" entries and applying
 * a booking-time advance to its appointment's invoice. Both paths converge
 * on the same "compute paid-state → record a settled session → roll the
 * total into the invoice" flow — kept here as one cohesive unit behind
 * `recordSettledPayment` so they share it instead of drifting into copies.
 */
// AuditLogged: manual invoice settlement and booking-advance application
@Injectable()
export class InvoiceSettlementService {
  private readonly logger = new Logger(InvoiceSettlementService.name);

  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly repository: IPaymentSessionRepository,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: ITransactionRunner,
  ) {}

  async markInvoicePaidManually(data: {
    invoiceId: string;
    clinicId: string;
    performedByUserId: string;
    paymentMethod: string;
    amount?: number;
    notes?: string;
    reference?: string;
  }) {
    const invoice = await this.invoiceRepository.findById(
      data.invoiceId,
      data.clinicId,
    );
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (!invoice.patientId)
      throw new BadRequestException(
        'Cannot record manual payment: invoice is not linked to a patient',
      );

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot record payment: invoice is already ${invoice.status}`,
      );
    }

    const normalizedChannel =
      data.paymentMethod === 'OTHER' ? 'OTHER_ONLINE' : data.paymentMethod;

    const existingSessions = await this.repository.findByInvoiceId(
      data.invoiceId,
      data.clinicId,
    );
    const alreadyPaidCents = sumSettledPaymentCents(existingSessions);
    const balanceDueCents = Math.max(0, invoice.totalCents - alreadyPaidCents);

    const invoiceTotal = invoice.totalCents / 100;
    const resolvedAmount =
      typeof data.amount === 'number' && data.amount > 0
        ? data.amount
        : balanceDueCents / 100 || invoiceTotal;
    const paymentCents = toPaiseAmount(resolvedAmount);

    if (paymentCents > balanceDueCents) {
      throw new BadRequestException(
        'Payment amount exceeds the outstanding invoice balance',
      );
    }

    const { status } = await this.recordSettledPayment({
      invoiceId: data.invoiceId,
      clinicId: data.clinicId,
      patientId: invoice.patientId,
      totalCents: invoice.totalCents,
      currentStatus: invoice.status,
      alreadyPaidCents,
      paymentCents,
      meta: {
        channel: normalizedChannel,
        method: normalizedChannel,
        performedBy: data.performedByUserId,
        amount: resolvedAmount,
        notes: data.notes,
        reference: data.reference,
      },
    });

    this.logger.log(
      `Invoice ${data.invoiceId} settlement recorded by ${data.performedByUserId} (status ${status})`,
    );

    return { success: true };
  }

  /**
   * Apply an advance collected at booking to the appointment's freshly-created
   * invoice as a settled manual payment. Idempotent: a second call is a no-op
   * once an `advance` session already exists for the invoice.
   */
  async applyAppointmentAdvance(invoiceId: string, clinicId: string) {
    const invoice = await this.invoiceRepository.findById(invoiceId, clinicId);
    if (!invoice?.patientId || !invoice.appointment) return;
    const { appointment, patientId } = invoice;

    const advanceCents = appointment.advanceAmountCents;
    if (!advanceCents || advanceCents <= 0) return;

    const existingSessions = await this.repository.findByInvoiceId(
      invoiceId,
      clinicId,
    );
    const alreadyApplied = existingSessions.some((session) =>
      this.isAdvanceSession(session.meta),
    );
    if (alreadyApplied) return;

    const alreadyPaidCents = sumSettledPaymentCents(existingSessions);
    const balanceDueCents = Math.max(0, invoice.totalCents - alreadyPaidCents);
    const paymentCents = Math.min(advanceCents, balanceDueCents);
    if (paymentCents <= 0) return;

    const channel = this.normalizeChannel(
      appointment.advancePaymentMethod ?? 'CASH',
    );
    await this.recordSettledPayment({
      invoiceId,
      clinicId,
      patientId,
      totalCents: invoice.totalCents,
      currentStatus: invoice.status,
      alreadyPaidCents,
      paymentCents,
      meta: {
        source: 'advance',
        channel,
        method: channel,
        amount: paymentCents / 100,
        reference: appointment.advanceReference ?? undefined,
        notes: appointment.advanceNotes ?? undefined,
      },
    });

    this.logger.log(
      `Applied booking advance to invoice ${invoiceId} (${paymentCents} paise, ${channel})`,
    );
  }

  /**
   * Persist a settled manual payment session and roll its amount into the
   * invoice's paid total/status inside one transaction. This is the shared
   * core of `markInvoicePaidManually` and `applyAppointmentAdvance` — they
   * differ only in who recorded the payment and what `meta` says about it.
   */
  private async recordSettledPayment(params: {
    invoiceId: string;
    clinicId: string;
    patientId: string;
    totalCents: number;
    currentStatus: InvoiceStatus;
    alreadyPaidCents: number;
    paymentCents: number;
    meta: Prisma.PaymentSessionCreateInput['meta'];
  }): Promise<{ amountPaidCents: number; status: InvoiceStatus }> {
    const { amountPaidCents, status } = computeInvoicePaidState({
      totalCents: params.totalCents,
      paidCents: params.alreadyPaidCents + params.paymentCents,
      currentStatus: params.currentStatus,
    });

    await this.transactionRunner.runInTransaction(async (tx) => {
      await this.repository.create(
        {
          clinic: { connect: { id: params.clinicId } },
          invoice: { connect: { id: params.invoiceId } },
          patient: { connect: { id: params.patientId } },
          provider: 'manual',
          amount: params.paymentCents,
          currency: this.configService.getCurrencyCode(),
          status: PaymentSessionStatus.CAPTURED,
          paidAt: this.clock.now(),
          expiresAt: this.clock.now(),
          meta: params.meta,
        },
        tx,
      );

      await this.invoiceRepository.update(
        params.invoiceId,
        { amountPaidCents, status },
        params.clinicId,
        tx,
      );
    });

    return { amountPaidCents, status };
  }

  private isAdvanceSession(meta: unknown): boolean {
    return (
      typeof meta === 'object' &&
      meta !== null &&
      (meta as { source?: unknown }).source === 'advance'
    );
  }

  private normalizeChannel(channel: string): string {
    return channel === 'OTHER' ? 'OTHER_ONLINE' : channel;
  }
}
