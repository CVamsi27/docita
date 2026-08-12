// jscpd:ignore-start
import { Inject, Injectable } from '@nestjs/common';
import {
  IMPORT_STRATEGY_PERSISTENCE_PORT,
  type ImportStrategyPersistencePort,
} from '../ports/import-strategy.persistence.port';
import {
  readImportRowOptionalString,
  readImportRowRequiredString,
  readImportRowString,
} from '../import-row-normalizer';
import {
  IImportStrategy,
  ImportStrategyAuditContext,
  ImportValidationResult,
} from './import-strategy.interface';

@Injectable()
export class LabTestImportStrategy implements IImportStrategy {
  readonly entityType = 'LAB_TEST';

  constructor(
    @Inject(IMPORT_STRATEGY_PERSISTENCE_PORT)
    private readonly prisma: ImportStrategyPersistencePort,
  ) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!readImportRowString(row, 'testName')) {
      return { valid: false, error: 'Missing testName' };
    }
    return { valid: true };
  }

  async import(
    row: Record<string, unknown>,
    clinicId: string,
    _audit: ImportStrategyAuditContext,
  ): Promise<void> {
    void _audit;
    const name = readImportRowRequiredString(row, 'testName');
    // jscpd:ignore-end
    const code =
      readImportRowOptionalString(row, 'testCode')?.trim() ||
      name.replace(/\s+/g, '-').toUpperCase();
    const category = readImportRowOptionalString(row, 'category') ?? 'General';
    const costRaw = row.cost;
    const price =
      typeof costRaw === 'number'
        ? costRaw
        : parseFloat(String(costRaw ?? '').trim());

    await this.prisma.labTest.create({
      data: {
        clinicId,
        name,
        code,
        category,
        description: readImportRowOptionalString(row, 'description'),
        price: Number.isFinite(price) ? price : undefined,
      },
    });
  }

  getTemplate(): Record<string, string> {
    return {
      testName: '',
      testCode: '',
      category: '',
      description: '',
      cost: '',
      turnaroundTime: '',
    };
  }
}
