import { Inject, Injectable } from '@nestjs/common';
import {
  DuplicateImportError,
  type MappedPatientData,
} from '../import-types';
import {
  DUPLICATE_DETECTOR_TOKEN,
  type IDuplicateDetector,
} from '../ports/duplicate-detector.port';
import { ImportPatientPersistenceService } from '../import-patient-persistence.service';
import { readImportRowString } from '../import-row-normalizer';
import {
  IImportStrategy,
  ImportStrategyAuditContext,
  ImportValidationResult,
} from './import-strategy.interface';

@Injectable()
export class PatientImportStrategy implements IImportStrategy {
  readonly entityType = 'PATIENT';

  constructor(
    @Inject(DUPLICATE_DETECTOR_TOKEN)
    private readonly duplicateDetector: IDuplicateDetector,
    private readonly patientPersistence: ImportPatientPersistenceService,
  ) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    const firstName = readImportRowString(row, 'firstName');
    const lastName = readImportRowString(row, 'lastName');
    const phoneNumber = readImportRowString(row, 'phoneNumber');
    if (!firstName || !lastName) {
      return { valid: false, error: 'Missing firstName or lastName' };
    }
    if (!phoneNumber) {
      return { valid: false, error: 'Missing phoneNumber' };
    }
    return { valid: true };
  }

  async import(
    row: Record<string, unknown>,
    clinicId: string,
    audit: ImportStrategyAuditContext,
  ): Promise<void> {
    if (!audit.dpdpNoticeVersion) {
      throw new Error('Missing DPDP attestation context for patient import');
    }

    const mapped = row as MappedPatientData;
    const duplicate = await this.duplicateDetector.checkForDuplicates(
      mapped,
      clinicId,
    );
    if (duplicate.isDuplicate) {
      throw new DuplicateImportError(duplicate.reason);
    }

    await this.patientPersistence.importSinglePatient(mapped, clinicId, {
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      createdBy: audit.createdBy,
      dpdpNoticeVersion: audit.dpdpNoticeVersion,
      source: audit.source,
    });
  }

  getTemplate(): Record<string, string> {
    return {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      dateOfBirth: '',
      bloodGroup: '',
      gender: '',
      address: '',
      invoiceTotal: '',
      invoiceLineItems: '',
    };
  }
}
