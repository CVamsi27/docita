import type PDFDocument from 'pdfkit';
import type {
  PDFClinicInfo,
  PDFDoctorInfo,
  PDFDocumentType,
  PDFPatientInfo,
} from '@workspace/types';
import type { PDFContext } from './pdf.types';
import type { PdfLayoutService } from './pdf-layout.service';

/**
 * Section-based PDF document config. Lives in a separate file from `pdf.types.ts`
 * because the section callback signature must reference `PdfLayoutService`, which
 * itself depends on the data shapes in `pdf.types.ts`. Splitting `PDFConfig` out
 * keeps `pdf.types.ts` data-only and `pdf-layout.service.ts` types-consuming, so
 * the file-level import graph stays acyclic.
 */
export interface PDFConfig {
  type: PDFDocumentType;
  title: string;
  documentId?: string;
  clinic: PDFClinicInfo;
  patient?: PDFPatientInfo;
  doctor?: PDFDoctorInfo;
  date?: Date;
  margin?: number;
  sections: Array<
    (
      doc: typeof PDFDocument.prototype,
      context: PDFContext,
      layout: PdfLayoutService,
    ) => void
  >;
  footerText?: string;
  showRxSymbol?: boolean;
  validityDays?: number;
}
