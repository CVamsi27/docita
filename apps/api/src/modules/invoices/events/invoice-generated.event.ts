export class InvoiceGeneratedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly clinicId: string,
  ) {}
}
