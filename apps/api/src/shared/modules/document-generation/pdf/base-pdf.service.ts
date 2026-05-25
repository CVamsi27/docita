import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { fetchWithTimeout } from '@/shared/common/http/fetch-with-timeout';
import PDFDocument from 'pdfkit';
import {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFPatientInfo,
  PDFTheme,
  DEFAULT_PDF_THEME,
  TableColumn as _TableColumn,
  resolveCurrencySymbol,
} from '@workspace/types';
import { DATE_FORMATS, formatDate } from '@workspace/utils';

export interface PDFContext {
  currentY: number;
  pageWidth: number;
  contentWidth: number;
  margin: number;
  theme: PDFTheme;
  currencySymbol: string;
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

const DIVIDER_COLOR = '#e2e8f0';

@Injectable()
export class BasePdfService {
  protected readonly logger = new Logger(BasePdfService.name);

  constructor(@Inject(CLOCK_PORT) private readonly clock: IClock) {}

  protected createDocument(config: BasePDFConfig): {
    doc: typeof PDFDocument.prototype;
    context: PDFContext;
  } {
    const doc = new PDFDocument({
      size: 'A4',
      margin: config.margin ?? 50,
      bufferPages: true,
    });

    const theme: PDFTheme = {
      ...DEFAULT_PDF_THEME,
      ...(config.clinic.branding ?? {}),
    };

    const context: PDFContext = {
      currentY: config.margin ?? 50,
      pageWidth: doc.page.width,
      contentWidth: doc.page.width - (config.margin ?? 50) * 2,
      margin: config.margin ?? 50,
      theme,
      currencySymbol: resolveCurrencySymbol(config.clinic),
    };

    return { doc, context };
  }

  protected async renderHeader(
    doc: typeof PDFDocument.prototype,
    config: BasePDFConfig,
    context: PDFContext,
  ): Promise<number> {
    const bannerHeight = 88;

    doc
      .rect(0, 0, context.pageWidth, bannerHeight)
      .fill(context.theme.primaryColor);

    let currentY = 16;

    if (config.clinic.logo) {
      const logoData = await this.fetchImage(config.clinic.logo);
      if (logoData) {
        try {
          doc.image(logoData, context.margin, 14, { width: 55, height: 55 });
        } catch (e) {
          this.logger.warn('Failed to embed clinic logo', e);
        }
      }
    }

    const textX = config.clinic.logo ? context.margin + 68 : context.margin;
    const textWidth = config.clinic.logo
      ? context.contentWidth - 68
      : context.contentWidth;
    const align = config.clinic.logo ? 'left' : 'center';

    doc
      .fillColor(context.theme.primaryTextColor)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(config.clinic.name, textX, currentY, { width: textWidth, align });

    currentY += 26;

    const primaryLine = [
      config.clinic.address,
      config.clinic.city,
      config.clinic.phone ? `Tel: ${config.clinic.phone}` : '',
      config.clinic.email,
    ]
      .filter(Boolean)
      .join('  |  ');

    if (primaryLine) {
      doc
        .fillColor(context.theme.primaryLightColor)
        .font('Helvetica')
        .fontSize(8)
        .text(primaryLine, textX, currentY, { width: textWidth, align });
      currentY += 13;
    }

    const secondaryLine = [
      config.clinic.gstin ? `GSTIN: ${config.clinic.gstin}` : '',
      config.clinic.registrationNumber
        ? `Reg: ${config.clinic.registrationNumber}`
        : '',
      config.clinic.website,
    ]
      .filter(Boolean)
      .join('  |  ');

    if (secondaryLine) {
      doc
        .fillColor('#93c5fd')
        .fontSize(7)
        .text(secondaryLine, textX, currentY, { width: textWidth, align });
    }

    doc.fillColor('#000000');

    return bannerHeight + 14;
  }

  protected renderTitle(
    doc: typeof PDFDocument.prototype,
    title: string,
    documentId: string | undefined,
    context: PDFContext,
    currentY: number,
  ): number {
    doc
      .rect(context.margin, currentY, context.contentWidth, 30)
      .fill(context.theme.titleBgColor);

    doc
      .fillColor(context.theme.titleTextColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(title, context.margin, currentY + 8, {
        align: 'center',
        width: context.contentWidth,
      });

    doc.fillColor('#000000');
    currentY += 37;

    const dateStr = `Date: ${formatDate(this.clock.now(), DATE_FORMATS.DATE_LONG)}`;

    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');

    if (documentId) {
      doc.text(`ID: ${documentId}`, context.margin, currentY, {
        width: context.contentWidth / 2,
      });
      doc.text(dateStr, context.margin, currentY, {
        align: 'right',
        width: context.contentWidth,
      });
    } else {
      doc.text(dateStr, context.margin, currentY, {
        align: 'right',
        width: context.contentWidth,
      });
    }

    doc.fillColor('#000000');
    currentY += 18;

    this.drawDivider(doc, currentY, context);
    currentY += 12;

    return currentY;
  }

  protected renderPatientDetails(
    doc: typeof PDFDocument.prototype,
    patient: PDFPatientInfo,
    context: PDFContext,
    currentY: number,
  ): number {
    const halfWidth = context.contentWidth / 2;

    doc.rect(context.margin, currentY, 3, 14).fill(context.theme.accentColor);
    doc
      .fillColor(context.theme.titleTextColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Patient Details', context.margin + 8, currentY, {
        width: context.contentWidth,
      });
    doc.fillColor('#000000');
    currentY += 18;

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    const startY = currentY;

    doc.text(`Name: ${patient.name}`, context.margin, currentY);
    currentY += 14;
    if (patient.age || patient.gender) {
      doc.text(
        `Age/Gender: ${patient.age ? patient.age + 'Y' : ''} ${patient.gender ? '/ ' + patient.gender : ''}`,
        context.margin,
        currentY,
      );
      currentY += 14;
    }
    if (patient.phoneNumber) {
      doc.text(`Phone: ${patient.phoneNumber}`, context.margin, currentY);
      currentY += 14;
    }

    let rightY = startY;
    const rightX = context.margin + halfWidth;

    if (patient.patientId) {
      doc.text(`Patient ID: ${patient.patientId}`, rightX, rightY);
      rightY += 14;
    }
    if (patient.bloodGroup) {
      doc.text(`Blood Group: ${patient.bloodGroup}`, rightX, rightY);
      rightY += 14;
    }
    if (patient.weight) {
      doc.text(`Weight: ${patient.weight} kg`, rightX, rightY);
      rightY += 14;
    }

    doc.fillColor('#000000');
    currentY = Math.max(currentY, rightY) + 8;
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
    doc.rect(context.margin, currentY, 3, 14).fill(context.theme.accentColor);
    doc
      .fillColor(context.theme.titleTextColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Treating Physician', context.margin + 8, currentY, {
        width: context.contentWidth,
      });
    doc.fillColor('#000000');
    currentY += 18;

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    doc.text(doctor.name, context.margin, currentY);
    currentY += 13;

    if (doctor.qualification) {
      doc
        .fillColor('#374151')
        .text(doctor.qualification, context.margin, currentY);
      currentY += 13;
    }

    if (doctor.registrationNumber) {
      doc
        .fillColor('#6b7280')
        .text(
          `Reg. No: ${doctor.registrationNumber}${doctor.councilName ? ` (${doctor.councilName})` : ''}`,
          context.margin,
          currentY,
        );
      currentY += 13;
    }

    doc.fillColor('#000000');
    currentY += 8;
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

      this.drawDivider(doc, bottomY - 22, context);

      if (footerText) {
        doc
          .fillColor('#6b7280')
          .fontSize(7)
          .font('Helvetica')
          .text(footerText, context.margin, bottomY - 12, {
            align: 'center',
            width: context.contentWidth - 80,
          });
      }

      doc
        .fillColor('#9ca3af')
        .fontSize(7)
        .text(`Page ${i + 1} of ${range.count}`, context.margin, bottomY - 12, {
          align: 'right',
          width: context.contentWidth,
        });

      doc.fillColor('#000000');
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
      .strokeColor(DIVIDER_COLOR)
      .lineWidth(0.5)
      .stroke()
      .strokeColor('#000000')
      .lineWidth(1);
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

  private async fetchImage(
    src: Buffer | string,
  ): Promise<Buffer | string | undefined> {
    if (Buffer.isBuffer(src)) return src;
    if (
      typeof src === 'string' &&
      (src.startsWith('http://') || src.startsWith('https://'))
    ) {
      try {
        const response = await fetchWithTimeout(src);
        if (!response.ok) return undefined;
        const buf = await response.arrayBuffer();
        return Buffer.from(buf);
      } catch {
        return undefined;
      }
    }
    return src;
  }
}
