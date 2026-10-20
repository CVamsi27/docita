import { PaymentSession, Prisma } from '@workspace/db';

export interface PaymentSessionDetail extends PaymentSession {
  patient?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
  } | null;
  invoice?: {
    id: string;
    dueDate: Date | null;
  } | null;
  clinic?: {
    name: string;
    phone: string | null;
  } | null;
}

export interface IPaymentSessionRepository {
  create(
    data: Prisma.PaymentSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentSession>;
  findById(id: string, clinicId: string): Promise<PaymentSessionDetail | null>;
  /**
   * Lookup by provider-session-id is intentionally not clinic-scoped because
   * provider webhooks deliver the session id without tenant context. Callers
   * MUST verify the resolved `clinicId` against the action they are about to
   * perform before mutating any related state.
   */
  findByProviderSessionId(
    providerSessionId: string,
  ): Promise<PaymentSessionDetail | null>;
  findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentSessionDetail | null>;
  update(
    id: string,
    data: Prisma.PaymentSessionUpdateInput,
    clinicId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentSession>;
  delete(id: string, clinicId: string): Promise<void>;
  findPendingReminders(): Promise<PaymentSessionDetail[]>;
  findByInvoiceId(
    invoiceId: string,
    clinicId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentSession[]>;
  /** Settled (CAPTURED/PAID) sessions recorded within [from, to) for a clinic. */
  findSettledByClinicInRange(
    clinicId: string,
    from: Date,
    to: Date,
  ): Promise<PaymentSession[]>;

  /**
   * Atomically claims a session for capture. Returns `true` when this call is
   * the one that moved the session out of a capturable state, `false` when a
   * concurrent webhook delivery or reconciliation run already captured it.
   * The conditional UPDATE is the single-winner guarantee: the read-based
   * replay guard alone lets two concurrent deliveries both proceed.
   */
  tryMarkCaptured(
    id: string,
    clinicId: string,
    data: Prisma.PaymentSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean>;

  /**
   * Recent sessions that still have no provider payment id, oldest first.
   * Reconciliation reads the provider for each order and applies a captured
   * payment that no webhook delivery ever recorded.
   */
  findReconciliationCandidates(
    createdSince: Date,
    take: number,
  ): Promise<PaymentSessionDetail[]>;
}

export const PAYMENT_SESSION_REPOSITORY_TOKEN = Symbol(
  'IPaymentSessionRepository',
);
