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
  raw: any;
}

export interface IPaymentProvider {
  createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentProviderLink>;
  verifySignature(payload: any, signature: string): boolean;
}
