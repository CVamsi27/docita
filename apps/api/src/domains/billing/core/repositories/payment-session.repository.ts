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
  } | null;
  clinic?: {
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
  ): Promise<PaymentSession[]>;
}

export const PAYMENT_SESSION_REPOSITORY_TOKEN = Symbol(
  'IPaymentSessionRepository',
);
