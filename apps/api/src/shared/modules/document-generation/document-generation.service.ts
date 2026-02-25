/**
 * Document Generation Service
 * Orchestrates document generation from data to final output
 */

import { Injectable } from '@nestjs/common';
import {
  InvoiceDocumentBuilder,
  type InvoiceData,
  PrescriptionDocumentBuilder,
  type PrescriptionData,
} from './builders';
import { PdfRendererService } from './renderers';

@Injectable()
export class DocumentGenerationService {
  constructor(private pdfRenderer: PdfRendererService) {}

  /**
   * Generate invoice PDF
   */
  generateInvoicePdf(invoiceData: InvoiceData): Buffer {
    const builder = new InvoiceDocumentBuilder();
    const content = builder.buildFromData(invoiceData).build();
    return this.pdfRenderer.renderToPdf(content);
  }

  /**
   * Generate prescription PDF
   */
  generatePrescriptionPdf(prescriptionData: PrescriptionData): Buffer {
    const builder = new PrescriptionDocumentBuilder();
    const content = builder.buildFromData(prescriptionData).build();
    return this.pdfRenderer.renderToPdf(content);
  }

  /**
   * Generate report PDF
   * (Can be extended with report-specific builder)
   */
  generateReportPdf(
    data: Record<string, string | number | boolean>,
  ): Promise<Buffer> {
    return Promise.resolve(Buffer.from('Report PDF would go here'));
  }
}
