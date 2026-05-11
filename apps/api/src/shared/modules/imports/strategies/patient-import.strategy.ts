import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsentStatus, ConsentType } from '@workspace/db';
import {
  IImportStrategy,
  ImportStrategyAuditContext,
  ImportValidationResult,
} from './import-strategy.interface';

@Injectable()
export class PatientImportStrategy implements IImportStrategy {
  readonly entityType = 'PATIENT';

  constructor(private prisma: PrismaService) {}

  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = source[key];
    return typeof value === 'string' ? value : undefined;
  }

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!row.firstName || !row.lastName) {
      return { valid: false, error: 'Missing firstName or lastName' };
    }
    if (!row.phoneNumber) {
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

    const email = this.readString(row, 'email');
    const dateOfBirthRaw = this.readString(row, 'dateOfBirth');
    const genderRaw = this.readString(row, 'gender');
    const gender =
      genderRaw === 'MALE' || genderRaw === 'FEMALE' || genderRaw === 'OTHER'
        ? genderRaw
        : 'OTHER';

    if (email) {
      const existing = await this.prisma.patient.findFirst({
        where: { email },
      });
      if (existing) {
        throw new Error('Patient email already exists');
      }
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
    };
  }
}
