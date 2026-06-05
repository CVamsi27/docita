import type { OcrRawData } from '@workspace/types';
import { toOcrString } from './ocr-field-utils';

export function extractInvoice(data: OcrRawData | null | undefined) {
  const invoice = data?.invoice;
  return invoice
    ? {
        invoiceNumber: invoice.invoiceNumber ?? '',
        invoiceDate: invoice.invoiceDate ?? '',
        totalAmount: toOcrString(invoice.totalAmount),
        components: extractInvoiceComponents(invoice.components),
        consultationFee: toOcrString(invoice.consultationFee),
        testsFee: toOcrString(invoice.testsFee),
        procedureFee: toOcrString(invoice.procedureFee),
        medicationFee: toOcrString(invoice.medicationFee),
        discount: toOcrString(invoice.discount),
        discountPercentage: toOcrString(invoice.discountPercentage),
        taxAmount: toOcrString(invoice.taxAmount),
        paymentMethod: invoice.paymentMethod ?? '',
        paymentStatus: invoice.paymentStatus ?? '',
      }
    : undefined;
}

function extractInvoiceComponents(
  components: NonNullable<OcrRawData['invoice']>['components'],
) {
  return Array.isArray(components)
    ? components.filter(hasInvoiceComponentDescription).map(toInvoiceComponent)
    : [];
}

function hasInvoiceComponentDescription(
  component: NonNullable<
    NonNullable<OcrRawData['invoice']>['components']
  >[number],
): boolean {
  return Boolean(component?.description);
}

function toInvoiceComponent(
  component: NonNullable<
    NonNullable<OcrRawData['invoice']>['components']
  >[number],
) {
  return {
    description: component.description ?? '',
    amount: toOcrString(component.amount),
    quantity: toOcrString(component.quantity),
  };
}
