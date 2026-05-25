import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PdfLayoutService } from './pdf-layout.service';
import { PrescriptionPdfRenderer } from './prescription-pdf.renderer';
import { InvoicePdfRenderer } from './invoice-pdf.renderer';
import { ClinicalInvoicePdfService } from './clinical-invoice-pdf.service';
import {
  isClinicalInvoiceInput,
  mapInvoicePdfInputToClinical,
} from './clinical-invoice-pdf.mapper';
import type { IPdfDocumentRenderer } from './pdf-document-renderer.interface';
import type {
  InvoicePdfInput,
  PDFConfig,
  PrescriptionPdfInput,
} from './pdf.types';

export type {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFPatientInfo,
  PDFMedicationInfo,
  PDFInvoiceItem,
  TableColumn,
  PDFDocumentType,
  PDFContext,
  PDFConfig,
} from './pdf.types';

@Injectable()
export class PDFGeneratorService implements IPdfDocumentRenderer {
  private readonly logger = new Logger(PDFGeneratorService.name);

  constructor(
    private readonly layout: PdfLayoutService,
    private readonly prescriptionRenderer: PrescriptionPdfRenderer,
    private readonly invoiceRenderer: InvoicePdfRenderer,
    private readonly clinicalInvoicePdf: ClinicalInvoicePdfService,
  ) {}

  async generatePrescription(data: PrescriptionPdfInput): Promise<Buffer> {
    return this.generate(this.prescriptionRenderer.buildConfig(data));
  }

  async generateInvoice(data: InvoicePdfInput): Promise<Buffer> {
    if (isClinicalInvoiceInput(data)) {
      return this.clinicalInvoicePdf.generate(
        mapInvoicePdfInputToClinical(data),
      );
    }
    return this.generate(this.invoiceRenderer.buildConfig(data));
  }

  async generate(config: PDFConfig): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const margin = config.margin ?? 50;
      const doc = new PDFDocument({ margin, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const context = {
        currentY: margin,
        pageWidth: doc.page.width,
        contentWidth: doc.page.width - margin * 2,
        margin,
      };

      try {
        context.currentY = this.layout.renderClinicHeader(
          doc,
          config.clinic,
          context,
          config.type,
        );

        context.currentY = this.layout.renderDocumentTitle(
          doc,
          config.title,
          config.documentId,
          config.date,
          context,
          config.showRxSymbol,
        );

        if (config.patient || config.doctor) {
          context.currentY = this.layout.renderPatientDoctorInfo(
            doc,
            config.patient,
            config.doctor,
            context,
          );
        }

        context.currentY += 15;

        for (const section of config.sections) {
          section(doc, context, this.layout);
        }

        if (config.doctor) {
          context.currentY = this.layout.renderDoctorSignature(
            doc,
            config.doctor,
            context,
          );
        }

        if (config.footerText) {
          this.layout.renderFooter(doc, config.footerText);
        }

        doc.end();
      } catch (error) {
        this.logger.error('Error generating PDF', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
