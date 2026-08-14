import { Injectable } from '@nestjs/common';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import { PdfLayoutService } from './pdf-layout.service';
import type { InvoicePdfInput } from './pdf.types';
import type { PDFConfig } from './pdf-config.types';
import { appendPdfPoweredByDocita } from './pdf-branding';

@Injectable()
export class InvoicePdfRenderer {
  constructor(private readonly layout: PdfLayoutService) {}

  buildConfig(data: InvoicePdfInput): PDFConfig {
    return {
      type: 'invoice',
      title: 'TAX INVOICE',
      documentId: data.invoiceId,
      clinic: data.clinic,
      patient: data.patient,
      doctor: data.doctor,
      date: data.date,
      sections: [
        (doc, ctx, layout) => {
          ctx.currentY = layout.renderInvoiceItemsTable(doc, data.items, ctx);
        },

        (doc, ctx) => {
          ctx.currentY = this.layout.renderInvoiceTotals(
            doc,
            {
              subtotal: data.subtotal,
              discount: data.discount,
              tax: data.tax,
              total: data.total,
            },
            ctx,
          );
        },

        (doc, ctx) => {
          ctx.currentY += 20;
          const statusColor =
            data.status === 'PAID'
              ? '#22c55e'
              : data.status === 'PENDING'
                ? '#f59e0b'
                : '#ef4444';
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(statusColor)
            .text(`Payment Status: ${data.status}`, ctx.margin, ctx.currentY)
            .fillColor('#000000');
          ctx.currentY += 20;

          if (data.paymentMethod) {
            doc
              .fontSize(10)
              .font('Helvetica')
              .text(
                `Payment Method: ${data.paymentMethod}`,
                ctx.margin,
                ctx.currentY,
              );
            ctx.currentY += 15;
          }

          if (data.dueDate && data.status !== 'PAID') {
            doc
              .fontSize(10)
              .font('Helvetica')
              .text(
                `Due Date: ${formatDate(data.dueDate, DATE_FORMATS.DATE_LONG)}`,
                ctx.margin,
                ctx.currentY,
              );
            ctx.currentY += 15;
          }
        },

        (doc, ctx) => {
          if (data.notes) {
            ctx.currentY += 10;
            ctx.currentY = this.layout.renderSection(
              doc,
              'Notes',
              data.notes,
              ctx,
            );
          }
        },
      ],
      footerText: appendPdfPoweredByDocita(
        data.clinic.gstin
          ? `GSTIN: ${data.clinic.gstin} | This is a computer-generated invoice.`
          : 'This is a computer-generated invoice.',
      ),
    };
  }
}
