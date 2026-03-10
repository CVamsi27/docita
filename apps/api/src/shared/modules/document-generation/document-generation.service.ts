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

  generateInvoicePdf(invoiceData: InvoiceData): Buffer {
    const builder = new InvoiceDocumentBuilder();
    const content = builder.buildFromData(invoiceData).build();
    return this.pdfRenderer.renderToPdf(content);
  }

  generatePrescriptionPdf(prescriptionData: PrescriptionData): Buffer {
    const builder = new PrescriptionDocumentBuilder();
    const content = builder.buildFromData(prescriptionData).build();
    return this.pdfRenderer.renderToPdf(content);
  }

  generateReportPdf(
    _data: Record<string, string | number | boolean>,
  ): Promise<Buffer> {
    return Promise.resolve(Buffer.from('Report PDF would go here'));
  }
}
