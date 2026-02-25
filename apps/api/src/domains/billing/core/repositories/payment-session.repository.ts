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
  create(data: Prisma.PaymentSessionCreateInput): Promise<PaymentSession>;
  findById(id: string): Promise<PaymentSessionDetail | null>;
  findByProviderSessionId(
    providerSessionId: string,
  ): Promise<PaymentSessionDetail | null>;
  update(
    id: string,
    data: Prisma.PaymentSessionUpdateInput,
  ): Promise<PaymentSession>;
  delete(id: string): Promise<void>;
  findPendingReminders(): Promise<PaymentSessionDetail[]>;
}

export const PAYMENT_SESSION_REPOSITORY_TOKEN = Symbol(
  'IPaymentSessionRepository',
);
