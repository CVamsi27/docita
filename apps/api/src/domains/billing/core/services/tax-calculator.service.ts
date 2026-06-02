import { Injectable } from '@nestjs/common';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import {
  calculateInvoiceLineAmounts,
  roundCurrency,
  sumCurrency,
  type InvoiceLineAmounts,
} from '@workspace/utils';
import {
  invoiceTaxSummarySchema,
  taxRegistrationSnapshotSchema,
  DEFAULT_TAX_COUNTRY_CODE,
  DEFAULT_TAX_CURRENCY,
  DEFAULT_TAX_REGIME,
  type InvoiceItem,
  type InvoiceTaxSummary,
  type PlaceOfSupply,
  type TaxComponent,
  type TaxInvoiceType,
  type TaxRegistrationSnapshot,
} from '@workspace/types';

export interface CalculateInvoiceTaxInput {
  items: InvoiceItem[];
  currency?: string;
  seller?: Partial<TaxRegistrationSnapshot>;
  buyer?: Partial<TaxRegistrationSnapshot>;
  placeOfSupply?: PlaceOfSupply;
  reverseCharge?: boolean;
}

export interface CalculatedInvoiceTax {
  items: InvoiceItem[];
  summary: InvoiceTaxSummary;
  invoiceType: TaxInvoiceType;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}

interface LineAmounts extends InvoiceLineAmounts {
  components: TaxComponent[];
}

const normalizeStateCode = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : undefined;
};

@Injectable()
export class TaxCalculatorService {
  calculateInvoice(input: CalculateInvoiceTaxInput): CalculatedInvoiceTax {
    const seller = taxRegistrationSnapshotSchema.parse({
      countryCode: DEFAULT_TAX_COUNTRY_CODE,
      regime: DEFAULT_TAX_REGIME,
      ...input.seller,
    });
    const buyer = taxRegistrationSnapshotSchema.parse({
      countryCode: seller.countryCode,
      regime: seller.regime,
      ...input.buyer,
    });
    const hasPotentialTaxableSupply = input.items.some(
      (item) =>
        (item.taxTreatment ?? 'EXEMPT_HEALTHCARE') === 'TAXABLE' &&
        (item.taxRate ?? 0) > 0,
    );
    const placeOfSupply = this.resolvePlaceOfSupply(
      seller,
      buyer,
      input.placeOfSupply,
    );
    if (hasPotentialTaxableSupply && !placeOfSupply.stateCode) {
      throw new InvariantViolationError(
        'Place of supply state is required for taxable invoices',
      );
    }
    const currency = input.currency ?? DEFAULT_TAX_CURRENCY;

    const lineResults = input.items.map((item) =>
      this.calculateLine(item, seller, placeOfSupply),
    );
    const calculatedItems = input.items.map((item, index) => {
      const line = lineResults[index];
      const unitPrice = item.unitPrice ?? item.price;
      const taxTreatment = item.taxTreatment ?? 'EXEMPT_HEALTHCARE';
      const taxRate = item.taxRate ?? 0;
      return {
        ...item,
        price: unitPrice,
        unitPrice,
        discountAmount: line.discount,
        taxTreatment,
        taxRate,
        taxableAmount: line.taxableAmount,
        taxAmount: line.taxAmount,
        taxComponents: line.components,
        lineTotal: roundCurrency(line.netAmount + line.taxAmount),
      };
    });

    const subtotal = sumCurrency(lineResults.map((line) => line.subtotal));
    const discountTotal = sumCurrency(lineResults.map((line) => line.discount));
    const taxableAmount = sumCurrency(
      lineResults.map((line) => line.taxableAmount),
    );
    const exemptAmount = sumCurrency(
      lineResults.map((line) => line.exemptAmount),
    );
    const taxTotal = sumCurrency(lineResults.map((line) => line.taxAmount));
    const grandTotal = roundCurrency(subtotal - discountTotal + taxTotal);
    const components = this.aggregateComponents(
      lineResults.flatMap((line) => line.components),
    );
    const hasTaxableSupply = taxableAmount > 0;
    const invoiceType: TaxInvoiceType = hasTaxableSupply
      ? 'TAX_INVOICE'
      : 'BILL_OF_SUPPLY';

    const summary = invoiceTaxSummarySchema.parse({
      countryCode: seller.countryCode,
      regime: seller.regime,
      currency,
      subtotal,
      discountTotal,
      taxableAmount,
      exemptAmount,
      taxTotal,
      grandTotal,
      components,
      reverseCharge: input.reverseCharge ?? false,
      placeOfSupply,
      documentTitle:
        invoiceType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Bill of Supply',
      eInvoice: { required: false },
    });

    return {
      items: calculatedItems,
      summary,
      invoiceType,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };
  }

  private calculateLine(
    item: InvoiceItem,
    seller: TaxRegistrationSnapshot,
    placeOfSupply: PlaceOfSupply,
  ): LineAmounts {
    const taxTreatment = item.taxTreatment ?? 'EXEMPT_HEALTHCARE';
    const isTaxable =
      seller.countryCode === DEFAULT_TAX_COUNTRY_CODE &&
      seller.regime === DEFAULT_TAX_REGIME &&
      taxTreatment === 'TAXABLE' &&
      (item.taxRate ?? 0) > 0;
    const line = calculateInvoiceLineAmounts(item, { taxable: isTaxable });

    if (!isTaxable) {
      return {
        ...line,
        components: [],
      };
    }

    const taxRate = item.taxRate ?? 0;
    const components = this.calculateIndianComponents(
      line.netAmount,
      taxRate,
      line.taxAmount,
      seller,
      placeOfSupply,
    );

    return {
      ...line,
      components,
    };
  }

  private calculateIndianComponents(
    taxableAmount: number,
    taxRate: number,
    taxAmount: number,
    seller: TaxRegistrationSnapshot,
    placeOfSupply: PlaceOfSupply,
  ): TaxComponent[] {
    const sellerState = normalizeStateCode(seller.stateCode);
    const supplyState = normalizeStateCode(placeOfSupply.stateCode);
    const isSameState = Boolean(
      sellerState && supplyState && sellerState === supplyState,
    );

    if (!isSameState) {
      return [
        {
          type: 'IGST',
          rate: taxRate,
          taxableAmount,
          amount: taxAmount,
        },
      ];
    }

    const halfRate = taxRate / 2;
    const cgstAmount = roundCurrency(taxAmount / 2);
    const sgstAmount = roundCurrency(taxAmount - cgstAmount);
    return [
      {
        type: 'CGST',
        rate: halfRate,
        taxableAmount,
        amount: cgstAmount,
      },
      {
        type: 'SGST',
        rate: halfRate,
        taxableAmount,
        amount: sgstAmount,
      },
    ];
  }

  private aggregateComponents(components: TaxComponent[]): TaxComponent[] {
    const grouped = new Map<string, TaxComponent>();

    for (const component of components) {
      const key = `${component.type}:${component.rate}`;
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { ...component });
        continue;
      }

      grouped.set(key, {
        ...existing,
        taxableAmount: roundCurrency(
          existing.taxableAmount + component.taxableAmount,
        ),
        amount: roundCurrency(existing.amount + component.amount),
      });
    }

    return Array.from(grouped.values());
  }

  private resolvePlaceOfSupply(
    seller: TaxRegistrationSnapshot,
    buyer: TaxRegistrationSnapshot,
    placeOfSupply?: PlaceOfSupply,
  ): PlaceOfSupply {
    return {
      countryCode:
        placeOfSupply?.countryCode ?? buyer.countryCode ?? seller.countryCode,
      stateCode: placeOfSupply?.stateCode ?? buyer.stateCode,
      stateName: placeOfSupply?.stateName ?? buyer.stateName,
    };
  }
}
