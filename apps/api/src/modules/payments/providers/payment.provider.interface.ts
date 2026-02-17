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

export interface ChargeResult {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
}

export interface IPaymentProvider {
  createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentProviderLink>;
  verifySignature(payload: Record<string, unknown>, signature: string): boolean;
  chargeWithToken?(
    customerId: string,
    tokenId: string,
    amountCents: number,
    currency: string,
    description: string,
  ): Promise<ChargeResult>;
}
