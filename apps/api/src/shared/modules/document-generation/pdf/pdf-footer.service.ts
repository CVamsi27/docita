import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { PDFDoctorInfo } from '@workspace/types';
import type { PDFContext } from './pdf.types';

@Injectable()
export class PdfFooterService {
  renderInvoiceTotals(
    doc: typeof PDFDocument.prototype,
    totals: {
      subtotal: number;
      discount?: number;
      tax?: number;
      total: number;
    },
    context: PDFContext,
  ): number {
    let y = context.currentY + 10;
    const margin = context.margin;
    const pageWidth = context.pageWidth;
    const rightX = pageWidth - margin - 150;
    const valueX = pageWidth - margin - 10;

    doc.fontSize(10).font('Helvetica');

    doc.text('Subtotal:', rightX, y);
    doc.text(`${totals.subtotal.toFixed(2)}`, valueX, y, {
      align: 'right',
      width: 80,
    });
    y += 18;

    if (totals.discount && totals.discount > 0) {
      doc
        .fillColor('#22c55e')
        .text('Discount:', rightX, y)
        .text(`-${totals.discount.toFixed(2)}`, valueX, y, {
          align: 'right',
          width: 80,
        })
        .fillColor('#000000');
      y += 18;
    }

    if (totals.tax && totals.tax > 0) {
      doc.text('Tax (GST):', rightX, y);
      doc.text(`${totals.tax.toFixed(2)}`, valueX, y, {
        align: 'right',
        width: 80,
      });
      y += 18;
    }

    doc
      .strokeColor('#e2e8f0')
      .moveTo(rightX - 10, y)
      .lineTo(pageWidth - margin, y)
      .stroke()
      .strokeColor('#000000');
    y += 8;

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e3a5f')
      .text('TOTAL:', rightX, y)
      .text(`${totals.total.toFixed(2)}`, valueX, y, {
        align: 'right',
        width: 80,
      })
      .fillColor('#000000');

    return y + 25;
  }

  renderDoctorSignature(
    doc: typeof PDFDocument.prototype,
    doctor: PDFDoctorInfo,
    context: PDFContext,
  ): number {
    let y = Math.max(context.currentY + 40, doc.page.height - 140);
    const signatureX = context.pageWidth - context.margin - 180;

    doc
      .strokeColor('#666666')
      .moveTo(signatureX, y)
      .lineTo(signatureX + 170, y)
      .stroke()
      .strokeColor('#000000');
    y += 8;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Dr. ${doctor.name}`, signatureX, y, { width: 170 });
    y += 14;

    doc.fontSize(8).font('Helvetica').fillColor('#4a5568');

    if (doctor.qualification) {
      doc.text(doctor.qualification, signatureX, y, { width: 170 });
      y += 11;
    }

    if (doctor.specialization) {
      doc.text(doctor.specialization, signatureX, y, { width: 170 });
      y += 11;
    }

    if (doctor.registrationNumber) {
      doc
        .font('Helvetica-Bold')
        .text(`Reg. No: ${doctor.registrationNumber}`, signatureX, y, {
          width: 170,
        });
      y += 11;
    }

    if (doctor.councilName) {
      doc
        .font('Helvetica')
        .text(doctor.councilName, signatureX, y, { width: 170 });
      y += 11;
    }

    doc.fillColor('#000000');
    return y;
  }

  renderFooter(doc: typeof PDFDocument.prototype, text: string): void {
    const pageWidth = doc.page.width;

    doc
      .strokeColor('#e2e8f0')
      .moveTo(50, doc.page.height - 60)
      .lineTo(pageWidth - 50, doc.page.height - 60)
      .stroke()
      .strokeColor('#000000');

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#666666')
      .text(text, 50, doc.page.height - 45, {
        align: 'center',
        width: pageWidth - 100,
      })
      .fillColor('#000000');
  }
}
