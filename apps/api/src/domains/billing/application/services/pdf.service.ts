import { Injectable } from '@nestjs/common';
import {
  BasePdfService,
  BasePDFConfig,
  PDFContext,
} from '@/shared/modules/document-generation/pdf/base-pdf.service';
import {
  PDFClinicInfo,
  PDFPatientInfo,
  PDFInvoiceItem,
  PDFDoctorInfo,
  PDFHospitalConfig,
  resolvePdfCodePair,
} from '@workspace/types';
import PDFDocument from 'pdfkit';

export interface InvoiceData {
  invoiceId: string;
  clinic: PDFClinicInfo;
  patient: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  authorizedSignatureUrl?: string;
  authorizedSignatureLabel?: string;
  items: PDFInvoiceItem[];
  date?: Date;
  dueDate?: Date;
  status?: string;
  hospitalConfig?: PDFHospitalConfig;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PAID: { bg: '#dcfce7', text: '#166534' },
  PENDING: { bg: '#fef9c3', text: '#854d0e' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
};

@Injectable()
export class PDFService extends BasePdfService {
  async generate(data: InvoiceData): Promise<Buffer> {
    const config: BasePDFConfig = {
      title: 'TAX INVOICE',
      documentId: data.invoiceId,
      clinic: {
        ...data.clinic,
        branding: data.hospitalConfig?.theme
          ? { ...data.clinic.branding, ...data.hospitalConfig.theme }
          : data.clinic.branding,
      },
      patient: data.patient,
      doctor: data.doctor,
      date: data.date,
      footerText: 'Thank you for your business.',
    };

    const { doc, context } = this.createDocument(config);
    const buffers: Buffer[] = [];

    doc.on('data', (buffer: Buffer) => buffers.push(buffer));

    let currentY = await this.renderHeader(doc, config, context);

    currentY = this.renderTitle(
      doc,
      config.title,
      config.documentId,
      context,
      currentY,
    );

    if (data.patient) {
      currentY = this.renderPatientDetails(
        doc,
        data.patient,
        context,
        currentY,
      );
    }

    if (data.doctor) {
      currentY = this.renderDoctorDetails(doc, data.doctor, context, currentY);
    }

    if (data.status) {
      currentY = this.renderStatusBadge(doc, data.status, context, currentY);
    }

    // Resolve paired hospital overrides first, then fall back to the
    // per-code legacy override maps and finally the source item codes.
    const resolvedItems = data.items.map((item) => ({
      ...item,
      ...resolvePdfCodePair(
        data.hospitalConfig?.codeOverrides,
        item.description,
        {
          cpt: item.cptCode,
          icd: item.icdCode,
        },
      ),
    }));

    currentY = this.renderItemsTable(doc, resolvedItems, context, currentY);
    currentY = this.renderTotals(doc, resolvedItems, context, currentY);
    await this.renderAuthorizedSignature(doc, data, context, currentY);

    this.renderFooter(doc, config.footerText, context);

    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    doc.end();

    return bufferPromise;
  }

  private renderStatusBadge(
    doc: typeof PDFDocument.prototype,
    status: string,
    context: PDFContext,
    currentY: number,
  ): number {
    const colors = STATUS_COLORS[status.toUpperCase()] ?? {
      bg: '#f3f4f6',
      text: '#374151',
    };
    const badgeW = 90;
    const badgeH = 22;
    const badgeX = context.margin + context.contentWidth - badgeW;

    doc.rect(badgeX, currentY, badgeW, badgeH).fill(colors.bg);
    doc
      .fillColor(colors.text)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(status.toUpperCase(), badgeX, currentY + 5, {
        width: badgeW,
        align: 'center',
      });
    doc.fillColor('#000000');

    return currentY + 30;
  }

  private renderItemsTable(
    doc: typeof PDFDocument.prototype,
    items: PDFInvoiceItem[],
    context: PDFContext,
    startY: number,
  ): number {
    const hasCpt = items.some((item) => item.cptCode);
    let currentY = startY;
    const startX = context.margin;

    // Column layout adapts when CPT codes are present
    const colWidths = hasCpt
      ? [160, 55, 45, 65, 55, 75] // Description | CPT | Qty | Price | GST | Amount
      : [200, 50, 70, 70, 80]; // Description | Qty | Price | GST | Amount
    const totalW = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    doc.rect(startX, currentY - 4, totalW, 22).fill(context.theme.primaryColor);
    doc
      .fillColor(context.theme.primaryTextColor)
      .fontSize(9)
      .font('Helvetica-Bold');

    if (hasCpt) {
      const [cDesc, cCpt, cQty, cPrice, cGst, cAmt] = colWidths;
      doc.text('Description', startX + 4, currentY + 2, { width: cDesc });
      doc.text('CPT Code', startX + cDesc, currentY + 2, {
        width: cCpt,
        align: 'center',
      });
      doc.text('Qty', startX + cDesc + cCpt, currentY + 2, {
        width: cQty,
        align: 'center',
      });
      doc.text('Price', startX + cDesc + cCpt + cQty, currentY + 2, {
        width: cPrice,
        align: 'right',
      });
      doc.text('GST', startX + cDesc + cCpt + cQty + cPrice, currentY + 2, {
        width: cGst,
        align: 'right',
      });
      doc.text(
        'Amount',
        startX + cDesc + cCpt + cQty + cPrice + cGst,
        currentY + 2,
        { width: cAmt, align: 'right' },
      );
    } else {
      const [cDesc, cQty, cPrice, cGst, cAmt] = colWidths;
      doc.text('Description', startX + 4, currentY + 2, { width: cDesc });
      doc.text('Qty', startX + cDesc, currentY + 2, {
        width: cQty,
        align: 'center',
      });
      doc.text('Price', startX + cDesc + cQty, currentY + 2, {
        width: cPrice,
        align: 'right',
      });
      doc.text('GST', startX + cDesc + cQty + cPrice, currentY + 2, {
        width: cGst,
        align: 'right',
      });
      doc.text('Amount', startX + cDesc + cQty + cPrice + cGst, currentY + 2, {
        width: cAmt,
        align: 'right',
      });
    }

    doc.fillColor('#000000');
    currentY += 24;
    doc.font('Helvetica').fontSize(9);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      currentY = this.checkPageBreak(doc, currentY, 20, context);

      if (i % 2 === 0) {
        doc
          .rect(startX, currentY - 2, totalW, 18)
          .fill(context.theme.altRowColor);
      }

      doc.fillColor('#111827');

      if (hasCpt) {
        const [cDesc, cCpt, cQty, cPrice, cGst, cAmt] = colWidths;
        doc.text(item.description, startX + 4, currentY, { width: cDesc - 4 });
        doc.text(item.cptCode ?? '—', startX + cDesc, currentY, {
          width: cCpt,
          align: 'center',
        });
        doc.text(item.quantity.toString(), startX + cDesc + cCpt, currentY, {
          width: cQty,
          align: 'center',
        });
        doc.text(
          `${context.currencySymbol}${item.unitPrice.toFixed(2)}`,
          startX + cDesc + cCpt + cQty,
          currentY,
          { width: cPrice, align: 'right' },
        );
        doc.text(
          `${item.gstRate ?? 0}%`,
          startX + cDesc + cCpt + cQty + cPrice,
          currentY,
          { width: cGst, align: 'right' },
        );
        doc.text(
          `${context.currencySymbol}${item.amount.toFixed(2)}`,
          startX + cDesc + cCpt + cQty + cPrice + cGst,
          currentY,
          { width: cAmt, align: 'right' },
        );
      } else {
        const [cDesc, cQty, cPrice, cGst, cAmt] = colWidths;
        doc.text(item.description, startX + 4, currentY, { width: cDesc - 4 });
        doc.text(item.quantity.toString(), startX + cDesc, currentY, {
          width: cQty,
          align: 'center',
        });
        doc.text(
          `${context.currencySymbol}${item.unitPrice.toFixed(2)}`,
          startX + cDesc + cQty,
          currentY,
          { width: cPrice, align: 'right' },
        );
        doc.text(
          `${item.gstRate ?? 0}%`,
          startX + cDesc + cQty + cPrice,
          currentY,
          { width: cGst, align: 'right' },
        );
        doc.text(
          `${context.currencySymbol}${item.amount.toFixed(2)}`,
          startX + cDesc + cQty + cPrice + cGst,
          currentY,
          { width: cAmt, align: 'right' },
        );
      }

      doc.fillColor('#000000');
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
    const labelX = context.margin + context.contentWidth - 200;
    const valueX = labelX + 95;
    const rowW = 205;
    const sym = context.currencySymbol;

    currentY = this.checkPageBreak(doc, currentY, 90, context);

    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    doc.text('Subtotal:', labelX, currentY, { width: 90, align: 'right' });
    doc.text(`${sym}${subtotal.toFixed(2)}`, valueX, currentY, {
      width: 105,
      align: 'right',
    });
    currentY += 15;

    doc.text('Tax:', labelX, currentY, { width: 90, align: 'right' });
    doc.text(`${sym}${tax.toFixed(2)}`, valueX, currentY, {
      width: 105,
      align: 'right',
    });
    currentY += 18;

    doc
      .rect(labelX - 10, currentY - 5, rowW, 26)
      .fill(context.theme.primaryColor);
    doc
      .fillColor(context.theme.primaryTextColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Total:', labelX, currentY + 3, { width: 90, align: 'right' });
    doc.text(`${sym}${total.toFixed(2)}`, valueX, currentY + 3, {
      width: 105,
      align: 'right',
    });
    doc.fillColor('#000000');

    return currentY + 40;
  }

  private async renderAuthorizedSignature(
    doc: typeof PDFDocument.prototype,
    data: InvoiceData,
    context: PDFContext,
    startY: number,
  ): Promise<number> {
    let currentY = this.checkPageBreak(doc, startY + 10, 95, context);
    const signatureX = context.margin + context.contentWidth - 190;
    const label = data.authorizedSignatureLabel || 'Authorized Signature';

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#374151')
      .text(label, signatureX, currentY);
    doc.fillColor('#000000');
    currentY += 12;

    if (data.authorizedSignatureUrl) {
      try {
        const signatureBuffer = await this.fetchSignatureImage(
          data.authorizedSignatureUrl,
        );
        doc.image(signatureBuffer, signatureX, currentY, {
          fit: [170, 45],
          align: 'left',
        });
        currentY += 50;
      } catch {
        doc
          .font('Helvetica-Oblique')
          .fontSize(8)
          .fillColor('#6b7280')
          .text('[Signature on file]', signatureX, currentY);
        doc.fillColor('#000000');
        currentY += 16;
      }
    } else {
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#9ca3af')
        .text('[No signature uploaded]', signatureX, currentY);
      doc.fillColor('#000000');
      currentY += 16;
    }

    doc
      .strokeColor('#94a3b8')
      .lineWidth(0.5)
      .moveTo(signatureX, currentY + 8)
      .lineTo(signatureX + 170, currentY + 8)
      .stroke()
      .strokeColor('#000000')
      .lineWidth(1);

    return currentY + 20;
  }

  private async fetchSignatureImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch signature: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
