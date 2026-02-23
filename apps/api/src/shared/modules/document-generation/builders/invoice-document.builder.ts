/**
 * Invoice Document Builder
 * Builds professional invoice documents
 */

import { BaseDocumentBuilder } from './base-document.builder';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  clinic: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  patient: {
    name: string;
    address: string;
    phone: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export class InvoiceDocumentBuilder extends BaseDocumentBuilder {
  buildFromData(data: InvoiceData): this {
    // Header with clinic info
    this.addHeading(`Invoice #${data.invoiceNumber}`, 1)
      .addParagraph(`Date: ${data.invoiceDate.toLocaleDateString()}`)
      .addParagraph(`Due: ${data.dueDate.toLocaleDateString()}`)

      // Clinic info
      .addHeading('Invoice From', 2)
      .addParagraph(data.clinic.name)
      .addParagraph(data.clinic.address)
      .addParagraph(`Phone: ${data.clinic.phone}`)
      .addParagraph(`Email: ${data.clinic.email}`)

      // Patient info
      .addHeading('Bill To', 2)
      .addParagraph(data.patient.name)
      .addParagraph(data.patient.address)
      .addParagraph(`Phone: ${data.patient.phone}`)

      // Line items
      .addHeading('Items', 2)
      .addTable(data.items, [
        'Description',
        'Quantity',
        'Unit Price',
        'Amount',
      ]);

    // Totals
    this.addHeading('Totals', 2)
      .addParagraph(`Subtotal: ₹${data.subtotal.toFixed(2)}`)
      .addParagraph(`Tax: ₹${data.tax.toFixed(2)}`)
      .addParagraph(`Total: ₹${data.total.toFixed(2)}`);

    // Notes
    if (data.notes) {
      this.addHeading('Notes', 2).addParagraph(data.notes);
    }

    return this;
  }
}
