import { Money } from '@/domains/billing/core/value-objects/money.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

export interface InvoiceItemProps {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  taxRate: number;
  discount?: number;
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
      throw new InvariantViolationError('Quantity must be greater than 0');
    }
    if (this.taxRate < 0 || this.taxRate > 100) {
      throw new InvariantViolationError('Tax rate must be between 0 and 100');
    }
    if (this.discount < 0 || this.discount > 100) {
      throw new InvariantViolationError('Discount must be between 0 and 100');
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
