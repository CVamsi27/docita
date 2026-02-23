/**
 * Invoice Item Entity - Line item on an invoice
 */

import { Money } from '../value-objects/money.value-object';

export interface InvoiceItemProps {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  taxRate: number; // 0-100
  discount?: number; // 0-100
}

export class InvoiceItem {
  readonly id: string;
  readonly invoiceId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly taxRate: number;
  readonly discount: number;

  constructor(props: InvoiceItemProps) {
    this.id = props.id;
    this.invoiceId = props.invoiceId;
    this.description = props.description;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.taxRate = props.taxRate;
    this.discount = props.discount ?? 0;

    this.validate();
  }

  private validate(): void {
    if (this.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (this.taxRate < 0 || this.taxRate > 100) {
      throw new Error('Tax rate must be between 0 and 100');
    }
    if (this.discount < 0 || this.discount > 100) {
      throw new Error('Discount must be between 0 and 100');
    }
  }

  getSubtotal(): Money {
    return this.unitPrice.multiply(this.quantity);
  }

  getDiscountAmount(): Money {
    const subtotal = this.getSubtotal();
    const discountFactor = this.discount / 100;
    return new Money(
      Math.round(subtotal.amount * discountFactor * 100) / 100,
      subtotal.currency,
    );
  }

  getAmount(): Money {
    return this.getSubtotal().subtract(this.getDiscountAmount());
  }

  getTaxAmount(): Money {
    const amount = this.getAmount();
    const taxFactor = this.taxRate / 100;
    return new Money(
      Math.round(amount.amount * taxFactor * 100) / 100,
      amount.currency,
    );
  }

  getTotal(): Money {
    return this.getAmount().add(this.getTaxAmount());
  }
}
