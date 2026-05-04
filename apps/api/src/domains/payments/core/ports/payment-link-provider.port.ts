/**
 * Abstraction for creating hosted payment links. Two Nest tokens bind
 * implementations separately so Flow A (Docita SaaS) and Flow B (patient pays
 * clinic) never share an injection site — see docs/PAYMENT_FLOWS.md.
 */
import { IPaymentGateway } from '@/domains/payments/core/ports/payment-gateway.port';
import { PaymentLinkStatus } from '@/domains/payments/core/entities/payment-link-status.enum';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

export interface CreatePaymentLinkRequest {
  amount: Money;
  description: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  callbackUrl: string;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}

export interface PaymentLinkResponse {
  id: string;
  url: string;
  shortUrl?: string;
  status: PaymentLinkStatus;
  expiresAt?: Date;
}

export interface IPaymentLinkProvider extends IPaymentGateway {
  createPaymentLink(
    request: CreatePaymentLinkRequest,
  ): Promise<PaymentLinkResponse>;
  getPaymentLink(linkId: string): Promise<PaymentLinkResponse | null>;
  cancelPaymentLink(linkId: string): Promise<void>;
}

/** Flow A: clinic or hospital pays Docita (subscriptions, platform overage). */
export const DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN = Symbol(
  'DocitaPlatformPaymentLinkProvider',
);

/** Flow B: patient pays clinic (invoice payment links; per-clinic adapters). */
export const CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN = Symbol(
  'ClinicInvoicePaymentLinkProvider',
);
