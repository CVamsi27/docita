// jscpd:ignore-start
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
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
export class InventoryImportStrategy implements IImportStrategy {
  readonly entityType = 'INVENTORY';

  constructor(private readonly prisma: PrismaService) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!readImportRowString(row, 'itemName')) {
      return { valid: false, error: 'Missing itemName' };
    }
    return { valid: true };
  }

  async import(
    row: Record<string, unknown>,
    clinicId: string,
    _audit: ImportStrategyAuditContext,
  ): Promise<void> {
    void _audit;
    const name = readImportRowRequiredString(row, 'itemName');
    // jscpd:ignore-end
    const category = readImportRowOptionalString(row, 'category') ?? 'General';
    const qtyRaw = row.quantity;
    const quantity =
      typeof qtyRaw === 'number'
        ? qtyRaw
        : parseInt(String(qtyRaw ?? '0').trim(), 10) || 0;
    const reorderRaw = row.reorderLevel;
    const minQuantity =
      typeof reorderRaw === 'number'
        ? reorderRaw
        : parseInt(String(reorderRaw ?? '10').trim(), 10) || 10;
    const costRaw = row.cost;
    const purchasePrice =
      typeof costRaw === 'number'
        ? costRaw
        : parseFloat(String(costRaw ?? '').trim());

    await this.prisma.inventoryItem.create({
      data: {
        clinicId,
        name,
        category,
        quantity,
        minQuantity,
        purchasePrice: Number.isFinite(purchasePrice)
          ? purchasePrice
          : undefined,
      },
    });
  }

  getTemplate(): Record<string, string> {
    return {
      itemName: '',
      quantity: '',
      cost: '',
      reorderLevel: '',
      category: '',
    };
  }
}
