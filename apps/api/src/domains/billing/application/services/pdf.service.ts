import { Injectable } from '@nestjs/common';
import {
  BasePdfService,
  BasePDFConfig,
} from '@/shared/modules/document-generation/pdf/base-pdf.service';
import {
  PDFClinicInfo,
  PDFPatientInfo,
  PDFInvoiceItem,
  PDFDoctorInfo,
  PDFHospitalConfig,
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
} from './pdf-helpers';

export interface InvoiceData {
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
export class PDFService extends BasePdfService {
  async generate(data: InvoiceData): Promise<Buffer> {
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

    // Resolve paired hospital overrides first, then fall back to the
    // per-code legacy override maps and finally the source item codes.
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
