import { Inject, Injectable, Logger } from '@nestjs/common';
import { CodeCatalogSystem } from '@workspace/db';
import {
  CODE_CATALOG_PROVIDER,
  CodeCatalogProvider,
} from '@/domains/clinical/core/providers/code-catalog.provider';
import { IMedicalCodingRepository } from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  MedicalCodeSyncRunnerService,
  type CodeSyncResult,
} from './medical-code-sync-runner.service';

/**
 * Per-system wiring for the code catalog sync: which provider stream and which
 * code-table writers belong to ICD and CPT. The run ledger, batch diffing and
 * completeness accounting live in {@link MedicalCodeSyncRunnerService}.
 */
@Injectable()
export class MedicalCodeSyncService {
  private readonly logger = new Logger(MedicalCodeSyncService.name);

  constructor(
    @Inject('IMedicalCodingRepository')
    private readonly medicalCodingRepository: IMedicalCodingRepository,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
    private readonly runner: MedicalCodeSyncRunnerService,
  ) {}

  async syncCommonCodes(): Promise<{ icd: number; cpt: number }> {
    const [icd, cpt] = await Promise.all([
      this.syncCommonIcdCodes(),
      this.syncCommonCptCodes(),
    ]);

    this.logger.log(`Synced ${icd.codes} ICD codes and ${cpt.codes} CPT codes`);
    return { icd: icd.codes, cpt: cpt.codes };
  }

  syncCommonIcdCodes(): Promise<CodeSyncResult> {
    return this.runner.sync({
      system: CodeCatalogSystem.ICD,
      stream: (onBatch) => this.codeCatalogProvider.streamIcdCodes(onBatch),
      findExisting: (codesToFind) =>
        this.medicalCodingRepository.findExistingIcdCodes(codesToFind),
      createMany: (data, provenance) =>
        this.medicalCodingRepository.createCommonIcdCodes(data, provenance),
      updateMany: (data, provenance) =>
        this.medicalCodingRepository.updateCommonIcdCodes(data, provenance),
    });
  }

  syncCommonCptCodes(): Promise<CodeSyncResult> {
    return this.runner.sync({
      system: CodeCatalogSystem.CPT,
      stream: (onBatch) => this.codeCatalogProvider.streamCptCodes(onBatch),
      findExisting: (codesToFind) =>
        this.medicalCodingRepository.findExistingCptCodes(codesToFind),
      createMany: (data, provenance) =>
        this.medicalCodingRepository.createCommonCptCodes(data, provenance),
      updateMany: (data, provenance) =>
        this.medicalCodingRepository.updateCommonCptCodes(data, provenance),
    });
  }
}
