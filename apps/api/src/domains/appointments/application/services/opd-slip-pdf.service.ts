import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  BasePdfService,
  BasePDFConfig,
  PDFContext,
} from '@/shared/modules/document-generation/pdf/base-pdf.service';
import type { PDFClinicInfo, PDFPatientInfo } from '@workspace/types';
import PDFDocument from 'pdfkit';

export interface OpdSlipData {
  documentId?: string;
  clinic: PDFClinicInfo;
  patient: PDFPatientInfo;
  /** Free-revisit window in days. 0/undefined hides the notice. */
  revisitValidityDays?: number;
  /** Optional extra footer line configured by the clinic admin. */
  footerNote?: string;
  date?: Date;
}

const FIELD_LINE_COLOR = '#cbd5e1';

/**
 * Printable OPD prescription slip for Front Desk surfaces. Carries clinic
 * letterhead, patient details, a blank vitals box, labelled blank fields, and a
 * large empty Rx area for the doctor to complete by hand. Nothing clinical is
 * auto-filled.
 */
@Injectable()
export class OpdSlipPdfService extends BasePdfService {
  constructor(@Inject(CLOCK_PORT) clock: IClock) {
    super(clock);
  }

  async generate(data: OpdSlipData): Promise<Buffer> {
    const disclaimer =
      'For physician use. Complete by hand. Not valid for medico-legal purposes.';
    const footerText = data.footerNote?.trim()
      ? `${data.footerNote.trim()}  •  ${disclaimer}`
      : disclaimer;

    const config: BasePDFConfig = {
      title: 'OPD PRESCRIPTION',
      documentId: data.documentId,
      clinic: data.clinic,
      patient: data.patient,
      date: data.date,
      footerText,
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
    currentY = this.renderPatientDetails(doc, data.patient, context, currentY);

    currentY = this.renderVitalsBox(doc, context, currentY);
    currentY = this.renderBlankFields(doc, context, currentY);
    currentY = this.renderRxArea(doc, context, currentY);
    currentY = this.renderValidityNotice(
      doc,
      data.revisitValidityDays,
      context,
      currentY,
    );
    this.renderSignatureLine(doc, context, currentY);

    this.renderFooter(doc, footerText, context);

    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    doc.end();
    // jscpd:ignore-start
    return bufferPromise;
  }

  private renderSectionTitle(
    doc: typeof PDFDocument.prototype,
    title: string,
    context: PDFContext,
    currentY: number,
  ): number {
    doc.rect(context.margin, currentY, 3, 14).fill(context.theme.accentColor);
    doc
      .fillColor(context.theme.titleTextColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(title, context.margin + 8, currentY, {
        // jscpd:ignore-end
        width: context.contentWidth,
      });
    doc.fillColor('#000000');
    return doc.y + 8;
  }

  private renderVitalsBox(
    doc: typeof PDFDocument.prototype,
    context: PDFContext,
    startY: number,
  ): number {
    const currentY = this.renderSectionTitle(doc, 'Vitals', context, startY);

    const labels = ['BP', 'Pulse', 'Temp', 'SpO₂', 'Wt', 'Ht', 'RR'];
    const cellWidth = context.contentWidth / labels.length;
    const boxHeight = 30;

    doc
      .rect(context.margin, currentY, context.contentWidth, boxHeight)
      .strokeColor(FIELD_LINE_COLOR)
      .lineWidth(0.75)
      .stroke();

    labels.forEach((label, index) => {
      const cellX = context.margin + cellWidth * index;
      if (index > 0) {
        doc
          .moveTo(cellX, currentY)
          .lineTo(cellX, currentY + boxHeight)
          .strokeColor(FIELD_LINE_COLOR)
          .lineWidth(0.75)
          .stroke();
      }
      doc
        .fillColor('#6b7280')
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(label, cellX + 4, currentY + 4, { width: cellWidth - 8 });
    });

    doc.fillColor('#000000').strokeColor('#000000').lineWidth(1);
    return currentY + boxHeight + 14;
  }

  private renderBlankFields(
    doc: typeof PDFDocument.prototype,
    context: PDFContext,
    startY: number,
  ): number {
    let currentY = startY;
    const fields = ['Chief Complaint', 'Diagnosis', 'Investigations', 'Advice'];

    for (const label of fields) {
      currentY = this.checkPageBreak(doc, currentY, 36, context);
      doc
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(`${label}:`, context.margin, currentY);
      const lineY = currentY + 18;
      doc
        .moveTo(context.margin, lineY)
        .lineTo(context.margin + context.contentWidth, lineY)
        .strokeColor(FIELD_LINE_COLOR)
        .lineWidth(0.5)
        .stroke()
        .strokeColor('#000000')
        .lineWidth(1);
      doc.fillColor('#000000');
      currentY = lineY + 12;
    }

    return currentY + 4;
  }

  private renderRxArea(
    doc: typeof PDFDocument.prototype,
    context: PDFContext,
    startY: number,
  ): number {
    // jscpd:ignore-start
    let currentY = this.checkPageBreak(doc, startY, 160, context);

    doc
      .fillColor(context.theme.accentColor)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('Rx', context.margin, currentY);
    doc.fillColor('#000000');
    currentY += 28;

    const boxHeight = Math.max(
      // jscpd:ignore-end
      120,
      doc.page.height - context.margin - 120 - currentY,
    );
    doc
      .rect(context.margin, currentY, context.contentWidth, boxHeight)
      .strokeColor(FIELD_LINE_COLOR)
      .lineWidth(0.75)
      .stroke()
      .strokeColor('#000000')
      .lineWidth(1);

    return currentY + boxHeight + 16;
  }

  private renderValidityNotice(
    doc: typeof PDFDocument.prototype,
    revisitValidityDays: number | undefined,
    context: PDFContext,
    startY: number,
  ): number {
    let currentY = this.checkPageBreak(doc, startY, 50, context);

    if (revisitValidityDays && revisitValidityDays > 0) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(context.theme.titleTextColor)
        .text(
          `Valid for free revisit within ${revisitValidityDays} day${revisitValidityDays === 1 ? '' : 's'} from the date of issue.`,
          context.margin,
          currentY,
          { width: context.contentWidth },
        );
      doc.fillColor('#000000');
      currentY = doc.y + 8;
    }

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#374151')
      .text('Next visit: ___________________', context.margin, currentY);
    doc.fillColor('#000000');
    return doc.y + 12;
  }

  private renderSignatureLine(
    doc: typeof PDFDocument.prototype,
    context: PDFContext,
    startY: number,
  ): void {
    const currentY = this.checkPageBreak(doc, startY, 60, context);
    const signatureX = context.margin + context.contentWidth - 200;
    const lineY = currentY + 30;

    doc
      .moveTo(signatureX, lineY)
      .lineTo(signatureX + 180, lineY)
      .strokeColor(FIELD_LINE_COLOR)
      .lineWidth(0.75)
      .stroke()
      .strokeColor('#000000')
      .lineWidth(1);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text("Doctor's Signature", signatureX, lineY + 4);
    doc.fillColor('#000000');
  }
}
