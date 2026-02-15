export interface CreatePaymentLinkDto {
  amount: number;
  currency: string;
  description: string;
  customer: {
    name: string;
    email?: string;
    contact: string;
  };
  callbackUrl: string;
}

export interface PaymentProviderLink {
  id: string;
  shortUrl: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface IPaymentProvider {
  createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentProviderLink>;
  verifySignature(payload: Record<string, unknown>, signature: string): boolean;
}
