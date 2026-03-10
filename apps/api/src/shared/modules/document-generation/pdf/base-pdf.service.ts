import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFPatientInfo,
  TableColumn as _TableColumn,
} from '@workspace/types';

export interface PDFContext {
  currentY: number;
  pageWidth: number;
  contentWidth: number;
  margin: number;
}

export interface BasePDFConfig {
  title: string;
  documentId?: string;
  clinic: PDFClinicInfo;
  patient?: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  date?: Date;
  margin?: number;
  footerText?: string;
}

@Injectable()
export class BasePdfService {
  protected readonly logger = new Logger(BasePdfService.name);

  protected createDocument(config: BasePDFConfig): {
    doc: typeof PDFDocument.prototype;
    context: PDFContext;
  } {
    const doc = new PDFDocument({
      size: 'A4',
      margin: config.margin ?? 50,
      bufferPages: true,
    });

    const context: PDFContext = {
      currentY: config.margin ?? 50,
      pageWidth: doc.page.width,
      contentWidth: doc.page.width - (config.margin ?? 50) * 2,
      margin: config.margin ?? 50,
    };

    return { doc, context };
  }

  protected renderHeader(
    doc: typeof PDFDocument.prototype,
    config: BasePDFConfig,
    context: PDFContext,
  ): number {
    let currentY = context.margin;

    if (config.clinic.logo) {
      try {
        const logoWidth = 80;
        doc.image(config.clinic.logo, context.margin, currentY, {
          width: logoWidth,
        });
      } catch (e) {
        this.logger.warn('Failed to load clinic logo', e);
      }
    }

    const textX = config.clinic.logo ? context.margin + 100 : context.margin;
    const textWidth = config.clinic.logo
      ? context.contentWidth - 100
      : context.contentWidth;
    const align = config.clinic.logo ? 'right' : 'center';

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(config.clinic.name, textX, currentY, {
        width: textWidth,
        align,
      });

    currentY += 25;

    doc.font('Helvetica').fontSize(10);

    const details = [
      config.clinic.address,
      config.clinic.city ? `${config.clinic.city}` : '',
      config.clinic.phone ? `Phone: ${config.clinic.phone}` : '',
      config.clinic.email ? `Email: ${config.clinic.email}` : '',
      config.clinic.website,
    ].filter(Boolean);

    details.forEach((line) => {
      doc.text(line, textX, currentY, { width: textWidth, align });
      currentY += 15;
    });

    if (currentY < context.margin + 80) {
      currentY = context.margin + 80;
    }

    currentY += 10;
    this.drawDivider(doc, currentY, context);
    currentY += 20;

    return currentY;
  }

  protected renderTitle(
    doc: typeof PDFDocument.prototype,
    title: string,
    documentId: string | undefined,
    context: PDFContext,
    currentY: number,
  ): number {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(title, context.margin, currentY, {
        align: 'center',
        width: context.contentWidth,
      });

    currentY += 25;

    if (documentId) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`ID: ${documentId}`, context.margin, currentY, {
          align: 'right',
          width: context.contentWidth,
        });
      currentY += 15;
    }

    doc.text(
      `Date: ${new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
      context.margin,
      currentY,
      { align: 'right', width: context.contentWidth },
    );

    currentY += 20;
    return currentY;
  }

  protected renderPatientDetails(
    doc: typeof PDFDocument.prototype,
    patient: PDFPatientInfo,
    context: PDFContext,
    currentY: number,
  ): number {
    const _boxTop = currentY;
    const halfWidth = context.contentWidth / 2;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Patient Details:', context.margin, currentY);
    currentY += 15;

    doc.font('Helvetica');
    const startY = currentY;

    doc.text(`Name: ${patient.name}`, context.margin, currentY);
    currentY += 15;
    if (patient.age || patient.gender) {
      doc.text(
        `Age/Gender: ${patient.age ? patient.age + 'Y' : ''} ${
          patient.gender ? '/' + patient.gender : ''
        }`,
        context.margin,
        currentY,
      );
      currentY += 15;
    }
    if (patient.phoneNumber) {
      doc.text(`Phone: ${patient.phoneNumber}`, context.margin, currentY);
      currentY += 15;
    }

    let rightY = startY;
    const rightX = context.margin + halfWidth;

    if (patient.patientId) {
      doc.text(`Patient ID: ${patient.patientId}`, rightX, rightY);
      rightY += 15;
    }
    if (patient.bloodGroup) {
      doc.text(`Blood Group: ${patient.bloodGroup}`, rightX, rightY);
      rightY += 15;
    }
    if (patient.weight) {
      doc.text(`Weight: ${patient.weight} kg`, rightX, rightY);
      rightY += 15;
    }

    currentY = Math.max(currentY, rightY) + 10;
    this.drawDivider(doc, currentY, context);
    currentY += 10;

    return currentY;
  }

  protected renderDoctorDetails(
    doc: typeof PDFDocument.prototype,
    doctor: PDFDoctorInfo,
    context: PDFContext,
    currentY: number,
  ): number {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Doctor:', context.margin, currentY);
    currentY += 15;

    doc.font('Helvetica');
    doc.text(doctor.name, context.margin, currentY);
    currentY += 15;

    if (doctor.qualification) {
      doc.text(doctor.qualification, context.margin, currentY);
      currentY += 15;
    }

    if (doctor.registrationNumber) {
      doc.text(
        `Reg. No: ${doctor.registrationNumber} ${
          doctor.councilName ? `(${doctor.councilName})` : ''
        }`,
        context.margin,
        currentY,
      );
      currentY += 15;
    }

    currentY += 10;
    return currentY;
  }

  protected renderFooter(
    doc: typeof PDFDocument.prototype,
    footerText: string | undefined,
    context: PDFContext,
  ): void {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottomY = doc.page.height - context.margin;

      this.drawDivider(doc, bottomY - 20, context);

      if (footerText) {
        doc.fontSize(8).text(footerText, context.margin, bottomY - 10, {
          align: 'center',
          width: context.contentWidth,
        });
      }

      doc.text(
        `Page ${i + 1} of ${range.count}`,
        context.margin,
        bottomY - 10,
        {
          align: 'right',
          width: context.contentWidth,
        },
      );
    }
  }

  protected drawDivider(
    doc: typeof PDFDocument.prototype,
    y: number,
    context: PDFContext,
  ) {
    doc
      .moveTo(context.margin, y)
      .lineTo(context.margin + context.contentWidth, y)
      .strokeColor('#cccccc')
      .stroke();
  }

  protected checkPageBreak(
    doc: typeof PDFDocument.prototype,
    currentY: number,
    neededSpace: number,
    context: PDFContext,
  ): number {
    if (currentY + neededSpace > doc.page.height - context.margin) {
      doc.addPage();
      return context.margin;
    }
    return currentY;
  }
}
