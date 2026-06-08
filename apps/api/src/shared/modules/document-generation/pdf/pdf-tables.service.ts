import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { TableColumn } from '@workspace/types';
import type { PDFContext } from './pdf.types';
import {
  PDF_ROUTE_LEGEND,
  PDF_FREQUENCY_LEGEND,
} from './pdf-legends.constants';
import type { PDFInvoiceItem, PDFMedicationInfo } from '@workspace/types';

@Injectable()
export class PdfTablesService {
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
