import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { NlmCodingService } from '@/domains/clinical/infrastructure/external/nlm-coding.service';

const COMMON_ICD_SEARCH_TERMS = [
  'diabetes',
  'hypertension',
  'fever',
  'cough',
  'headache',
  'asthma',
  'abdominal pain',
  'anemia',
  'infection',
  'pregnancy',
] as const;

const COMMON_CPT_SEARCH_TERMS = [
  'consultation',
  'ecg',
  'xray',
  'ultrasound',
  'blood test',
  'injection',
  'wound repair',
  'vaccination',
  'follow up',
  'physiotherapy',
] as const;

@Injectable()
export class MedicalCodeSyncService implements OnModuleInit {
  private readonly logger = new Logger(MedicalCodeSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nlmCodingService: NlmCodingService,
  ) {}

  async onModuleInit() {
    void this.syncCommonCodes().catch((error) => {
      this.logger.warn(
        `Initial medical code sync skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
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
    const codes = await Promise.all(
      COMMON_ICD_SEARCH_TERMS.map((term) =>
        this.nlmCodingService.searchIcdCodes(term),
      ),
    );

    const uniqueCodes = new Map(codes.flat().map((code) => [code.code, code]));

    for (const code of uniqueCodes.values()) {
      await this.prisma.icdCode.upsert({
        where: { code: code.code },
        create: {
          code: code.code,
          description: code.description,
          category: code.category,
          version: 'ICD-10',
          isCommon: true,
        },
        update: {
          description: code.description,
          category: code.category,
          isCommon: true,
        },
      });
    }

    return uniqueCodes.size;
  }

  async syncCommonCptCodes(): Promise<number> {
    const codes = await Promise.all(
      COMMON_CPT_SEARCH_TERMS.map((term) =>
        this.nlmCodingService.searchCptCodes(term),
      ),
    );

    const uniqueCodes = new Map(codes.flat().map((code) => [code.code, code]));

    for (const code of uniqueCodes.values()) {
      await this.prisma.cptCode.upsert({
        where: { code: code.code },
        create: {
          code: code.code,
          description: code.description,
          category: code.category,
          isCommon: true,
          price: 0,
        },
        update: {
          description: code.description,
          category: code.category,
          isCommon: true,
        },
      });
    }

    return uniqueCodes.size;
  }
}
