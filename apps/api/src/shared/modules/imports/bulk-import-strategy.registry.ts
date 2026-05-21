import { BadRequestException, Injectable } from '@nestjs/common';
import type { BulkImportEntityType } from '@workspace/types';
import type { IImportStrategy } from './strategies/import-strategy.interface';
import { PatientImportStrategy } from './strategies/patient-import.strategy';
import { DoctorImportStrategy } from './strategies/doctor-import.strategy';
import { PrescriptionImportStrategy } from './strategies/prescription-import.strategy';
import { LabTestImportStrategy } from './strategies/lab-test-import.strategy';
import { InventoryImportStrategy } from './strategies/inventory-import.strategy';

const BULK_IMPORT_ENTITY_TYPES = [
  'PATIENT',
  'PRESCRIPTION',
  'DOCTOR',
  'LAB_TEST',
  'INVENTORY',
] as const satisfies readonly BulkImportEntityType[];

const BULK_IMPORT_ENTITY_TYPE_SET = new Set<string>(BULK_IMPORT_ENTITY_TYPES);

@Injectable()
export class BulkImportStrategyRegistry {
  private readonly strategies: Map<BulkImportEntityType, IImportStrategy>;

  constructor(
    patientStrategy: PatientImportStrategy,
    doctorStrategy: DoctorImportStrategy,
    prescriptionStrategy: PrescriptionImportStrategy,
    labTestStrategy: LabTestImportStrategy,
    inventoryStrategy: InventoryImportStrategy,
  ) {
    this.strategies = new Map<BulkImportEntityType, IImportStrategy>([
      ['PATIENT', patientStrategy],
      ['DOCTOR', doctorStrategy],
      ['PRESCRIPTION', prescriptionStrategy],
      ['LAB_TEST', labTestStrategy],
      ['INVENTORY', inventoryStrategy],
    ]);
  }

  isValidEntityType(entityType: string): entityType is BulkImportEntityType {
    return BULK_IMPORT_ENTITY_TYPE_SET.has(entityType);
  }

  get(entityType: BulkImportEntityType): IImportStrategy {
    const strategy = this.strategies.get(entityType);
    if (!strategy) {
      throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
    return strategy;
  }

  getTemplate(entityType: BulkImportEntityType): Record<string, string> {
    return this.get(entityType).getTemplate();
  }
}
