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
  async generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer> {
    const builder = new InvoiceDocumentBuilder();
    const content = builder.buildFromData(invoiceData).build();
    return this.pdfRenderer.renderToPdf(content);
  }

  /**
   * Generate prescription PDF
   */
  async generatePrescriptionPdf(
    prescriptionData: PrescriptionData,
  ): Promise<Buffer> {
    const builder = new PrescriptionDocumentBuilder();
    const content = builder.buildFromData(prescriptionData).build();
    return this.pdfRenderer.renderToPdf(content);
  }

  /**
   * Generate report PDF
   * (Can be extended with report-specific builder)
   */
  async generateReportPdf(data: any): Promise<Buffer> {
    // TODO: Implement report PDF generation
    // For now, return empty buffer
    return Buffer.from('Report PDF would go here');
  }
}
