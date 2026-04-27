import { Injectable } from '@nestjs/common';
import {
  invoiceTaxSummarySchema,
  taxRegistrationSnapshotSchema,
  type InvoiceItem,
  type InvoiceTaxSummary,
  type PlaceOfSupply,
  type TaxComponent,
  type TaxInvoiceType,
  type TaxRegistrationSnapshot,
} from '@workspace/types';

interface CalculateInvoiceTaxInput {
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

interface LineAmounts {
  subtotal: number;
  discount: number;
  netAmount: number;
  taxableAmount: number;
  exemptAmount: number;
  taxAmount: number;
  components: TaxComponent[];
}

const DEFAULT_COUNTRY_CODE = 'IN';
const DEFAULT_CURRENCY = 'INR';
const DEFAULT_REGIME = 'IN_GST';

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const sumCurrency = (values: number[]): number =>
  roundCurrency(values.reduce((total, value) => total + value, 0));

const normalizeStateCode = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : undefined;
};

@Injectable()
export class TaxCalculatorService {
  calculateInvoice(input: CalculateInvoiceTaxInput): CalculatedInvoiceTax {
    const seller = taxRegistrationSnapshotSchema.parse({
      countryCode: DEFAULT_COUNTRY_CODE,
      regime: DEFAULT_REGIME,
      ...input.seller,
    });
    const buyer = taxRegistrationSnapshotSchema.parse({
      countryCode: seller.countryCode,
      regime: seller.regime,
      ...input.buyer,
    });
    const placeOfSupply = this.resolvePlaceOfSupply(
      seller,
      buyer,
      input.placeOfSupply,
    );
    const currency = input.currency ?? DEFAULT_CURRENCY;

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
    const unitPrice = item.unitPrice ?? item.price;
    const subtotal = roundCurrency(unitPrice * item.quantity);
    const rateDiscount = roundCurrency(
      subtotal * ((item.discountRate ?? 0) / 100),
    );
    const discount = Math.min(
      subtotal,
      roundCurrency((item.discountAmount ?? 0) + rateDiscount),
    );
    const netAmount = roundCurrency(subtotal - discount);
    const taxTreatment = item.taxTreatment ?? 'EXEMPT_HEALTHCARE';
    const isTaxable =
      seller.countryCode === DEFAULT_COUNTRY_CODE &&
      seller.regime === DEFAULT_REGIME &&
      taxTreatment === 'TAXABLE' &&
      (item.taxRate ?? 0) > 0;

    if (!isTaxable) {
      return {
        subtotal,
        discount,
        netAmount,
        taxableAmount: 0,
        exemptAmount: netAmount,
        taxAmount: 0,
        components: [],
      };
    }

    const taxRate = item.taxRate ?? 0;
    const taxAmount = roundCurrency(netAmount * (taxRate / 100));
    const components = this.calculateIndianComponents(
      netAmount,
      taxRate,
      taxAmount,
      seller,
      placeOfSupply,
    );

    return {
      subtotal,
      discount,
      netAmount,
      taxableAmount: netAmount,
      exemptAmount: 0,
      taxAmount,
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
      stateCode:
        placeOfSupply?.stateCode ?? buyer.stateCode ?? seller.stateCode,
      stateName:
        placeOfSupply?.stateName ?? buyer.stateName ?? seller.stateName,
    };
  }
}
