import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFDocumentType,
  PDFInvoiceItem,
  PDFMedicationInfo,
  PDFPatientInfo,
  TableColumn,
} from '@workspace/types';
import type { PDFContext } from './pdf.types';
import {
  renderDoctorInfoColumn,
  renderPatientInfoColumn,
} from './pdf-party-layout';
import { PdfHeaderService } from './pdf-header.service';
import { PdfTablesService } from './pdf-tables.service';
import { PdfFooterService } from './pdf-footer.service';

type Doc = typeof PDFDocument.prototype;

type ClinicHeaderArgs = [Doc, PDFClinicInfo, PDFContext, PDFDocumentType?];
type DocumentTitleArgs = [Doc, string, string?, Date?, PDFContext?, boolean?];
type MedicationsTableArgs = [Doc, PDFMedicationInfo[], PDFContext];
type AbbreviationLegendArgs = [Doc, PDFMedicationInfo[], PDFContext];
type InvoiceItemsTableArgs = [Doc, PDFInvoiceItem[], PDFContext];
type InvoiceTotalsArgs = [
  Doc,
  { subtotal: number; discount?: number; tax?: number; total: number },
  PDFContext,
];
type SectionArgs = [Doc, string, string, PDFContext];
type WarningBoxArgs = [Doc, string, PDFContext];
type DoctorSignatureArgs = [Doc, PDFDoctorInfo, PDFContext];
type FooterArgs = [Doc, string];
type TableArgs = [
  Doc,
  TableColumn[],
  Record<string, unknown>[],
  number,
  {
    headerBg?: string;
    rowHeight?: number;
    fontSize?: number;
    margin?: number;
  }?,
];

/** Facade that delegates to focused header/tables/footer services. */
@Injectable()
export class PdfLayoutService {
  constructor(
    private readonly header: PdfHeaderService,
    private readonly tables: PdfTablesService,
    private readonly footer: PdfFooterService,
  ) {}

  renderClinicHeader(...args: ClinicHeaderArgs): number {
    return this.header.renderClinicHeader(...args);
  }

  renderDocumentTitle(...args: DocumentTitleArgs): number {
    return this.header.renderDocumentTitle(...args);
  }

  renderPatientDoctorInfo(
    doc: Doc,
    patient?: PDFPatientInfo,
    doctor?: PDFDoctorInfo,
    context?: PDFContext,
  ): number {
    const y = context?.currentY ?? 200;
    const margin = context?.margin ?? 50;
    const pageWidth = context?.pageWidth ?? 595;
    const colWidth = (pageWidth - margin * 2) / 2 - 10;

    let maxY = y;

    if (patient) {
      maxY = Math.max(
        maxY,
        renderPatientInfoColumn({ doc, patient, x: margin, y }),
      );
    }

    if (doctor) {
      const rightX = margin + colWidth + 20;
      maxY = Math.max(
        maxY,
        renderDoctorInfoColumn({ doc, doctor, x: rightX, y }),
      );
    }

    maxY += 8;
    doc
      .strokeColor('#e2e8f0')
      .moveTo(margin, maxY)
      .lineTo(pageWidth - margin, maxY)
      .stroke()
      .strokeColor('#000000');

    return maxY + 10;
  }

  renderMedicationsTable(...args: MedicationsTableArgs): number {
    return this.tables.renderMedicationsTable(...args);
  }

  renderAbbreviationLegend(...args: AbbreviationLegendArgs): number {
    return this.tables.renderAbbreviationLegend(...args);
  }

  renderInvoiceItemsTable(...args: InvoiceItemsTableArgs): number {
    return this.tables.renderInvoiceItemsTable(...args);
  }

  renderInvoiceTotals(...args: InvoiceTotalsArgs): number {
    return this.footer.renderInvoiceTotals(...args);
  }

  renderSection(...args: SectionArgs): number {
    return this.header.renderSection(...args);
  }

  renderWarningBox(...args: WarningBoxArgs): void {
    this.header.renderWarningBox(...args);
  }

  renderDoctorSignature(...args: DoctorSignatureArgs): number {
    return this.footer.renderDoctorSignature(...args);
  }

  renderFooter(...args: FooterArgs): void {
    this.footer.renderFooter(...args);
  }

  renderTable(...args: TableArgs): number {
    return this.tables.renderTable(...args);
  }
}
