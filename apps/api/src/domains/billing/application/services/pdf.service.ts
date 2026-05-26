import { Injectable } from '@nestjs/common';
import {
  ClinicalInvoicePdfService,
  type ClinicalInvoicePdfInput,
} from '@/shared/modules/document-generation/pdf/clinical-invoice-pdf.service';

export type InvoiceData = ClinicalInvoicePdfInput;

/** Billing alias for the shared clinical invoice PDF generator (GST/tax layout). */
@Injectable()
export class PDFService extends ClinicalInvoicePdfService {}
