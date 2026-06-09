import type { ParsedMedicalFields } from '@workspace/types';

export function extractInvoiceTotal(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const totalMatch = line.match(
    /(?:total|grand total|amount due)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
  );
  if (totalMatch) {
    fields.invoice.total = parseFloat(totalMatch[1].replace(/,/g, ''));
  }
}

export function extractInvoiceTax(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const taxMatch = line.match(
    /(?:tax|vat|gst)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
  );
  if (taxMatch) {
    fields.invoice.tax = parseFloat(taxMatch[1].replace(/,/g, ''));
  }
}

export function extractInvoiceDiscount(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const discountMatch = line.match(
    /(?:discount)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
  );
  if (discountMatch) {
    fields.invoice.discount = parseFloat(discountMatch[1].replace(/,/g, ''));
  }
}

export function extractInvoiceSubtotal(
  line: string,
  fields: ParsedMedicalFields,
): void {
  const subtotalMatch = line.match(
    /(?:subtotal)[:\s]+(?:[$€£₹]|rs.?)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/i,
  );
  if (subtotalMatch) {
    fields.invoice.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
  }
}

export function extractInvoiceItems(
  line: string,
  lowerLine: string,
  fields: ParsedMedicalFields,
): void {
  const simpleItemMatch = line.match(
    /^([a-zA-Z0-9\s-.]+?)\s+(?:[$€£₹]|rs.?)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)$/i,
  );

  if (
    simpleItemMatch &&
    ![
      'total',
      'subtotal',
      'tax',
      'discount',
      'amount',
      'balance',
      'grand',
    ].some((k) => lowerLine.includes(k))
  ) {
    fields.invoice.items.push({
      description: simpleItemMatch[1].trim(),
      quantity: 1,
      unitPrice: parseFloat(simpleItemMatch[2].replace(/,/g, '')),
      total: parseFloat(simpleItemMatch[2].replace(/,/g, '')),
    });
  }
}
