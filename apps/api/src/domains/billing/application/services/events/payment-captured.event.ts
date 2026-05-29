export class PaymentCapturedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly clinicId: string,
    public readonly providerPaymentId: string,
    public readonly amountPaise: number,
  ) {}
}
