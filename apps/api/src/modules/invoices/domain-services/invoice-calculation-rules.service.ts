import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Invoice Calculation Rules Domain Service
 * Encapsulates all business logic for invoice calculations
 * Handles tax, discounts, insurance deductions, and payment terms
 */
export interface InvoiceCalculationRulesInterface {
  calculateItemAmount(
    quantity: number,
    unitPrice: number,
  ): { amount: number; error?: string };

  calculateTaxAmount(subtotal: number, taxRate: number): number;

  calculateDiscountAmount(
    subtotal: number,
    discountType: 'FIXED' | 'PERCENTAGE',
    discountValue: number,
  ): { amount: number; error?: string };

  calculateInsuranceDeduction(
    amount: number,
    insuranceCoverage: number,
  ): number;

  calculateTotal(invoice: InvoiceCalculationData): InvoiceCalculationResult;

  calculateDueDate(invoiceDate: Date, paymentTermsDays: number): Date;

  validatePricing(items: PricingItem[]): { valid: boolean; errors: string[] };

  calculateLateFees(
    amount: number,
    daysPastDue: number,
    lateFeePercentage: number,
  ): number;

  recalculateInvoiceAmounts(
    invoiceId: string,
  ): Promise<InvoiceCalculationResult>;
}

/**
 * Raw invoice item from database (JSON field)
 */
interface RawInvoiceItem {
  quantity?: number | string;
  unitPrice?: number | string;
  taxRate?: number | string;
  discountType?: 'FIXED' | 'PERCENTAGE' | string;
  discountValue?: number | string;
}

interface PricingItem {
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountValue?: number;
}

interface InvoiceCalculationData {
  items: PricingItem[];
  subtotal: number;
  discount?: { type: 'FIXED' | 'PERCENTAGE'; value: number };
  insuranceCoverage?: number;
  taxRate?: number;
  paymentTermsDays?: number;
}

interface InvoiceCalculationResult {
  subtotal: number;
  totalDiscount: number;
  subtotalAfterDiscount: number;
  tax: number;
  insuranceDeduction: number;
  total: number;
  amountDue: number;
  dueDate?: Date;
}

@Injectable()
export class InvoiceCalculationRulesService implements InvoiceCalculationRulesInterface {
  // Constants
  private readonly DEFAULT_TAX_RATE = 0.18; // 18% GST for India
  private readonly LATE_FEE_PERCENTAGE = 0.02; // 2% per month late
  private readonly PAYMENT_TERMS_DAYS = 30; // Default 30 days
  private readonly ROUNDING_PRECISION = 2; // 2 decimal places

  constructor(private prisma: PrismaService) {}

  /**
   * Convert raw invoice items to properly typed PricingItem
   */
  private convertToPricingItems(rawItems: unknown[]): PricingItem[] {
    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems
      .map((item: any) => {
        // Safely convert to PricingItem with defaults
        const converted: PricingItem = {
          quantity: Number(item?.quantity ?? 0) || 0,
          unitPrice: Number(item?.unitPrice ?? 0) || 0,
          taxRate:
            Number(item?.taxRate ?? this.DEFAULT_TAX_RATE) ||
            this.DEFAULT_TAX_RATE,
          discountType:
            item?.discountType === 'FIXED' ||
            item?.discountType === 'PERCENTAGE'
              ? item.discountType
              : undefined,
          discountValue: item?.discountValue
            ? Number(item.discountValue)
            : undefined,
        };
        return converted;
      })
      .filter((item) => item.quantity > 0 && item.unitPrice > 0);
  }

  /**
   * Calculate line item amount (quantity * unit price)
   */
  calculateItemAmount(
    quantity: number,
    unitPrice: number,
  ): { amount: number; error?: string } {
    if (quantity <= 0) {
      return {
        amount: 0,
        error: 'Quantity must be greater than 0',
      };
    }

    if (unitPrice < 0) {
      return {
        amount: 0,
        error: 'Unit price cannot be negative',
      };
    }

    const amount = Number(
      (quantity * unitPrice).toFixed(this.ROUNDING_PRECISION),
    );

    return { amount };
  }

  /**
   * Calculate tax amount on a subtotal
   */
  calculateTaxAmount(subtotal: number, taxRate: number): number {
    if (subtotal < 0 || taxRate < 0 || taxRate > 1) {
      return 0;
    }

    return Number((subtotal * taxRate).toFixed(this.ROUNDING_PRECISION));
  }

  /**
   * Calculate discount amount (fixed or percentage)
   */
  calculateDiscountAmount(
    subtotal: number,
    discountType: 'FIXED' | 'PERCENTAGE',
    discountValue: number,
  ): { amount: number; error?: string } {
    if (subtotal < 0) {
      return {
        amount: 0,
        error: 'Subtotal cannot be negative',
      };
    }

    if (discountValue < 0) {
      return {
        amount: 0,
        error: 'Discount value cannot be negative',
      };
    }

    let discountAmount = 0;

    if (discountType === 'FIXED') {
      discountAmount = Math.min(discountValue, subtotal); // Can't discount more than subtotal
    } else if (discountType === 'PERCENTAGE') {
      if (discountValue > 100) {
        return {
          amount: 0,
          error: 'Discount percentage cannot exceed 100%',
        };
      }

      discountAmount = Number(
        (subtotal * (discountValue / 100)).toFixed(this.ROUNDING_PRECISION),
      );
    }

    return { amount: discountAmount };
  }

  /**
   * Calculate amount covered by insurance
   */
  calculateInsuranceDeduction(
    amount: number,
    insuranceCoverage: number,
  ): number {
    if (amount < 0 || insuranceCoverage < 0 || insuranceCoverage > 100) {
      return 0;
    }

    return Number(
      (amount * (insuranceCoverage / 100)).toFixed(this.ROUNDING_PRECISION),
    );
  }

  /**
   * Calculate complete invoice totals
   */
  calculateTotal(invoice: InvoiceCalculationData): InvoiceCalculationResult {
    const subtotal = Number(invoice.subtotal.toFixed(this.ROUNDING_PRECISION));

    // Apply discount
    let discount = 0;
    if (invoice.discount) {
      const discountCalc = this.calculateDiscountAmount(
        subtotal,
        invoice.discount.type,
        invoice.discount.value,
      );
      discount = discountCalc.amount ?? 0;
    }

    const subtotalAfterDiscount = Number(
      (subtotal - discount).toFixed(this.ROUNDING_PRECISION),
    );

    // Calculate tax
    const taxRate = invoice.taxRate ?? this.DEFAULT_TAX_RATE;
    const tax = this.calculateTaxAmount(subtotalAfterDiscount, taxRate);

    // Calculate insurance deduction
    const insuranceDeduction = this.calculateInsuranceDeduction(
      subtotalAfterDiscount,
      invoice.insuranceCoverage ?? 0,
    );

    // Calculate total and amount due
    const total = Number(
      (subtotalAfterDiscount + tax).toFixed(this.ROUNDING_PRECISION),
    );

    const amountDue = Number(
      (total - insuranceDeduction).toFixed(this.ROUNDING_PRECISION),
    );

    return {
      subtotal,
      totalDiscount: discount,
      subtotalAfterDiscount,
      tax,
      insuranceDeduction,
      total,
      amountDue,
      dueDate: invoice.paymentTermsDays
        ? this.calculateDueDate(new Date(), invoice.paymentTermsDays)
        : undefined,
    };
  }

  /**
   * Calculate invoice due date based on payment terms
   */
  calculateDueDate(invoiceDate: Date, paymentTermsDays: number): Date {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);
    return dueDate;
  }

  /**
   * Validate all pricing data
   */
  validatePricing(items: PricingItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!items || items.length === 0) {
      errors.push('Invoice must have at least one item');
      return { valid: false, errors };
    }

    items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }

      if (item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`);
      }

      if (item.taxRate < 0 || item.taxRate > 1) {
        errors.push(`Item ${index + 1}: Tax rate must be between 0 and 1`);
      }

      if (item.discountValue && item.discountValue < 0) {
        errors.push(`Item ${index + 1}: Discount value cannot be negative`);
      }

      if (
        item.discountType === 'PERCENTAGE' &&
        item.discountValue &&
        item.discountValue > 100
      ) {
        errors.push(
          `Item ${index + 1}: Discount percentage cannot exceed 100%`,
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate late fees for overdue invoices
   */
  calculateLateFees(
    amount: number,
    daysPastDue: number,
    lateFeePercentage: number = this.LATE_FEE_PERCENTAGE,
  ): number {
    if (amount <= 0 || daysPastDue <= 0) {
      return 0;
    }

    // Calculate number of months past due
    const monthsPastDue = Math.ceil(daysPastDue / 30);

    // Calculate accumulated late fees (compound)
    let lateFees = 0;
    for (let i = 0; i < monthsPastDue; i++) {
      lateFees = (lateFees + amount) * (1 + lateFeePercentage);
    }

    lateFees -= amount; // Remove original amount

    return Number(lateFees.toFixed(this.ROUNDING_PRECISION));
  }

  /**
   * Recalculate all amounts for an existing invoice
   */
  async recalculateInvoiceAmounts(
    invoiceId: string,
  ): Promise<InvoiceCalculationResult> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Recalculate line items
    const items: PricingItem[] = this.convertToPricingItems(
      (invoice.items as unknown[]) || [],
    );

    const subtotal = items.reduce((sum, item) => {
      const { amount } = this.calculateItemAmount(
        item.quantity,
        item.unitPrice,
      );
      return sum + amount;
    }, 0);

    const calculation = this.calculateTotal({
      items,
      subtotal,
      discount: undefined,
      insuranceCoverage: 0,
      taxRate: this.DEFAULT_TAX_RATE,
    });

    return calculation;
  }
}
