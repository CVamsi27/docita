import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  CODE_CATALOG_PROVIDER,
  CodeCatalogProvider,
} from '@/domains/clinical/core/providers/code-catalog.provider';
import {
  IMedicalCodingRepository,
  MedicalCodeSyncRecord,
  SyncedMedicalCodeRecord,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';

@Injectable()
export class MedicalCodeSyncService {
  private readonly logger = new Logger(MedicalCodeSyncService.name);
  private static readonly UPDATE_BATCH_SIZE = 100;

  constructor(
    @Inject('IMedicalCodingRepository')
    private readonly medicalCodingRepository: IMedicalCodingRepository,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
  ) {}

  async syncCommonCodes(): Promise<{ icd: number; cpt: number }> {
    const [icd, cpt] = await Promise.all([
      this.syncCommonIcdCodes(),
      this.syncCommonCptCodes(),
    ]);

    this.logger.log(`Synced ${icd} ICD codes and ${cpt} CPT codes`);
    return { icd, cpt };
  }

  async syncCommonIcdCodes(): Promise<number> {
    const seen = new Set<string>();
    await this.codeCatalogProvider.streamIcdCodes(async (batch) => {
      await this.syncCodeBatch({
        records: batch,
        findExisting: (codesToFind) =>
          this.medicalCodingRepository.findExistingIcdCodes(codesToFind),
        createMany: (data) =>
          this.medicalCodingRepository.createCommonIcdCodes(data),
        updateMany: (data) =>
          this.medicalCodingRepository.updateCommonIcdCodes(data),
      });
      batch.forEach((c) => seen.add(c.code));
    });
    return seen.size;
  }

  async syncCommonCptCodes(): Promise<number> {
    const seen = new Set<string>();
    await this.codeCatalogProvider.streamCptCodes(async (batch) => {
      await this.syncCodeBatch({
        records: batch,
        findExisting: (codesToFind) =>
          this.medicalCodingRepository.findExistingCptCodes(codesToFind),
        createMany: (data) =>
          this.medicalCodingRepository.createCommonCptCodes(data),
        updateMany: (data) =>
          this.medicalCodingRepository.updateCommonCptCodes(data),
      });
      batch.forEach((c) => seen.add(c.code));
    });
    return seen.size;
  }

  private async syncCodeBatch<
    TCode extends { code: string; description: string; category: string },
  >({
    records,
    findExisting,
    createMany,
    updateMany,
  }: {
    records: TCode[];
    findExisting: (codes: string[]) => Promise<SyncedMedicalCodeRecord[]>;
    createMany: (records: TCode[]) => Promise<void>;
    updateMany: (records: MedicalCodeSyncRecord[]) => Promise<void>;
  }): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const uniqueRecords = [
      ...new Map(records.map((r) => [r.code, r])).values(),
    ];

    const existingRecords = await findExisting(
      uniqueRecords.map((record) => record.code),
    );
    const existingByCode = new Map(
      existingRecords.map((record) => [record.code, record]),
    );

    const recordsToCreate: TCode[] = [];
    const recordsToUpdate: TCode[] = [];

    for (const record of uniqueRecords) {
      const existing = existingByCode.get(record.code);
      if (!existing) {
        recordsToCreate.push(record);
        continue;
      }

      if (
        existing.description !== record.description ||
        existing.category !== record.category ||
        !existing.isCommon
      ) {
        recordsToUpdate.push(record);
      }
    }

    if (recordsToCreate.length > 0) {
      await createMany(recordsToCreate);
    }

    if (recordsToUpdate.length === 0) {
      return;
    }

    for (
      let index = 0;
      index < recordsToUpdate.length;
      index += MedicalCodeSyncService.UPDATE_BATCH_SIZE
    ) {
      const batch = recordsToUpdate.slice(
        index,
        index + MedicalCodeSyncService.UPDATE_BATCH_SIZE,
      );
      await updateMany(batch);
    }
  }
}
