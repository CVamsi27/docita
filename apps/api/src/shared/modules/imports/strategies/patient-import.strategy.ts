import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsentStatus, ConsentType } from '@workspace/db';
import {
  IImportStrategy,
  ImportStrategyAuditContext,
  ImportValidationResult,
} from './import-strategy.interface';

function mapImportRowToPatientData(
  row: Record<string, unknown>,
): MappedPatientData {
  const mapped: MappedPatientData = {};
  for (const [key, value] of Object.entries(row)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      value instanceof Date ||
      value === undefined
    ) {
      Reflect.set(mapped, key, value);
    }
  }
  return mapped;
}

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
    const firstName = this.readString(row, 'firstName');
    const lastName = this.readString(row, 'lastName');
    const phoneNumber = this.readString(row, 'phoneNumber');
    if (!firstName || !lastName || !phoneNumber) {
      throw new Error(
        'Missing required patient fields: firstName, lastName, or phoneNumber',
      );
    }
    if (!audit.dpdpNoticeVersion) {
      throw new Error(
        'DPDP consent attestation is required for patient imports',
      );
    }

    const mapped = mapImportRowToPatientData(row);
    const duplicate = await this.duplicateDetector.checkForDuplicates(
      mapped,
      clinicId,
    );
    if (duplicate.isDuplicate) {
      throw new DuplicateImportError(duplicate.reason);
    }

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          firstName,
          lastName,
          phoneNumber,
          email: email || undefined,
          dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : new Date(),
          bloodGroup: this.readString(row, 'bloodGroup') || undefined,
          address: this.readString(row, 'address') || undefined,
          gender,
          clinicId,
        },
      });
      await tx.consent.create({
        data: {
          patientId: created.id,
          clinicId,
          consentType: ConsentType.DPDP_NOTICE,
          status: ConsentStatus.ACTIVE,
          givenBy: `${firstName} ${lastName}`.trim(),
          givenByRelation: 'SELF',
          givenAt: new Date(),
          validFrom: new Date(),
          templateVersion: audit.dpdpNoticeVersion,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          createdBy: audit.createdBy,
          notes:
            audit.source ?? 'Operator attestation via patient import strategy',
        },
      });
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
