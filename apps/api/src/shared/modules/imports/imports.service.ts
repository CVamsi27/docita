import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { unlink, readFile } from 'fs/promises';
import { extname } from 'path';
import {
  AppointmentStatus,
  ConsentStatus,
  ConsentType,
  Gender,
  InvoiceStatus,
} from '@workspace/db';
import { Feature } from '@workspace/types';
import { clinicHasFeatureForAccess } from '@/shared/modules/auth/utils/clinic-feature-access.util';
import { AIService } from '@/shared/modules/ai/ai.service';
import { OCRService } from './ocr.service';
import type { OcrImportCommitRequest } from '@workspace/types';
import {
  PATIENT_FIELD_MAPPINGS,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
} from '@workspace/utils';
import { ImportPreviewService } from './import-preview.service';
import { PatientTabularImportService } from './patient-tabular-import.service';
import { ImportOcrWorkflowService } from './import-ocr-workflow.service';
import { OcrImportCommitService } from './ocr-import-commit.service';
import type {
  ExcelRow,
  ImportAuditContext,
  MappedPatientData,
} from './import-types';

export {
  PATIENT_FIELD_MAPPINGS,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
};
export type { ExcelRow, ImportAuditContext, MappedPatientData };

interface ExcelRow {
  [key: string]: string | number | Date | undefined;
}

interface MappedPatientData {
  firstName?: string;
  lastName?: string;
  'First Name'?: string;
  'Last Name'?: string;
  name?: string;
  phoneNumber?: string;
  'Phone Number'?: string;
  phone?: string;
  gender?: string;
  Gender?: string;
  dateOfBirth?: string | number | Date;
  'Date of Birth'?: string | number | Date;
  dob?: string | number | Date;
  email?: string;
  Email?: string;
  'email address'?: string;
  address?: string;
  Address?: string;
  bloodGroup?: string;
  'Blood Group'?: string;
  allergies?: string;
  Allergies?: string;
  medicalHistory?: string;
  'Medical History'?: string;
  invoiceTotal?: string | number;
  'Invoice Total'?: string | number;
  invoiceGrandTotal?: string | number;
  'Invoice Grand Total'?: string | number;
  invoiceLineItems?: string;
  'Invoice Line Items'?: string;
  invoiceItems?: string;
}

export interface ImportAuditContext {
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
  dpdpNoticeVersion?: string;
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly previewService: ImportPreviewService,
    private readonly tabularImport: PatientTabularImportService,
    private readonly ocrWorkflow: ImportOcrWorkflowService,
    private readonly ocrCommit: OcrImportCommitService,
  ) {}

  previewImport(filePath: string): Promise<ImportPreview> {
    return this.previewService.previewImport(filePath);
  }

  processPatientImport(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const csvContent = await readFile(filePath, 'utf-8');
    const result = Papa.parse<Array<string | number | Date | undefined>>(
      csvContent,
      {
        skipEmptyLines: 'greedy',
      },
    );

    if (result.errors.length > 0) {
      throw new BadRequestException(
        `Failed to parse CSV: ${result.errors[0].message}`,
      );
    }

    return result.data
      .map((row) =>
        row.map((cell) => {
          const sanitized = this.sanitizeCellValue(cell);
          return sanitized === '' ? undefined : sanitized;
        }),
      )
      .filter((row) => !this.isRowEmpty(row));
  }

  private async parseXlsxRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Spreadsheet does not contain any sheets');
    }

    const rows: Array<Array<string | number | Date | undefined>> = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const cells = row.values as unknown[];
      const normalized = cells
        .slice(1)
        .map((cell) => this.sanitizeCellValue(cell))
        .map((cell) => (cell === '' ? undefined : cell));

      while (
        normalized.length > 0 &&
        (normalized[normalized.length - 1] === undefined ||
          String(normalized[normalized.length - 1]).trim() === '')
      ) {
        normalized.pop();
      }

      if (!this.isRowEmpty(normalized)) {
        rows.push(normalized);
      }
    });

    return rows;
  }

  private async parseTabularRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const extension = this.getImportExtension(filePath);
    if (extension === '.csv') {
      return this.parseCsvRows(filePath);
    }
    return this.parseXlsxRows(filePath);
  }

  private toHeaderString(value: string | number | Date | undefined): string {
    if (value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  private mapDataRows(
    headers: string[],
    dataRows: Array<Array<string | number | Date | undefined>>,
  ): ExcelRow[] {
    return dataRows.map((row) => {
      const mapped: ExcelRow = {};
      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        const value = row[index];
        if (value !== undefined && String(value).trim() !== '') {
          mapped[header] = value;
        }
      });
      return mapped;
    });
  }

  async previewImport(filePath: string): Promise<ImportPreview> {
    try {
      const data = await this.parseTabularRows(filePath);
      if (data.length < 2) {
        throw new BadRequestException(
          'File must have at least a header row and one data row',
        );
      }

      const headers = data[0].map((value) => this.toHeaderString(value));
      if (headers.filter((header) => header.length > 0).length === 0) {
        throw new BadRequestException('Header row is empty');
      }

      const allDataRows = data.slice(1).filter((row) => !this.isRowEmpty(row));
      if (allDataRows.length === 0) {
        throw new BadRequestException(
          'File must have at least one non-empty data row',
        );
      }

      const dataRows = allDataRows.slice(0, 5);

      const columns: ColumnMapping[] = headers.map((header, index) => ({
        excelColumn: header,
        dbField: this.suggestFieldMapping(header),
        sampleValues: dataRows
          .map((row) => String(this.getCell(row, index) || ''))
          .filter((v) => v),
      }));

      const suggestedMappings: Record<string, string> = {};
      columns.forEach((col) => {
        if (col.dbField) {
          suggestedMappings[col.excelColumn] = col.dbField;
        }
      });

      const sampleData = dataRows.map((row) => {
        const obj: Record<string, string | number> = {};
        headers.forEach((header, index) => {
          const value = this.getCell(row, index);
          obj[header] =
            value instanceof Date ? value.toISOString() : (value ?? '');
        });
        return obj;
      });

      return {
        columns,
        suggestedMappings,
        totalRows: allDataRows.length,
        sampleData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Failed to read file: ${(error as Error).message}`,
      );
    }
  }

  async processPatientImport(
    filePath: string,
    clinicId: string | undefined,
    columnMapping: Record<string, string> | undefined,
    audit: ImportAuditContext,
  ): Promise<ImportResult> {
    if (!audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'DPDP consent attestation is required for patient imports',
      );
    }
    try {
      const tableRows = await this.parseTabularRows(filePath);
      if (tableRows.length < 2) {
        throw new BadRequestException(
          'File must have at least a header row and one data row',
        );
      }

      const headers = tableRows[0].map((value) => this.toHeaderString(value));
      const dataRows = tableRows
        .slice(1)
        .filter((row) => !this.isRowEmpty(row));
      const data = this.mapDataRows(headers, dataRows);

      const results: ImportResult = {
        total: data.length,
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: [],
        duplicateDetails: [],
      };

      for (const [index, row] of data.entries()) {
        try {
          const excelRow = row as ExcelRow;
          const mapped = columnMapping
            ? this.applyColumnMapping(excelRow, columnMapping)
            : (excelRow as MappedPatientData);

          const duplicateCheck = await this.checkForDuplicates(
            mapped,
            clinicId,
          );

          if (duplicateCheck.isDuplicate) {
            results.duplicates++;
            results.duplicateDetails.push({
              row: index + 2,
              reason: duplicateCheck.reason,
              existingPatient: duplicateCheck.existingPatient,
            });
            continue;
          }

          await this.importSinglePatient(mapped, clinicId, audit);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${index + 2}: ${(error as Error).message}`);
        }
      }

      return results;
    } finally {
      try {
        await unlink(filePath);
      } catch {}
    }
  }

  private suggestFieldMapping(
    header: string,
  ): keyof typeof PATIENT_FIELD_MAPPINGS | null {
    const normalized = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(PATIENT_FIELD_MAPPINGS)) {
      if (
        aliases.some(
          (alias) => normalized.includes(alias) || alias.includes(normalized),
        )
      ) {
        return field as keyof typeof PATIENT_FIELD_MAPPINGS;
      }
    }

    return null;
  }

  private applyColumnMapping(
    row: ExcelRow,
    mapping: Record<string, string>,
  ): MappedPatientData {
    const result: MappedPatientData = {};

    for (const [excelCol, dbField] of Object.entries(mapping)) {
      if (row[excelCol] !== undefined && dbField) {
        (result as Record<string, string | number | Date | undefined>)[
          dbField
        ] = row[excelCol];
      }
    }

    return result;
  }

  private async checkForDuplicates(
    data: MappedPatientData,
    clinicId?: string,
  ): Promise<{
    isDuplicate: boolean;
    reason: string;
    existingPatient?: { id: string; name: string; phone: string };
  }> {
    const phone = this.normalizePhoneNumber(
      data['phoneNumber'] || data['Phone Number'] || data['phone'],
    );
  }

  private async importSinglePatient(
    row: MappedPatientData,
    clinicId: string | undefined,
    audit: ImportAuditContext,
  ) {
    const firstName = this.cleanName(
      row['firstName'] || row['First Name'] || row['name'],
    );
    const lastName = this.cleanName(row['lastName'] || row['Last Name'] || '');
    const phone = this.normalizePhoneNumber(
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
    const dob = dobStr ? this.parseDate(dobStr) : new Date();

    const email = this.cleanEmail(
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
          dateOfBirth: dob || new Date(),
          email,
          address: (row['address'] || row['Address'] || '').toString().trim(),
          bloodGroup: (row['bloodGroup'] || row['Blood Group'] || '')
            .toString()
            .trim()
            .toUpperCase(),
          allergies: (row['allergies'] || row['Allergies'] || '')
            .toString()
            .trim(),
          medicalHistory:
            row['medicalHistory'] || row['Medical History']
              ? [(row['medicalHistory'] ?? row['Medical History'])!.toString()]
              : [],
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
          notes: 'Operator attestation via Excel /imports/patients',
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
            const parsed = JSON.parse(String(rawItems)) as unknown;
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
            items: items as object,
          },
        });
      }
    }
  }

  extractFromMedicalDocumentBasic(filePath: string, clinicId?: string) {
    return this.ocrWorkflow.extractFromMedicalDocumentBasic(filePath, clinicId);
  }

  private cleanName(name: string | number | undefined): string {
    if (!name) return '';
    return name
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(
        (word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(' ');
  }

  private cleanEmail(email: string | number | undefined): string | undefined {
    if (!email) return undefined;

    const cleaned = email.toString().trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(cleaned) ? cleaned : undefined;
  }

  private parseDate(dateStr: string | number | Date | undefined): Date | null {
    if (!dateStr) return null;

    if (dateStr instanceof Date) {
      return dateStr;
    }

    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + dateStr * 86400000);
    }

    const str = dateStr.toString().trim();

    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  async processMedicalDocumentOcr(
    filePath: string,
    clinicId?: string,
  ): Promise<OcrExtractionResult> {
    let useAi = false;
    if (clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          tier: true,
          intelligenceAddon: true,
          features: true,
        },
      });
      if (clinic) {
        useAi = clinicHasFeatureForAccess(clinic, Feature.OCR_ADVANCED);
      }
    }

    if (useAi) {
      try {
        const ai = await this.aiService.extractFromMedicalDocument(
          filePath,
          true,
        );
        await unlink(filePath).catch(() => {});
        if (clinicId) {
          this.eventEmitter.emit('ocr.page.processed', {
            clinicId,
            pageCount: 1,
          });
        }
        const fieldConfidence = ai.fields.fieldConfidence ?? {};
        return {
          success: true,
          method: 'openai-vision',
          text: ai.text,
          documentType: ai.documentType,
          confidence: ai.confidence,
          fields: {
            ...ai.fields,
            fieldConfidence,
          },
          suggestedCorrections: ai.suggestedCorrections ?? {},
          message:
            'Document processed with AI-assisted extraction. Verify all fields before saving patient data.',
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `[IMPORT] AI OCR unavailable, falling back to basic pipeline: ${msg}`,
        );
      }
    }

    return this.extractFromMedicalDocumentBasic(filePath, clinicId);
  }

  async commitOcrImport(
    dto: OcrImportCommitRequest,
    audit: ImportAuditContext,
  ): Promise<{ patientId: string; appointmentId: string }> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
      select: { id: true },
    });
    if (!clinic) {
      throw new BadRequestException('Clinic not found');
    }

    const doctor = await this.prisma.user.findFirst({
      where: { id: dto.doctorId, clinicId: dto.clinicId },
      select: { id: true },
    });
    if (!doctor) {
      throw new BadRequestException('Doctor not found for this clinic');
    }

    const dob = new Date(dto.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestException('Invalid dateOfBirth');
    }

    if (!dto.dpdpConsent || dto.dpdpConsent.accepted !== true) {
      throw new BadRequestException(
        'DPDP consent is required to commit an OCR-extracted patient record',
      );
    }
    if (!audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'Missing DPDP consent context for OCR commit',
      );
    }
    if (dto.dpdpConsent.noticeVersion !== audit.dpdpNoticeVersion) {
      throw new BadRequestException(
        'The DPDP notice has been updated. Refresh and re-collect consent before committing.',
      );
    }
    const consentSnapshot = dto.dpdpConsent;

    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phoneNumber: dto.phoneNumber.trim(),
          gender: dto.gender as Gender,
          dateOfBirth: dob,
          address: dto.address?.trim() || undefined,
          clinicId: dto.clinicId,
          allergies:
            dto.allergies && dto.allergies.length > 0
              ? dto.allergies.join('; ')
              : undefined,
          medicalHistory: dto.diagnosis ? [dto.diagnosis] : [],
          customData: {
            ocrImport: {
              acknowledgedReview: dto.acknowledgeReview ?? false,
            },
          },
        },
      });
      await tx.consent.create({
        data: {
          patientId: patient.id,
          clinicId: dto.clinicId,
          consentType: ConsentType.DPDP_NOTICE,
          status: ConsentStatus.ACTIVE,
          givenBy:
            consentSnapshot.givenByName ??
            `${dto.firstName} ${dto.lastName}`.trim(),
          givenByRelation: consentSnapshot.relation ?? 'SELF',
          givenAt: new Date(),
          validFrom: new Date(),
          templateVersion: consentSnapshot.noticeVersion,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          createdBy: audit.createdBy,
          notes: 'Collected by staff via OCR import commit',
        },
      });

      const startTime = new Date();
      const endTime = new Date(Date.now() + 30 * 60 * 1000);

      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: dto.doctorId,
          clinicId: dto.clinicId,
          startTime,
          endTime,
          type: 'consultation',
          status: AppointmentStatus.CONFIRMED,
          consultationNotes: dto.consultationNotes?.trim() ?? '',
          notes: '',
          observations: dto.diagnosis?.trim() ?? '',
          provisionalDiagnosis: '',
          differentialDiagnosis: '',
          clinicalImpression: '',
          finalDiagnosis: '',
          treatmentPlan: '',
          followUpPlan: '',
        },
      });

      if (dto.vitals) {
        const v = dto.vitals;
        if (
          v.systolicBP !== undefined ||
          v.diastolicBP !== undefined ||
          v.temperature !== undefined ||
          v.pulse !== undefined
        ) {
          await tx.vitalSign.create({
            data: {
              appointmentId: appointment.id,
              systolicBP: v.systolicBP,
              diastolicBP: v.diastolicBP,
              temperature: v.temperature,
              pulse: v.pulse,
            },
          });
        }
      }

      if (dto.medications && dto.medications.length > 0) {
        const prescription = await tx.prescription.create({
          data: {
            appointmentId: appointment.id,
            patientId: patient.id,
            doctorId: dto.doctorId,
            instructions: dto.consultationNotes?.trim() ?? null,
          },
        });

        for (const med of dto.medications) {
          await tx.medication.create({
            data: {
              prescriptionId: prescription.id,
              name: med.name.trim(),
              dosage: med.dosage.trim() || '—',
              frequency: med.frequency.trim() || '—',
              duration: med.duration?.trim() || '—',
              route: med.route?.trim() || 'PO',
            },
          });
        }
      }

      if (dto.invoiceDraft) {
        const inv = dto.invoiceDraft;
        await tx.invoice.create({
          data: {
            patientId: patient.id,
            appointmentId: appointment.id,
            clinicId: dto.clinicId,
            total: inv.grandTotal,
            subtotal: inv.subtotal ?? inv.grandTotal,
            grandTotal: inv.grandTotal,
            taxTotal: inv.taxTotal ?? 0,
            discountTotal: 0,
            status: InvoiceStatus.PENDING,
            items: inv.items as object,
          },
        });
      }

      return {
        patientId: patient.id,
        appointmentId: appointment.id,
      };
    });
  }

  async extractFromMedicalDocumentBasic(
    filePath: string,
    clinicId?: string,
  ): Promise<OcrExtractionResult> {
    this.logger.log(`[IMPORT] Starting OCR extraction for file: ${filePath}`);
    try {
      const ocrResult = await this.ocrService.extractTextFromImage(filePath);
      if (clinicId) {
        this.eventEmitter.emit('ocr.page.processed', {
          clinicId,
          pageCount: 1,
        });
      }
      this.logger.log(
        `[IMPORT] OCR extraction complete - confidence: ${ocrResult.confidence.toFixed(2)}, text length: ${ocrResult.text.length}`,
      );

      const fields = this.ocrService.parseExtractedText(ocrResult.text);

      const fieldConfidence = this.ocrService.generateConfidenceScores(
        ocrResult.text,
        fields,
      );

      await unlink(filePath).catch(() => {});

      const message =
        ocrResult.confidence > 0.3
          ? 'Document scanned using Tesseract OCR with image preprocessing'
          : 'Unable to extract text from image. Please manually enter or verify highlighted fields below.';

      this.logger.log(
        `[IMPORT] Returning response with ${Object.keys(fieldConfidence).length} fields`,
      );

      return {
        success: true,
        method: 'tesseract-ocr',
        text: ocrResult.text,
        documentType: ocrResult.documentType,
        confidence: ocrResult.confidence,
        fields: {
          ...fields,
          fieldConfidence,
        },
        suggestedCorrections: {},
        message,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[IMPORT] OCR extraction failed: ${message}`, stack);
      await unlink(filePath).catch(() => {});
      throw new BadRequestException(`Failed to process image: ${message}`);
    }
  }
}
