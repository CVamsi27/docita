import type {
  CalculateInvoiceTaxInput,
  CalculatedInvoiceTax,
} from '@/domains/billing/core/services/tax-calculator.service';

export type { CalculateInvoiceTaxInput, CalculatedInvoiceTax };

export interface IInvoiceTaxCalculator {
  calculateInvoice(input: CalculateInvoiceTaxInput): CalculatedInvoiceTax;
}

export const INVOICE_TAX_CALCULATOR_TOKEN = 'IInvoiceTaxCalculator';
