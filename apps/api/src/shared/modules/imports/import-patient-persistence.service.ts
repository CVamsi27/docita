import { getPatientFullName } from '@workspace/utils';
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ConsentStatus,
  ConsentType,
  Gender,
  InvoiceStatus,
} from '@workspace/db';
import type { ImportAuditContext, MappedPatientData } from './import-types';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  cleanImportEmail,
  cleanImportName,
  normalizeImportPhoneNumber,
  parseImportDate,
} from './import-row-normalizer';

@Injectable()
export class ImportPatientPersistenceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async importSinglePatient(
    row: MappedPatientData,
    clinicId: string | undefined,
    audit: ImportAuditContext,
  ): Promise<void> {
    const firstName = cleanImportName(
      row['firstName'] || row['First Name'] || row['name'],
    );
    const lastName = cleanImportName(row['lastName'] || row['Last Name'] || '');
    const phone = normalizeImportPhoneNumber(
      row['phoneNumber'] || row['Phone Number'] || row['phone'],
    );
    const genderStr = (row['gender'] || row['Gender'] || '')
      .toString()
      .toUpperCase();

    if (!firstName) {
      throw new BadRequestException('Missing required field: First Name');
    }
    if (!phone) {
      throw new BadRequestException('Missing required field: Phone Number');
    }

    let gender: Gender = Gender.OTHER;
    if (genderStr === 'MALE' || genderStr === 'M') gender = Gender.MALE;
    else if (genderStr === 'FEMALE' || genderStr === 'F')
      gender = Gender.FEMALE;

    const dobStr = row['dateOfBirth'] || row['Date of Birth'] || row['dob'];
    const dob = dobStr ? parseImportDate(dobStr) : this.clock.now();

    const email = cleanImportEmail(
      row['email'] || row['Email'] || row['email address'],
    );

    if (!clinicId) {
      throw new BadRequestException('Clinic ID is required for patient import');
    }
    if (!audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'DPDP consent attestation is required for patient imports',
      );
    }

    const patient = await this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          firstName,
          lastName,
          phoneNumber: phone,
          gender,
          dateOfBirth: dob || this.clock.now(),
          email,
          address: (row['address'] || row['Address'] || '').toString().trim(),
          bloodGroup: (row['bloodGroup'] || row['Blood Group'] || '')
            .toString()
            .trim()
            .toUpperCase(),
          allergies: (row['allergies'] || row['Allergies'] || '')
            .toString()
            .trim(),
          medicalHistory: (() => {
            const raw = row['medicalHistory'] ?? row['Medical History'];
            return raw != null && String(raw).trim() !== ''
              ? [String(raw)]
              : [];
          })(),
          clinicId,
        },
      });
      await tx.consent.create({
        data: {
          patientId: created.id,
          clinicId,
          consentType: ConsentType.DPDP_NOTICE,
          status: ConsentStatus.ACTIVE,
          givenBy: getPatientFullName({ firstName, lastName }),
          givenByRelation: 'SELF',
          givenAt: this.clock.now(),
          validFrom: this.clock.now(),
          templateVersion: audit.dpdpNoticeVersion,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          createdBy: audit.createdBy,
          notes:
            audit.source ?? 'Operator attestation via Excel /imports/patients',
        },
      });
      return created;
    });

    const invoiceTotalRaw =
      row['invoiceTotal'] ??
      row['Invoice Total'] ??
      row['invoiceGrandTotal'] ??
      row['Invoice Grand Total'];
    if (invoiceTotalRaw !== undefined && invoiceTotalRaw !== null) {
      const total = parseFloat(String(invoiceTotalRaw).trim());
      if (!Number.isNaN(total) && total > 0) {
        let items: unknown = [
          {
            description: 'Imported charges',
            quantity: 1,
            unitPrice: total,
            total,
          },
        ];
        const rawItems =
          row['invoiceLineItems'] ??
          row['Invoice Line Items'] ??
          row['invoiceItems'];
        if (rawItems) {
          try {
            const parsed: unknown = JSON.parse(String(rawItems));
            if (Array.isArray(parsed) && parsed.length > 0) {
              items = parsed;
            }
          } catch {
            /* keep default */
          }
        }
        await this.prisma.invoice.create({
          data: {
            patientId: patient.id,
            clinicId,
            total,
            subtotal: total,
            grandTotal: total,
            taxTotal: 0,
            discountTotal: 0,
            status: InvoiceStatus.PENDING,
            items: toPrismaInputJsonValue(items),
          },
        });
      }
    }
  }
}
