import { Injectable } from '@nestjs/common';
import {
  BasePdfService,
  BasePDFConfig,
  PDFContext,
} from '@/shared/modules/document-generation/pdf/base-pdf.service';
import {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFPatientInfo,
  PDFMedicationInfo,
  PDFDiagnosis,
  PDFHospitalConfig,
  resolvePdfCodePair,
} from '@workspace/types';
import PDFDocument from 'pdfkit';

export interface PrescriptionData {
  prescriptionId: string;
  clinic: PDFClinicInfo;
  doctor: PDFDoctorInfo;
  patient: PDFPatientInfo;
  medications: PDFMedicationInfo[];
  diagnoses?: PDFDiagnosis[];
  instructions?: string;
  nextVisit?: Date;
  date?: Date;
  validityDays?: number;
  hospitalConfig?: PDFHospitalConfig;
}

@Injectable()
export class PrescriptionPdfService extends BasePdfService {
  async generate(data: PrescriptionData): Promise<Buffer> {
    const config: BasePDFConfig = {
      title: 'PRESCRIPTION',
      documentId: data.prescriptionId,
      clinic: {
        ...data.clinic,
        branding: data.hospitalConfig?.theme
          ? { ...data.clinic.branding, ...data.hospitalConfig.theme }
          : data.clinic.branding,
      },
      patient: data.patient,
      doctor: data.doctor,
      date: data.date,
      footerText: `This prescription is valid for ${data.validityDays ?? 30} days from the date of issue. Not valid for medico-legal purposes.`,
    };

    const { doc, context } = this.createDocument(config);
    const buffers: Buffer[] = [];

    doc.on('data', (buffer: Buffer) => buffers.push(buffer));
    doc.on('end', () => {});

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

    if (data.diagnoses?.length) {
      currentY = this.renderDiagnosesSection(
        doc,
        data.diagnoses,
        data.hospitalConfig,
        context,
        currentY,
      );
    }

    doc
      .fillColor(context.theme.accentColor)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('Rx', context.margin, currentY);
    doc.fillColor('#000000');
    currentY += 28;

    currentY = this.renderMedicationsTable(
      doc,
      data.medications,
      context,
      currentY,
    );

    if (data.instructions) {
      currentY += 15;
      currentY = this.checkPageBreak(doc, currentY, 50, context);
      currentY = this.renderSectionTitle(
        doc,
        'Special Instructions',
        context,
        currentY,
      );
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#374151')
        .text(data.instructions, context.margin, currentY, {
          width: context.contentWidth,
        });
      doc.fillColor('#000000');
      currentY = doc.y;
    }

    if (data.patient.allergies?.length) {
      currentY += 20;
      currentY = this.checkPageBreak(doc, currentY, 40, context);
      this.renderWarningBox(
        doc,
        `WARNING - Known Allergies: ${data.patient.allergies.join(', ')}`,
        context,
        currentY,
      );
      currentY = doc.y;
    }

    if (data.nextVisit) {
      currentY += 20;
      currentY = this.checkPageBreak(doc, currentY, 30, context);
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(context.theme.titleTextColor)
        .text(
          `Next Visit: ${data.nextVisit.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          context.margin,
          currentY,
        );
      doc.fillColor('#000000');
      currentY = doc.y;
    }

    currentY += 40;
    currentY = this.checkPageBreak(doc, currentY, 80, context);

    const signatureX = context.margin + context.contentWidth - 200;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text("Doctor's Signature:", signatureX, currentY);
    doc.fillColor('#000000');
    currentY += 15;

    if (data.doctor.signatureUrl) {
      try {
        const signatureBuffer = await this.fetchSignatureImage(
          data.doctor.signatureUrl,
        );
        doc.image(signatureBuffer, signatureX, currentY, {
          fit: [180, 60],
          align: 'left',
        });
        currentY += 65;
      } catch {
        doc
          .font('Helvetica-Oblique')
          .fontSize(8)
          .fillColor('#6b7280')
          .text('[Digital signature]', signatureX, currentY);
        doc.fillColor('#000000');
        currentY += 15;
      }
    } else {
      currentY += 25;
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#111827')
      .text(data.doctor.name, signatureX, currentY);
    if (data.doctor.registrationNumber) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(`Reg: ${data.doctor.registrationNumber}`, signatureX, doc.y);
      doc.fillColor('#000000');
    }

    this.renderFooter(doc, config.footerText, context);

    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    doc.end();

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
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(title, context.margin + 8, currentY, {
        width: context.contentWidth,
      });
    doc.fillColor('#000000');
    return doc.y + 8;
  }

  private renderDiagnosesSection(
    doc: typeof PDFDocument.prototype,
    diagnoses: PDFDiagnosis[],
    hospitalConfig: PDFHospitalConfig | undefined,
    context: PDFContext,
    currentY: number,
  ): number {
    currentY = this.renderSectionTitle(
      doc,
      'Chief Complaint / Diagnosis',
      context,
      currentY,
    );

    const codeSystem = hospitalConfig?.codeSystem ?? 'ICD-10';

    for (const d of diagnoses) {
      currentY = this.checkPageBreak(doc, currentY, 20, context);

      const prefix = d.isPrimary ? '\u25CF ' : '\u25CB ';
      let line = `${prefix}${d.description ?? ''}`;

      if (d.icdCode) {
        const resolvedCodes = resolvePdfCodePair(
          hospitalConfig?.codeOverrides,
          d.description ?? d.icdCode,
          {
            icd: d.icdCode,
            cpt: d.cptCode,
          },
        );
        const displayCode = resolvedCodes.icd ?? d.icdCode;
        const label =
          resolvedCodes.icd !== d.icdCode ? 'Code' : (d.version ?? codeSystem);
        line += ` (${label}: ${displayCode})`;
      }

      doc
        .font(d.isPrimary ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor('#111827')
        .text(line, context.margin, currentY, { width: context.contentWidth });
      doc.fillColor('#000000');
      currentY = doc.y + 4;
    }

    currentY += 8;
    return currentY;
  }

  private renderMedicationsTable(
    doc: typeof PDFDocument.prototype,
    medications: PDFMedicationInfo[],
    context: PDFContext,
    startY: number,
  ): number {
    let currentY = startY;
    const colWidths = [165, 65, 75, 70, 85];
    const startX = context.margin;
    const totalW = colWidths.reduce((a, b) => a + b, 0);

    doc.rect(startX, currentY - 4, totalW, 22).fill(context.theme.primaryColor);
    doc
      .fillColor(context.theme.primaryTextColor)
      .fontSize(9)
      .font('Helvetica-Bold');
    doc.text('Medicine', startX + 4, currentY + 2, { width: colWidths[0] });
    doc.text('Dosage', startX + colWidths[0], currentY + 2, {
      width: colWidths[1],
    });
    doc.text('Frequency', startX + colWidths[0] + colWidths[1], currentY + 2, {
      width: colWidths[2],
    });
    doc.text(
      'Duration',
      startX + colWidths[0] + colWidths[1] + colWidths[2],
      currentY + 2,
      { width: colWidths[3] },
    );
    doc.text(
      'Notes',
      startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      currentY + 2,
      { width: colWidths[4] },
    );
    doc.fillColor('#000000');
    currentY += 24;

    doc.font('Helvetica').fontSize(9);

    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      currentY = this.checkPageBreak(doc, currentY, 30, context);
      const rowY = currentY;

      if (i % 2 === 0) {
        doc.rect(startX, rowY - 2, totalW, 18).fill(context.theme.altRowColor);
      }

      doc.fillColor('#111827');
      doc.text(med.name, startX + 4, rowY, { width: colWidths[0] - 4 });
      doc.text(med.dosage, startX + colWidths[0], rowY, {
        width: colWidths[1],
      });
      doc.text(med.frequency, startX + colWidths[0] + colWidths[1], rowY, {
        width: colWidths[2],
      });
      doc.text(
        med.duration,
        startX + colWidths[0] + colWidths[1] + colWidths[2],
        rowY,
        { width: colWidths[3] },
      );
      if (med.specialInstructions) {
        doc
          .fillColor('#374151')
          .text(
            med.specialInstructions,
            startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
            rowY,
            { width: colWidths[4] },
          );
      }

      doc.fillColor('#000000');
      currentY = doc.y + 8;
      this.drawDivider(doc, currentY, context);
      currentY += 5;
    }

    return currentY;
  }

  private renderWarningBox(
    doc: typeof PDFDocument.prototype,
    text: string,
    context: PDFContext,
    y: number,
  ) {
    doc
      .rect(context.margin, y, context.contentWidth, 30)
      .fill('#fff1f2')
      .stroke('#fca5a5');
    doc
      .fillColor('#991b1b')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(text, context.margin + 10, y + 10);
    doc.fillColor('#000000');
  }

  private async fetchSignatureImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch signature: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Error fetching signature from ${url}: ${errorMessage}`);
    }
  }
}
