import { Module } from '@nestjs/common';

import { ImportsPatientsController } from './imports-patients.controller';
import { ImportsOcrController } from './imports-ocr.controller';
import { BulkImportController } from './bulk-import.controller';
import { ImportsService } from './imports.service';
import { ImportPreviewService } from './import-preview.service';
import { PatientTabularImportService } from './patient-tabular-import.service';
import { ImportOcrWorkflowService } from './import-ocr-workflow.service';
import { OcrImportCommitService } from './ocr-import-commit.service';
import { ImportFileParserService } from './import-file-parser.service';
import { ImportColumnMappingService } from './import-column-mapping.service';
import { ImportDuplicateDetectorService } from './import-duplicate-detector.service';
import { DUPLICATE_DETECTOR_TOKEN } from './ports/duplicate-detector.port';
import { ImportPatientPersistenceService } from './import-patient-persistence.service';
import { BulkImportService } from './bulk-import.service';
import { BulkImportJobQueryService } from './bulk-import-job-query.service';
import { BulkImportJobProcessorService } from './bulk-import-job-processor.service';
import { BulkImportOrchestratorService } from './bulk-import-orchestrator.service';
import { BulkImportStrategyRegistry } from './bulk-import-strategy.registry';
import {
  PatientImportStrategy,
  DoctorImportStrategy,
  PrescriptionImportStrategy,
  LabTestImportStrategy,
  InventoryImportStrategy,
} from './strategies';
import { OCRFacadeService } from './ocr-facade.service';
import { ImagePreprocessorService } from './image-preprocessor.service';
import { TextExtractorService } from './text-extractor.service';
import { DocumentClassifierService } from './document-classifier.service';
import { TextParserService } from './text-parser.service';
import { ConfidenceScorerService } from './confidence-scorer.service';
import { ImportSessionService } from './import-session.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AIModule } from '@/shared/modules/ai/ai.module';
import { ComplianceModule } from '@/shared/modules/compliance/compliance.module';
import { IMPORT_STRATEGY_PERSISTENCE_PORT } from './ports/import-strategy.persistence.port';

@Module({
  imports: [PrismaModule, AIModule, ComplianceModule],
  controllers: [
    ImportsPatientsController,
    ImportsOcrController,
    BulkImportController,
  ],
  providers: [
    {
      provide: IMPORT_STRATEGY_PERSISTENCE_PORT,
      useExisting: PrismaService,
    },
    ImportsService,
    ImportPreviewService,
    PatientTabularImportService,
    ImportOcrWorkflowService,
    OcrImportCommitService,
    ImportFileParserService,
    ImportColumnMappingService,
    ImportDuplicateDetectorService,
    {
      provide: DUPLICATE_DETECTOR_TOKEN,
      useExisting: ImportDuplicateDetectorService,
    },
    ImportPatientPersistenceService,
    PatientImportStrategy,
    DoctorImportStrategy,
    PrescriptionImportStrategy,
    LabTestImportStrategy,
    InventoryImportStrategy,
    BulkImportStrategyRegistry,
    BulkImportJobQueryService,
    BulkImportJobProcessorService,
    BulkImportOrchestratorService,
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
