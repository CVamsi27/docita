/**
 * Abstraction for creating hosted payment links. Two Nest tokens separate
 * Docita SaaS billing links from clinic invoice (Flow B) links — see
 * docs/product/PAYMENT_FLOWS.md. Flow B Razorpay must use clinic credentials from
 * settings (Flow A), not Docita’s merchant.
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

/** Docita SaaS: payment links for subscription / platform revenue (Docita merchant). */
export const DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN = Symbol(
  'DocitaPlatformPaymentLinkProvider',
);

/** Flow B: patient pays clinic — invoice links; must use clinic gateways (e.g. Razorpay from Flow A settings), not Docita’s keys. */
export const CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN = Symbol(
  'ClinicInvoicePaymentLinkProvider',
);
