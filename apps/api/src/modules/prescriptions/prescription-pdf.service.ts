import { Injectable } from '@nestjs/common';
import {
  BasePdfService,
  BasePDFConfig,
  PDFContext,
} from '../../common/services/pdf/base-pdf.service';
import {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFPatientInfo,
  PDFMedicationInfo,
} from '@workspace/types';
import PDFDocument from 'pdfkit';

export interface PrescriptionData {
  prescriptionId: string;
  clinic: PDFClinicInfo;
  doctor: PDFDoctorInfo;
  patient: PDFPatientInfo;
  medications: PDFMedicationInfo[];
  diagnosis?: string;
  instructions?: string;
  nextVisit?: Date;
  date?: Date;
  validityDays?: number;
}

@Injectable()
export class PrescriptionPdfService extends BasePdfService {
  async generate(data: PrescriptionData): Promise<Buffer> {
    const config: BasePDFConfig = {
      title: 'PRESCRIPTION',
      documentId: data.prescriptionId,
      clinic: data.clinic,
      patient: data.patient,
      doctor: data.doctor,
      date: data.date,
      // margin: 50, // Default from base
      footerText: `This prescription is valid for ${data.validityDays ?? 30} days from the date of issue. Not valid for medico-legal purposes.`,
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

    // Diagnosis
    if (data.diagnosis) {
      currentY = this.renderSectionTitle(
        doc,
        'Chief Complaint / Diagnosis',
        context,
        currentY,
      );
      doc.font('Helvetica').text(data.diagnosis, context.margin, currentY, {
        width: context.contentWidth,
      });
      currentY = doc.y + 15;
    }

    // Rx Symbol
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Rx', context.margin, currentY);
    currentY += 25;

    // Medications Table
    currentY = this.renderMedicationsTable(
      doc,
      data.medications,
      context,
      currentY,
    );

    // Special Instructions
    if (data.instructions) {
      currentY += 15;
      currentY = this.checkPageCheck(doc, currentY, 50, context);
      currentY = this.renderSectionTitle(
        doc,
        'Special Instructions',
        context,
        currentY,
      );
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(data.instructions, context.margin, currentY, {
          width: context.contentWidth,
        });
      currentY = doc.y;
    }

    // Allergies Warning
    if (data.patient.allergies?.length) {
      currentY += 20;
      currentY = this.checkPageCheck(doc, currentY, 40, context);
      this.renderWarningBox(
        doc,
        `WARNING - Known Allergies: ${data.patient.allergies.join(', ')}`,
        context,
        currentY,
      );
      currentY = doc.y;
    }

    // Next Visit
    if (data.nextVisit) {
      currentY += 20;
      currentY = this.checkPageCheck(doc, currentY, 30, context);
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
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
      currentY = doc.y;
    }

    // Doctor Signature
    currentY += 40;
    currentY = this.checkPageCheck(doc, currentY, 80, context);
    // Align to right for signature
    const signatureX = context.margin + context.contentWidth - 200;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text("Doctor's Signature:", signatureX, currentY);
    currentY += 40; // Space for signature

    doc.text(data.doctor.name, signatureX, currentY);
    if (data.doctor.registrationNumber) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(`Reg: ${data.doctor.registrationNumber}`, signatureX, doc.y);
    }

    // Footer (Page numbers etc)
    this.renderFooter(doc, config.footerText, context);

    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
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
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title, context.margin, currentY);
    return doc.y + 5;
  }

  private renderMedicationsTable(
    doc: typeof PDFDocument.prototype,
    medications: PDFMedicationInfo[],
    context: PDFContext,
    startY: number,
  ): number {
    let currentY = startY;
    const colWidths = [150, 60, 60, 60, 80]; // Name, Dosage, Freq, Duration, Instructions
    const startX = context.margin;

    // Table Header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Medicine', startX, currentY, { width: colWidths[0] });
    doc.text('Dosage', startX + colWidths[0], currentY, {
      width: colWidths[1],
    });
    doc.text('Freq', startX + colWidths[0] + colWidths[1], currentY, {
      width: colWidths[2],
    });
    doc.text(
      'Duration',
      startX + colWidths[0] + colWidths[1] + colWidths[2],
      currentY,
      { width: colWidths[3] },
    );
    doc.text(
      'Notes',
      startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      currentY,
      { width: colWidths[4] },
    );

    currentY += 15;
    this.drawDivider(doc, currentY, context);
    currentY += 10;

    doc.font('Helvetica').fontSize(9);

    for (const med of medications) {
      currentY = this.checkPageCheck(doc, currentY, 30, context);
      const rowY = currentY;

      doc.text(med.name, startX, rowY, { width: colWidths[0] });
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
        doc.text(
          med.specialInstructions,
          startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
          rowY,
          { width: colWidths[4] },
        );
      }

      currentY = doc.y + 10;
      this.drawDivider(doc, currentY, context); // Row separator
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
      .fill('#ffebee')
      .stroke('#ef5350');
    doc
      .fillColor('#c62828')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(text, context.margin + 10, y + 10);
    doc.fillColor('black'); // Reset
  }

  // Wrapper for protected method to match expected signature if needed, or just use protected directly
  private checkPageCheck(
    doc: typeof PDFDocument.prototype,
    currentY: number,
    needed: number,
    context: PDFContext,
  ): number {
    return this.checkPageBreak(doc, currentY, needed, context);
  }
}
