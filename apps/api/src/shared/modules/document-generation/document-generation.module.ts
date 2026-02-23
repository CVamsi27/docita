/**
 * Document Generation Module
 * Provides services for generating invoices, prescriptions, reports, etc. as PDFs
 */

import { Module } from '@nestjs/common';
import { DocumentGenerationService } from './document-generation.service';
import { PdfRendererService } from './renderers';

@Module({
  providers: [DocumentGenerationService, PdfRendererService],
  exports: [DocumentGenerationService],
})
export class DocumentGenerationModule {}
