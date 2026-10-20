import { Inject, Injectable, Logger } from '@nestjs/common';
import { CodeCatalogSyncStatus, CodeCatalogSystem } from '@workspace/db';
import {
  CODE_CATALOG_PROVIDER,
  CodeCatalogProvider,
  type CodeStreamOutcome,
} from '@/domains/clinical/core/providers/code-catalog.provider';
import {
  CodeSyncProvenance,
  IMedicalCodingRepository,
  MedicalCodeSyncRecord,
  SyncedMedicalCodeRecord,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  chunkRecords,
  dedupeCodesByCode,
  selectCodeChanges,
} from './medical-code-sync-batch.helpers';

/** Result of one coding-system sync, including whether the catalog is complete. */
export interface CodeSyncResult {
  codes: number;
  status: CodeCatalogSyncStatus;
  unitsSkipped: number;
  runId: string;
}

/** Storage callbacks one coding system supplies for its own code table. */
interface CodeSyncWriters<TCode extends MedicalCodeSyncRecord> {
  findExisting: (codes: string[]) => Promise<SyncedMedicalCodeRecord[]>;
  createMany: (
    records: TCode[],
    provenance: CodeSyncProvenance,
  ) => Promise<void>;
  updateMany: (
    records: MedicalCodeSyncRecord[],
    provenance: CodeSyncProvenance,
  ) => Promise<void>;
}

interface CodeSyncRequest<
  TCode extends MedicalCodeSyncRecord,
> extends CodeSyncWriters<TCode> {
  system: CodeCatalogSystem;
  stream: (
    onBatch: (batch: TCode[]) => Promise<void>,
  ) => Promise<CodeStreamOutcome>;
}

/**
 * Code catalog sync with a durable record of what actually happened.
 *
 * The sync previously streamed provider pages straight into the code tables and
 * returned a code count. A stream that failed halfway through a prefix returned
 * normally with a smaller count, so "synced 12,000 codes" and "synced 4,000
 * before the upstream died" were the same event. `IcdCode` also hardcoded its
 * version and `CptCode` had no version column at all, so nothing downstream
 * could tell which catalog revision a code row came from.
 *
 * Each system now runs inside a `CodeCatalogSyncRun` that is only COMPLETED when
 * every unit was streamed, and every code row records the source, source
 * version and the sync instant that wrote it.
 */
@Injectable()
export class MedicalCodeSyncRunnerService {
  private readonly logger = new Logger(MedicalCodeSyncRunnerService.name);
  private static readonly UPDATE_BATCH_SIZE = 100;

  constructor(
    @Inject('IMedicalCodingRepository')
    private readonly medicalCodingRepository: IMedicalCodingRepository,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Runs one coding system end to end inside a recorded run.
   *
   * The run row is written before the first page and settled afterwards, so a
   * process that dies mid-stream leaves a RUNNING row that ages rather than a
   * silent half-updated catalog.
   */
  async sync<TCode extends MedicalCodeSyncRecord>({
    system,
    stream,
    ...writers
  }: CodeSyncRequest<TCode>): Promise<CodeSyncResult> {
    const startedAt = this.clock.now();
    // Resolved before the first page so every code row records its real
    // upstream at write time, not a placeholder patched in afterwards.
    const source = this.codeCatalogProvider.getCatalogSource(system);
    const provenance = this.provenance(source, startedAt);
    const runId = await this.medicalCodingRepository.startCodeSyncRun({
      system,
      source,
      startedAt,
    });

    const seen = new Set<string>();
    let batchesApplied = 0;

    try {
      const outcome = await stream(async (batch) => {
        batchesApplied += 1;
        await this.applyBatch(batch, provenance, writers);
        batch.forEach((code) => seen.add(code.code));
      });

      const status = outcome.completed
        ? CodeCatalogSyncStatus.COMPLETED
        : CodeCatalogSyncStatus.TRUNCATED;

      await this.medicalCodingRepository.finishCodeSyncRun(runId, {
        status,
        finishedAt: this.clock.now(),
        codesSeen: seen.size,
        batchesApplied,
        unitsSkipped: outcome.unitsSkipped,
        lastUnit: outcome.lastUnit,
        error: outcome.failure ?? null,
      });

      if (status === CodeCatalogSyncStatus.TRUNCATED) {
        this.logger.error(
          `${system} catalog sync incomplete: ${outcome.unitsSkipped} unit(s) skipped after "${outcome.lastUnit ?? 'start'}". ${
            outcome.failure ?? 'No reason reported.'
          }`,
        );
      }
      if (outcome.source !== source) {
        // The stream fell back to another upstream mid-run. Both facts are kept:
        // the run row names the source the sync started from.
        this.logger.warn(
          `${system} catalog sync started from ${source} but the stream reported source ${outcome.source}`,
        );
      }

      return {
        codes: seen.size,
        status,
        unitsSkipped: outcome.unitsSkipped,
        runId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A throw means nothing is known about how far the stream got, so the run
      // is FAILED rather than given a completeness claim it has not earned.
      await this.medicalCodingRepository.finishCodeSyncRun(runId, {
        status: CodeCatalogSyncStatus.FAILED,
        finishedAt: this.clock.now(),
        codesSeen: seen.size,
        batchesApplied,
        unitsSkipped: 0,
        lastUnit: null,
        error: message,
      });
      this.logger.error(`${system} catalog sync failed`, error);
      throw error;
    }
  }

  private provenance(source: string, syncedAt: Date): CodeSyncProvenance {
    return { source, sourceVersion: null, syncedAt };
  }

  private async applyBatch<TCode extends MedicalCodeSyncRecord>(
    records: TCode[],
    provenance: CodeSyncProvenance,
    writers: CodeSyncWriters<TCode>,
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const uniqueRecords = dedupeCodesByCode(records);
    const existingRecords = await writers.findExisting(
      uniqueRecords.map((record) => record.code),
    );
    const { toCreate, toUpdate } = selectCodeChanges(
      uniqueRecords,
      existingRecords,
    );

    if (toCreate.length > 0) {
      await writers.createMany(toCreate, provenance);
    }

    for (const batch of chunkRecords(
      toUpdate,
      MedicalCodeSyncRunnerService.UPDATE_BATCH_SIZE,
    )) {
      await writers.updateMany(batch, provenance);
    }
  }
}
