import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import PDFDocument from 'pdfkit';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import type { PDFClinicInfo, PDFDocumentType } from '@workspace/types';
import type { PDFContext } from './pdf.types';

@Injectable()
export class PdfHeaderService {
  constructor(@Inject(CLOCK_PORT) private readonly clock: IClock) {}

  renderClinicHeader(
    doc: typeof PDFDocument.prototype,
    clinic: PDFClinicInfo,
    context: PDFContext,
    docType?: PDFDocumentType,
  ): number {
    let y = context.margin;

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#1e3a5f')
      .text(clinic.name, context.margin, y, { align: 'center' })
      .fillColor('#000000');
    y += 30;
    doc.fontSize(9).font('Helvetica').fillColor('#4a5568');
    const fullAddress = [clinic.address, clinic.city]
      .filter(Boolean)
      .join(', ');
    if (fullAddress) {
      doc.text(fullAddress, context.margin, y, { align: 'center' });
      y += 12;
    }
    const contactParts: string[] = [];
    if (clinic.phone) contactParts.push(`Tel: ${clinic.phone}`);
    if (clinic.email) contactParts.push(` ${clinic.email}`);
    if (clinic.website) contactParts.push(`Web: ${clinic.website}`);
    if (contactParts.length > 0) {
      doc.text(contactParts.join('  |  '), context.margin, y, {
        align: 'center',
      });
      y += 12;
    }
    if (docType === 'invoice' && clinic.gstin) {
      doc
        .fontSize(8)
        .text(`GSTIN: ${clinic.gstin}`, context.margin, y, { align: 'center' });
      y += 10;
    }
    doc.fillColor('#000000');
    y += 8;
    doc
      .strokeColor('#1e3a5f')
      .lineWidth(2)
      .moveTo(context.margin, y)
      .lineTo(context.pageWidth - context.margin, y)
      .stroke();
    y += 3;
    doc
      .lineWidth(0.5)
      .moveTo(context.margin, y)
      .lineTo(context.pageWidth - context.margin, y)
      .stroke()
      .strokeColor('#000000')
      .lineWidth(1);
    y += 15;

    return y;
  }

  renderDocumentTitle(
    doc: typeof PDFDocument.prototype,
    title: string,
    documentId?: string,
    date?: Date,
    context?: PDFContext,
    showRxSymbol?: boolean,
  ): number {
    const y = context?.currentY ?? 150;
    const margin = context?.margin ?? 50;
    const pageWidth = context?.pageWidth ?? 595;

    let currentY = y;

    if (showRxSymbol) {
      doc
        .fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#1e3a5f')
        .text('℞', margin, currentY)
        .fillColor('#000000');

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(title, margin + 45, currentY + 10);
      currentY += 45;
    } else {
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(title, margin, currentY, { align: 'center' });
      currentY += 25;
    }

    doc.fontSize(9).font('Helvetica').fillColor('#4a5568');

    const dateStr = formatDate(
      date ?? this.clock.now(),
      DATE_FORMATS.DATE_LONG,
    );

    if (documentId) {
      doc.text(
        `Ref: ${documentId.slice(0, 8).toUpperCase()}`,
        margin,
        currentY,
      );
    }

    doc.text(`Date: ${dateStr}`, margin, currentY, {
      align: 'right',
      width: pageWidth - margin * 2,
    });

    doc.fillColor('#000000');
    return currentY + 20;
  }

  renderSection(
    doc: typeof PDFDocument.prototype,
    title: string,
    content: string,
    context: PDFContext,
  ): number {
    let y = context.currentY;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1e3a5f')
      .text(title, context.margin, y)
      .fillColor('#000000');
    y += 15;

    doc.fontSize(9).font('Helvetica').text(content, context.margin, y, {
      width: context.contentWidth,
      lineGap: 3,
    });

    return doc.y + 10;
  }

  renderWarningBox(
    doc: typeof PDFDocument.prototype,
    text: string,
    context: PDFContext,
  ): void {
    const y = context.currentY;
    const margin = context.margin;
    const pageWidth = context.pageWidth;

    doc
      .fillColor('#fef2f2')
      .rect(margin, y, pageWidth - margin * 2, 30)
      .fill();
    doc
      .strokeColor('#ef4444')
      .lineWidth(1)
      .rect(margin, y, pageWidth - margin * 2, 30)
      .stroke()
      .strokeColor('#000000');

    doc
      .fillColor('#dc2626')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(text, margin + 10, y + 10, { width: pageWidth - margin * 2 - 20 })
      .fillColor('#000000');
  }
}
