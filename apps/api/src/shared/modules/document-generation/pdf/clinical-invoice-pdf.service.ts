import { Injectable } from '@nestjs/common';
import {
  BasePdfService,
  type BasePDFConfig,
} from '@/shared/modules/document-generation/pdf/base-pdf.service';
import {
  type PDFClinicInfo,
  type PDFPatientInfo,
  type PDFInvoiceItem,
  type PDFDoctorInfo,
  type PDFHospitalConfig,
  type InvoiceTaxSummary,
  type TaxRegistrationSnapshot,
  resolvePdfCodePair,
} from '@workspace/types';
import {
  renderStatusBadge,
  renderItemsTable,
  renderTaxMetadata,
  renderTotals,
  renderAuthorizedSignature,
  fetchSignatureImage,
} from '@/shared/modules/document-generation/pdf/invoice-pdf-layout.helpers';

/** Canonical input for clinic invoices with GST/tax layout (production billing path). */
export interface ClinicalInvoicePdfInput {
  invoiceId: string;
  title?: string;
  clinic: PDFClinicInfo;
  patient: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  taxSummary?: InvoiceTaxSummary;
  sellerTaxSnapshot?: TaxRegistrationSnapshot;
  buyerTaxSnapshot?: TaxRegistrationSnapshot;
  authorizedSignatureUrl?: string;
  authorizedSignatureLabel?: string;
  items: PDFInvoiceItem[];
  date?: Date;
  dueDate?: Date;
  status?: string;
  hospitalConfig?: PDFHospitalConfig;
}

@Injectable()
export class ClinicalInvoicePdfService extends BasePdfService {
  async generate(data: ClinicalInvoicePdfInput): Promise<Buffer> {
    const title = data.title ?? data.taxSummary?.documentTitle ?? 'Invoice';
    const config: BasePDFConfig = {
      title,
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
      currentY = renderStatusBadge(doc, data.status, context, currentY);
    }

    if (data.taxSummary) {
      currentY = renderTaxMetadata(
        doc,
        data,
        context,
        currentY,
        this.checkPageBreak.bind(this),
        this.drawDivider.bind(this),
      );
    }

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

    currentY = renderItemsTable(
      doc,
      resolvedItems,
      context,
      currentY,
      this.checkPageBreak.bind(this),
      this.drawDivider.bind(this),
    );
    currentY = renderTotals(
      doc,
      resolvedItems,
      context,
      currentY,
      this.checkPageBreak.bind(this),
      data.taxSummary,
    );
    await renderAuthorizedSignature(
      doc,
      data,
      context,
      currentY,
      this.checkPageBreak.bind(this),
      fetchSignatureImage,
    );

    this.renderFooter(doc, config.footerText, context);

    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    doc.end();

    return bufferPromise;
  }
}
