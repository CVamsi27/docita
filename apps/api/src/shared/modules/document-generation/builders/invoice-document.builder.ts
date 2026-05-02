import { DATE_FORMATS, formatDate } from '@workspace/utils';
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
    this.addHeading(`Invoice #${data.invoiceNumber}`, 1)
      .addParagraph(
        `Date: ${formatDate(data.invoiceDate, DATE_FORMATS.DATE_MEDIUM)}`,
      )
      .addParagraph(
        `Due: ${formatDate(data.dueDate, DATE_FORMATS.DATE_MEDIUM)}`,
      )

      .addHeading('Invoice From', 2)
      .addParagraph(data.clinic.name)
      .addParagraph(data.clinic.address)
      .addParagraph(`Phone: ${data.clinic.phone}`)
      .addParagraph(`Email: ${data.clinic.email}`)

      .addHeading('Bill To', 2)
      .addParagraph(data.patient.name)
      .addParagraph(data.patient.address)
      .addParagraph(`Phone: ${data.patient.phone}`)

      .addHeading('Items', 2)
      .addTable(data.items, [
        'Description',
        'Quantity',
        'Unit Price',
        'Amount',
      ]);

    this.addHeading('Totals', 2)
      .addParagraph(`Subtotal: ${data.subtotal.toFixed(2)}`)
      .addParagraph(`Tax: ${data.tax.toFixed(2)}`)
      .addParagraph(`Total: ${data.total.toFixed(2)}`);

    if (data.notes) {
      this.addHeading('Notes', 2).addParagraph(data.notes);
    }

    return this;
  }
}
