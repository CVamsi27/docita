import { Module } from '@nestjs/common';

import { ImportsController } from './imports.controller';
import { BulkImportController } from './bulk-import.controller';
import { ImportsService } from './imports.service';
import { BulkImportService } from './bulk-import.service';
import { OCRService as _OCRService } from './ocr.service';
import { OCRFacadeService } from './ocr-facade.service';
import { ImagePreprocessorService } from './image-preprocessor.service';
import { TextExtractorService } from './text-extractor.service';
import { DocumentClassifierService } from './document-classifier.service';
import { TextParserService } from './text-parser.service';
import { ConfidenceScorerService } from './confidence-scorer.service';
import { ImportSessionService } from './import-session.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AIModule } from '@/shared/modules/ai/ai.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';

@Module({
  imports: [PrismaModule, AIModule, ComplianceModule],
  controllers: [ImportsController, BulkImportController],
  providers: [
    ImportsService,
    BulkImportService,

    ImagePreprocessorService,
    TextExtractorService,
    DocumentClassifierService,
    TextParserService,
    ConfidenceScorerService,

    OCRFacadeService,
    { provide: 'OCRService', useExisting: OCRFacadeService },
    ImportSessionService,
  ],
  exports: [BulkImportService, ImportSessionService],
})
export class ImportsModule {}
