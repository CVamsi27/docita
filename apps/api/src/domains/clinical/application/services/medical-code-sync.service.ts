import { Injectable, Logger, Inject } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CODE_CATALOG_PROVIDER,
  CodeCatalogProvider,
} from '@/domains/clinical/core/providers/code-catalog.provider';

type SyncedCodeRecord = {
  code: string;
  description: string;
  category: string;
  isCommon: boolean;
};

@Injectable()
export class MedicalCodeSyncService {
  private readonly logger = new Logger(MedicalCodeSyncService.name);
  private static readonly UPDATE_BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CODE_CATALOG_PROVIDER)
    private readonly codeCatalogProvider: CodeCatalogProvider,
  ) {}

  @Cron('0 4 * * *')
  async refreshCommonCodes() {
    await this.syncCommonCodes();
  }

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
          this.prisma.icdCode.findMany({
            where: { code: { in: codesToFind } },
            select: {
              code: true,
              description: true,
              category: true,
              isCommon: true,
            },
          }),
        createMany: (data) =>
          this.prisma.icdCode.createMany({
            data: data.map((code) => ({
              code: code.code,
              description: code.description,
              category: code.category,
              version: 'ICD-10',
              isCommon: true,
            })),
            skipDuplicates: true,
          }),
        updateOne: (code) =>
          this.prisma.icdCode.update({
            where: { code: code.code },
            data: {
              description: code.description,
              category: code.category,
              isCommon: true,
            },
          }),
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
          this.prisma.cptCode.findMany({
            where: { code: { in: codesToFind } },
            select: {
              code: true,
              description: true,
              category: true,
              isCommon: true,
            },
          }),
        createMany: (data) =>
          this.prisma.cptCode.createMany({
            data: data.map((code) => ({
              code: code.code,
              description: code.description,
              category: code.category,
              isCommon: true,
              price: 0,
            })),
            skipDuplicates: true,
          }),
        updateOne: (code) =>
          this.prisma.cptCode.update({
            where: { code: code.code },
            data: {
              description: code.description,
              category: code.category,
              isCommon: true,
            },
          }),
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
    updateOne,
  }: {
    records: TCode[];
    findExisting: (codes: string[]) => Promise<SyncedCodeRecord[]>;
    createMany: (records: TCode[]) => Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateOne: (record: TCode) => Prisma.PrismaPromise<SyncedCodeRecord>;
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
      await this.prisma.$transaction(batch.map((record) => updateOne(record)));
    }
  }
}
