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
import { jsonValueSchema, type JsonValueSchemaType } from '@workspace/types';
import type { ImportAuditContext, MappedPatientData } from './import-types';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { toInvoiceCentCreateFields } from '@/domains/billing/core/utils/invoice-normalization';
import {
  cleanImportEmail,
  cleanImportName,
  normalizeImportPhoneNumber,
  parseImportDate,
} from './import-row-normalizer';

interface NormalizedImportPatient {
  firstName: string;
  lastName: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date;
  email: string | undefined;
  address: string;
  bloodGroup: string;
  allergies: string;
  medicalHistory: string[];
}

interface ImportedInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

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
    const patientData = this.normalizePatientRow(row);
    this.assertImportContext(clinicId, audit);
    const patient = await this.createPatientWithConsent(
      patientData,
      clinicId,
      audit,
    );
    await this.createPendingInvoiceIfPresent(row, clinicId, patient.id);
  }

  private normalizePatientRow(row: MappedPatientData): NormalizedImportPatient {
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

    if (!firstName)
      throw new BadRequestException('Missing required field: First Name');
    if (!phone)
      throw new BadRequestException('Missing required field: Phone Number');

    const dobStr = row['dateOfBirth'] || row['Date of Birth'] || row['dob'];
    const dob = dobStr ? parseImportDate(dobStr) : this.clock.now();
    const email = cleanImportEmail(
      row['email'] || row['Email'] || row['email address'],
    );

    return {
      firstName,
      lastName,
      phone,
      gender: normalizeImportGender(genderStr),
      dateOfBirth: dob || this.clock.now(),
      email,
      address: (row['address'] || row['Address'] || '').toString().trim(),
      bloodGroup: (row['bloodGroup'] || row['Blood Group'] || '')
        .toString()
        .trim()
        .toUpperCase(),
      allergies: (row['allergies'] || row['Allergies'] || '').toString().trim(),
      medicalHistory: normalizeMedicalHistory(row),
    };
  }

  private assertImportContext(
    clinicId: string | undefined,
    audit: ImportAuditContext,
  ): asserts clinicId is string {
    if (!clinicId)
      throw new BadRequestException('Clinic ID is required for patient import');
    if (!audit.dpdpNoticeVersion)
      throw new BadRequestException(
        'DPDP consent attestation is required for patient imports',
      );
  }

  private async createPatientWithConsent(
    patientData: NormalizedImportPatient,
    clinicId: string,
    audit: ImportAuditContext,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          phoneNumber: patientData.phone,
          gender: patientData.gender,
          dateOfBirth: patientData.dateOfBirth,
          email: patientData.email,
          address: patientData.address,
          bloodGroup: patientData.bloodGroup,
          allergies: patientData.allergies,
          medicalHistory: patientData.medicalHistory,
          clinicId,
        },
      });
      await tx.consent.create({
        data: {
          patientId: created.id,
          clinicId,
          consentType: ConsentType.DPDP_NOTICE,
          status: ConsentStatus.ACTIVE,
          givenBy: getPatientFullName({
            firstName: patientData.firstName,
            lastName: patientData.lastName,
          }),
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
  }

  private async createPendingInvoiceIfPresent(
    row: MappedPatientData,
    clinicId: string,
    patientId: string,
  ): Promise<void> {
    const invoiceTotalRaw =
      row['invoiceTotal'] ??
      row['Invoice Total'] ??
      row['invoiceGrandTotal'] ??
      row['Invoice Grand Total'];
    const total = parsePositiveInvoiceTotal(invoiceTotalRaw);
    if (total == null) return;
    await this.prisma.invoice.create({
      data: {
        patientId,
        clinicId,
        total,
        subtotal: total,
        grandTotal: total,
        taxTotal: 0,
        discountTotal: 0,
        ...toInvoiceCentCreateFields({
          total,
          subtotal: total,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: total,
        }),
        status: InvoiceStatus.PENDING,
        items: toPrismaInputJsonValue(invoiceItemsFromRow(row, total)),
      },
    });
  }
}

function normalizeImportGender(genderStr: string): Gender {
  if (genderStr === 'MALE' || genderStr === 'M') return Gender.MALE;
  return genderStr === 'FEMALE' || genderStr === 'F'
    ? Gender.FEMALE
    : Gender.OTHER;
}

function normalizeMedicalHistory(row: MappedPatientData): string[] {
  const raw = row['medicalHistory'] ?? row['Medical History'];
  return raw != null && String(raw).trim() !== '' ? [String(raw)] : [];
}

function parsePositiveInvoiceTotal(
  value: string | number | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  const total = parseFloat(String(value).trim());
  return !Number.isNaN(total) && total > 0 ? total : null;
}

function invoiceItemsFromRow(
  row: MappedPatientData,
  total: number,
): ImportedInvoiceLineItem[] {
  const rawItems =
    row['invoiceLineItems'] ?? row['Invoice Line Items'] ?? row['invoiceItems'];
  if (!rawItems) return defaultInvoiceItems(total);
  const parsed = parseInvoiceLineItems(String(rawItems));
  return parsed.length > 0 ? parsed : defaultInvoiceItems(total);
}

function defaultInvoiceItems(total: number): ImportedInvoiceLineItem[] {
  return [
    {
      description: 'Imported charges',
      quantity: 1,
      unitPrice: total,
      total,
    },
  ];
}

function parseInvoiceLineItems(rawItems: string): ImportedInvoiceLineItem[] {
  try {
    const parsed = jsonValueSchema.safeParse(JSON.parse(rawItems));
    return parsed.success ? toImportedInvoiceLineItems(parsed.data) : [];
  } catch {
    return [];
  }
}

function toImportedInvoiceLineItems(
  value: JsonValueSchemaType,
): ImportedInvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const lineItem = toImportedInvoiceLineItem(item);
    return lineItem ? [lineItem] : [];
  });
}

function toImportedInvoiceLineItem(
  value: JsonValueSchemaType,
): ImportedInvoiceLineItem | null {
  if (!isImportInvoiceLineItemRecord(value)) return null;
  return {
    description: String(value.description),
    quantity: Number(value.quantity),
    unitPrice: Number(value.unitPrice),
    total: Number(value.total),
  };
}

function isImportInvoiceLineItemRecord(
  value: JsonValueSchemaType,
): value is Record<keyof ImportedInvoiceLineItem, JsonValueSchemaType> {
  return (
    isJsonRecord(value) &&
    typeof value.description === 'string' &&
    isFiniteNumberLike(value.quantity) &&
    isFiniteNumberLike(value.unitPrice) &&
    isFiniteNumberLike(value.total)
  );
}

function isJsonRecord(
  value: JsonValueSchemaType,
): value is Record<string, JsonValueSchemaType> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumberLike(value: JsonValueSchemaType): boolean {
  return (
    (typeof value === 'number' || typeof value === 'string') &&
    Number.isFinite(Number(value))
  );
}
