import { Injectable } from '@nestjs/common';
import {
  BasePdfService,
  BasePDFConfig,
  PDFContext,
} from '../../shared/modules/document-generation/pdf/base-pdf.service';
import {
  PDFClinicInfo,
  PDFPatientInfo,
  PDFInvoiceItem,
  PDFDoctorInfo,
} from '@workspace/types';
import PDFDocument from 'pdfkit';

export interface InvoiceData {
  invoiceId: string;
  clinic: PDFClinicInfo;
  patient: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  items: PDFInvoiceItem[];
  date?: Date;
  dueDate?: Date;
  status?: string; // PAID, PENDING, etc.
}

@Injectable()
export class InvoicePdfService extends BasePdfService {
  async generate(data: InvoiceData): Promise<Buffer> {
    const config: BasePDFConfig = {
      title: 'TAX INVOICE',
      documentId: data.invoiceId,
      clinic: data.clinic,
      patient: data.patient,
      doctor: data.doctor,
      date: data.date,
      // margin: 50,
      footerText: 'Thank you for your business.',
    };

    const { doc, context } = this.createDocument(config);
    const buffers: Buffer[] = [];

    doc.on('data', (buffer: Buffer) => buffers.push(buffer));
    doc.on('end', () => {});

    // Header
    let currentY = this.renderHeader(doc, config, context);

    // Title & Meta
    currentY = this.renderTitle(
      doc,
      config.title,
      config.documentId,
      context,
      currentY,
    );

    // Patient Details
    if (data.patient) {
      currentY = this.renderPatientDetails(
        doc,
        data.patient,
        context,
        currentY,
      );
    }

    // Doctor Details (Optional for invoices)
    if (data.doctor) {
      currentY = this.renderDoctorDetails(doc, data.doctor, context, currentY);
    }

    // Invoice Status
    if (data.status) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(
          `Status: ${data.status.toUpperCase()}`,
          context.margin,
          currentY,
          { align: 'right', width: context.contentWidth },
        );
      currentY += 20;
    }

    // Items Table
    currentY = this.renderItemsTable(doc, data.items, context, currentY);

    // Totals
    currentY = this.renderTotals(doc, data.items, context, currentY);

    // Footer
    this.renderFooter(doc, config.footerText, context);

    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });

    doc.end();

    return bufferPromise;
  }

  private renderItemsTable(
    doc: typeof PDFDocument.prototype,
    items: PDFInvoiceItem[],
    context: PDFContext,
    startY: number,
  ): number {
    let currentY = startY;
    const colWidths = [200, 50, 70, 70, 80]; // Description, Qty, Unit Price, GST, Amount
    const startX = context.margin;

    // Header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Description', startX, currentY, { width: colWidths[0] });
    doc.text('Qty', startX + colWidths[0], currentY, {
      width: colWidths[1],
      align: 'center',
    });
    doc.text('Price', startX + colWidths[0] + colWidths[1], currentY, {
      width: colWidths[2],
      align: 'right',
    });
    doc.text(
      'GST',
      startX + colWidths[0] + colWidths[1] + colWidths[2],
      currentY,
      { width: colWidths[3], align: 'right' },
    );
    doc.text(
      'Amount',
      startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      currentY,
      { width: colWidths[4], align: 'right' },
    );

    currentY += 15;
    this.drawDivider(doc, currentY, context);
    currentY += 10;

    doc.font('Helvetica').fontSize(9);

    for (const item of items) {
      currentY = this.checkPageBreak(doc, currentY, 20, context);

      doc.text(item.description, startX, currentY, { width: colWidths[0] });
      doc.text(item.quantity.toString(), startX + colWidths[0], currentY, {
        width: colWidths[1],
        align: 'center',
      });
      doc.text(
        item.unitPrice.toFixed(2),
        startX + colWidths[0] + colWidths[1],
        currentY,
        { width: colWidths[2], align: 'right' },
      );
      doc.text(
        `${item.gstRate ?? 0}%`,
        startX + colWidths[0] + colWidths[1] + colWidths[2],
        currentY,
        { width: colWidths[3], align: 'right' },
      );
      doc.text(
        item.amount.toFixed(2),
        startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
        currentY,
        { width: colWidths[4], align: 'right' },
      );

      currentY += 15;
      this.drawDivider(doc, currentY, context);
      currentY += 10;
    }

    return currentY;
  }

  private renderTotals(
    doc: typeof PDFDocument.prototype,
    items: PDFInvoiceItem[],
    context: PDFContext,
    startY: number,
  ): number {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = total - subtotal;

    let currentY = startY + 10;
    const labelX = context.margin + 250;
    const valueX = context.margin + 350;
    const width = 100;

    currentY = this.checkPageBreak(doc, currentY, 80, context);

    doc.font('Helvetica-Bold');

    doc.text('Subtotal:', labelX, currentY, { width, align: 'right' });
    doc.text(subtotal.toFixed(2), valueX, currentY, { width, align: 'right' });
    currentY += 15;

    doc.text('Tax (GST):', labelX, currentY, { width, align: 'right' });
    doc.text(tax.toFixed(2), valueX, currentY, { width, align: 'right' });
    currentY += 15;

    this.drawDivider(doc, currentY, context);
    currentY += 10;

    doc.fontSize(12);
    doc.text('Total:', labelX, currentY, { width, align: 'right' });
    doc.text(total.toFixed(2), valueX, currentY, { width, align: 'right' });

    return currentY + 30;
  }
}
