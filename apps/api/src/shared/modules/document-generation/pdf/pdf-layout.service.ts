import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import PDFDocument from 'pdfkit';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import {
  PDF_FREQUENCY_LEGEND,
  PDF_ROUTE_LEGEND,
} from './pdf-legends.constants';
import type {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFInvoiceItem,
  PDFMedicationInfo,
  PDFPatientInfo,
  PDFDocumentType,
  TableColumn,
} from '@workspace/types';
import type { PDFContext } from './pdf.types';
import {
  renderDoctorInfoColumn,
  renderPatientInfoColumn,
} from './pdf-party-layout';

@Injectable()
export class PdfLayoutService {
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

  renderPatientDoctorInfo(
    doc: typeof PDFDocument.prototype,
    patient?: PDFPatientInfo,
    doctor?: PDFDoctorInfo,
    context?: PDFContext,
  ): number {
    const y = context?.currentY ?? 200;
    const margin = context?.margin ?? 50;
    const pageWidth = context?.pageWidth ?? 595;
    const colWidth = (pageWidth - margin * 2) / 2 - 10;

    let maxY = y;

    if (patient) {
      maxY = Math.max(
        maxY,
        renderPatientInfoColumn({ doc, patient, x: margin, y }),
      );
    }

    if (doctor) {
      const rightX = margin + colWidth + 20;
      maxY = Math.max(
        maxY,
        renderDoctorInfoColumn({ doc, doctor, x: rightX, y }),
      );
    }

    maxY += 8;
    doc
      .strokeColor('#e2e8f0')
      .moveTo(margin, maxY)
      .lineTo(pageWidth - margin, maxY)
      .stroke()
      .strokeColor('#000000');

    return maxY + 10;
  }

  renderMedicationsTable(
    doc: typeof PDFDocument.prototype,
    medications: PDFMedicationInfo[],
    context: PDFContext,
  ): number {
    let y = context.currentY;
    const margin = context.margin;
    const pageWidth = context.pageWidth;

    const columns = [
      { header: '#', width: 25 },
      { header: 'Medication', width: 140 },
      { header: 'Dosage', width: 70 },
      { header: 'Route', width: 45 },
      { header: 'Frequency', width: 70 },
      { header: 'Duration', width: 65 },
      { header: 'Qty', width: 40 },
    ];

    doc
      .fillColor('#f0f4f8')
      .rect(margin, y, pageWidth - margin * 2, 22)
      .fill()
      .fillColor('#000000');

    doc.fontSize(8).font('Helvetica-Bold');
    let x = margin + 5;
    columns.forEach((col) => {
      doc.text(col.header, x, y + 7, { width: col.width - 5 });
      x += col.width;
    });
    y += 22;

    doc.font('Helvetica').fontSize(9);
    medications.forEach((med, index) => {
      if (index % 2 === 1) {
        doc
          .fillColor('#fafafa')
          .rect(margin, y, pageWidth - margin * 2, 28)
          .fill()
          .fillColor('#000000');
      }

      x = margin + 5;
      const rowY = y + 5;

      doc.text(`${index + 1}.`, x, rowY, { width: columns[0].width - 5 });
      x += columns[0].width;

      doc
        .font('Helvetica-Bold')
        .text(med.name, x, rowY, { width: columns[1].width - 5 });
      if (med.genericName && med.genericName !== med.name) {
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#666666')
          .text(`(${med.genericName})`, x, rowY + 10, {
            width: columns[1].width - 5,
          })
          .fillColor('#000000')
          .fontSize(9);
      }
      doc.font('Helvetica');
      x += columns[1].width;

      doc.text(med.dosage, x, rowY, { width: columns[2].width - 5 });
      x += columns[2].width;

      doc.text(med.route || 'PO', x, rowY, { width: columns[3].width - 5 });
      x += columns[3].width;
      let freqText = med.frequency;
      if (med.timing) {
        freqText += ` (${med.timing})`;
      }
      doc.text(freqText, x, rowY, { width: columns[4].width - 5 });
      x += columns[4].width;
      doc.text(med.duration, x, rowY, { width: columns[5].width - 5 });
      x += columns[5].width;
      doc.text(med.quantity?.toString() || '-', x, rowY, {
        width: columns[6].width - 5,
      });
      if (med.specialInstructions) {
        doc
          .fontSize(7)
          .fillColor('#666666')
          .text(`↳ ${med.specialInstructions}`, margin + 30, y + 18, {
            width: pageWidth - margin * 2 - 30,
          })
          .fillColor('#000000')
          .fontSize(9);
      }
      y += 28;
    });
    doc
      .strokeColor('#e2e8f0')
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .stroke()
      .strokeColor('#000000');

    return y + 5;
  }

  renderAbbreviationLegend(
    doc: typeof PDFDocument.prototype,
    medications: PDFMedicationInfo[],
    context: PDFContext,
  ): number {
    const usedFreqs = new Set<string>();
    const usedRoutes = new Set<string>();

    medications.forEach((med) => {
      const freq = med.frequency.split(' ')[0].toUpperCase();
      if (PDF_FREQUENCY_LEGEND[freq]) usedFreqs.add(freq);
      const route = (med.route || 'PO').toUpperCase();
      if (PDF_ROUTE_LEGEND[route]) usedRoutes.add(route);
    });

    if (usedFreqs.size === 0 && usedRoutes.size === 0) return context.currentY;

    let y = context.currentY + 20;
    const margin = context.margin;

    doc.fontSize(7).fillColor('#666666');
    doc.font('Helvetica-Bold').text('Abbreviations:', margin, y);
    y += 10;
    doc.font('Helvetica');

    const legendItems: string[] = [];
    usedFreqs.forEach((abbr) =>
      legendItems.push(`${abbr} = ${PDF_FREQUENCY_LEGEND[abbr]}`),
    );
    usedRoutes.forEach((abbr) =>
      legendItems.push(`${abbr} = ${PDF_ROUTE_LEGEND[abbr]}`),
    );

    const midpoint = Math.ceil(legendItems.length / 2);
    const col1 = legendItems.slice(0, midpoint);
    const col2 = legendItems.slice(midpoint);

    col1.forEach((item, i) => {
      doc.text(item, margin, y + i * 10);
    });
    col2.forEach((item, i) => {
      doc.text(item, margin + 200, y + i * 10);
    });

    doc.fillColor('#000000');
    return y + Math.max(col1.length, col2.length) * 10 + 10;
  }

  renderInvoiceItemsTable(
    doc: typeof PDFDocument.prototype,
    items: PDFInvoiceItem[],
    context: PDFContext,
  ): number {
    let y = context.currentY;
    const margin = context.margin;
    const pageWidth = context.pageWidth;

    const columns = [
      { header: '#', width: 25 },
      { header: 'Description', width: 200 },
      { header: 'HSN/SAC', width: 60 },
      { header: 'Qty', width: 40 },
      { header: 'Rate', width: 70 },
      { header: 'Amount', width: 80 },
    ];

    doc
      .fillColor('#1e3a5f')
      .rect(margin, y, pageWidth - margin * 2, 22)
      .fill();

    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    let x = margin + 5;
    columns.forEach((col) => {
      const align = ['Rate', 'Amount', 'Qty'].includes(col.header)
        ? 'right'
        : 'left';
      doc.text(col.header, x, y + 7, { width: col.width - 10, align });
      x += col.width;
    });
    y += 22;
    doc.fillColor('#000000');

    doc.font('Helvetica').fontSize(9);
    items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc
          .fillColor('#f8fafc')
          .rect(margin, y, pageWidth - margin * 2, 22)
          .fill()
          .fillColor('#000000');
      }

      x = margin + 5;
      const rowY = y + 6;

      doc.text(`${index + 1}`, x, rowY, { width: columns[0].width - 5 });
      x += columns[0].width;

      doc.text(item.description, x, rowY, { width: columns[1].width - 10 });
      x += columns[1].width;

      doc.text(item.hsnCode || '-', x, rowY, { width: columns[2].width - 10 });
      x += columns[2].width;

      doc.text(item.quantity.toString(), x, rowY, {
        width: columns[3].width - 10,
        align: 'right',
      });
      x += columns[3].width;

      doc.text(item.unitPrice.toFixed(2), x, rowY, {
        width: columns[4].width - 10,
        align: 'right',
      });
      x += columns[4].width;

      doc.text(item.amount.toFixed(2), x, rowY, {
        width: columns[5].width - 10,
        align: 'right',
      });

      y += 22;
    });

    doc
      .strokeColor('#1e3a5f')
      .lineWidth(1)
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .stroke()
      .strokeColor('#000000');

    return y + 5;
  }

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

  renderTable(
    doc: typeof PDFDocument.prototype,
    columns: TableColumn[],
    rows: Record<string, unknown>[],
    startY: number,
    options?: {
      headerBg?: string;
      rowHeight?: number;
      fontSize?: number;
      margin?: number;
    },
  ): number {
    const margin = options?.margin ?? 50;
    const rowHeight = options?.rowHeight ?? 25;
    const fontSize = options?.fontSize ?? 10;
    let y = startY;

    let x = margin;
    const columnPositions = columns.map((col) => {
      const pos = x;
      x += col.width;
      return pos;
    });

    doc.fontSize(fontSize).font('Helvetica-Bold');

    if (options?.headerBg) {
      doc
        .fillColor(options.headerBg)
        .rect(margin, y, x - margin, rowHeight)
        .fill()
        .fillColor('#000000');
    }

    columns.forEach((col, i) => {
      doc.text(col.header, columnPositions[i] + 5, y + 7, {
        width: col.width - 10,
        align: col.align ?? 'left',
      });
    });
    y += rowHeight;

    doc.font('Helvetica');
    rows.forEach((row) => {
      columns.forEach((col, i) => {
        const value = row[col.key]?.toString() ?? '';
        doc.text(value, columnPositions[i] + 5, y + 7, {
          width: col.width - 10,
          align: col.align ?? 'left',
        });
      });
      y += rowHeight;
    });

    return y;
  }
}
