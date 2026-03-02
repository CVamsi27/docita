import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingCalculatorService } from '@/domains/billing/core/services';
import { IInvoiceRepository } from '@/domains/billing/application/ports/invoice.repository.port';

export interface CalculateTotalResult {
  invoiceId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

@Injectable()
export class CalculateInvoiceTotalUseCase {
  constructor(
    private invoiceRepository: IInvoiceRepository,
    private billingCalculator: BillingCalculatorService,
  ) {}

  async execute(invoiceId: string): Promise<CalculateTotalResult> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const items = invoice.getItems();
    const subtotal = this.billingCalculator.calculateItemsSubtotal(items);
    const taxAmount = this.billingCalculator.calculateTotalTax(items);
    const discountAmount = this.billingCalculator.calculateTotalDiscount(items);
    const total = invoice.getTotal();

    return {
      invoiceId,
      subtotal: subtotal.amount,
      taxAmount: taxAmount.amount,
      discountAmount: discountAmount.amount,
      total: total.amount,
    };
  }
}
