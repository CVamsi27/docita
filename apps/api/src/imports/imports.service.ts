import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { unlink } from 'fs/promises';
import { Gender } from '@workspace/db';
import { OCRService } from './ocr.service';
import {
  PATIENT_FIELD_MAPPINGS,
  ColumnMapping,
  ImportPreview,
  ImportResult,
  PatientFieldKey,
} from '@workspace/types';

export {
  PATIENT_FIELD_MAPPINGS,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
};

interface ExcelRow {
  [key: string]: string | number | undefined;
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
  dateOfBirth?: string | number;
  'Date of Birth'?: string | number;
  dob?: string | number;
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
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private prisma: PrismaService,
    private ocrService: OCRService,
  ) {}

  previewImport(filePath: string): ImportPreview {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        throw new BadRequestException(
          'File must have at least a header row and one data row',
        );
      }

      const headers = (data[0] as string[]) || [];
      const dataRows = data.slice(1, 6);

      const columns: ColumnMapping[] = headers.map((header, index) => ({
        excelColumn: header,
        dbField: this.suggestFieldMapping(header),
        sampleValues: dataRows
          .map((row) =>
            String((row as (string | number | undefined)[])[index] || ''),
          )
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
          obj[header] = (row as (string | number | undefined)[])[index] || '';
        });
        return obj;
      });

      return {
        columns,
        suggestedMappings,
        totalRows: data.length - 1,
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
    clinicId?: string,
    columnMapping?: Record<string, string>,
  ): Promise<ImportResult> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

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

          await this.importSinglePatient(mapped, clinicId);
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
      } catch {
        // Ignore cleanup errors
      }
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
        (result as Record<string, string | number | undefined>)[dbField] =
          row[excelCol];
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
    const firstName = this.cleanName(
      data['firstName'] || data['First Name'] || data['name'] || '',
    );
    const lastName = this.cleanName(
      data['lastName'] || data['Last Name'] || '',
    );

    if (phone) {
      const existingByPhone = await this.prisma.patient.findFirst({
        where: {
          phoneNumber: phone,
          ...(clinicId && { clinicId }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      });

      if (existingByPhone) {
        return {
          isDuplicate: true,
          reason: `Phone number ${phone} already exists`,
          existingPatient: {
            id: existingByPhone.id,
            name: `${existingByPhone.firstName} ${existingByPhone.lastName}`,
            phone: existingByPhone.phoneNumber,
          },
        };
      }
    }

    const dobStr = data['dateOfBirth'] || data['Date of Birth'] || data['dob'];
    if (firstName && dobStr) {
      const dob = this.parseDate(dobStr);
      if (dob) {
        const existingByNameDob = await this.prisma.patient.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            ...(lastName && {
              lastName: { equals: lastName, mode: 'insensitive' },
            }),
            dateOfBirth: dob,
            ...(clinicId && { clinicId }),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        });

        if (existingByNameDob) {
          return {
            isDuplicate: true,
            reason: `Patient ${firstName} ${lastName} with DOB ${dob.toLocaleDateString()} already exists`,
            existingPatient: {
              id: existingByNameDob.id,
              name: `${existingByNameDob.firstName} ${existingByNameDob.lastName}`,
              phone: existingByNameDob.phoneNumber,
            },
          };
        }
      }
    }

    return { isDuplicate: false, reason: '' };
  }

  private async importSinglePatient(row: MappedPatientData, clinicId?: string) {
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
      throw new Error('Missing required field: First Name');
    }
    if (!phone) {
      throw new Error('Missing required field: Phone Number');
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
      throw new Error('Clinic ID is required for patient import');
    }

    await this.prisma.patient.create({
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
  }

  private normalizePhoneNumber(phone: string | number | undefined): string {
    if (!phone) return '';

    const normalized = phone.toString().replace(/\D/g, '');

    if (normalized.length === 10) {
      return normalized;
    }
    if (normalized.length === 11 && normalized.startsWith('1')) {
      return normalized.substring(1);
    }
    if (normalized.length === 12 && normalized.startsWith('91')) {
      return normalized.substring(2);
    }

    return normalized;
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

  private parseDate(dateStr: string | number | undefined): Date | null {
    if (!dateStr) return null;

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

  /**
   * Extract text from medical document image using Tesseract.js
   * Includes image preprocessing for better accuracy (75-85%)
   */
  async extractFromMedicalDocumentBasic(filePath: string): Promise<any> {
    this.logger.log(`[IMPORT] Starting OCR extraction for file: ${filePath}`);
    try {
      // Use Tesseract.js with preprocessing
      const ocrResult = await this.ocrService.extractTextFromImage(filePath);
      this.logger.log(
        `[IMPORT] OCR extraction complete - confidence: ${ocrResult.confidence.toFixed(2)}, text length: ${ocrResult.text.length}`,
      );

      // Parse extracted text into structured fields
      const fields = this.ocrService.parseExtractedText(ocrResult.text);

      // Generate confidence scores for each field
      const fieldConfidence = this.ocrService.generateConfidenceScores(
        ocrResult.text,
        fields,
      );

      // Clean up temp file
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
          firstName: fields.firstName || '',
          lastName: fields.lastName || '',
          age: fields.age || '',
          gender: fields.gender || 'MALE',
          phoneNumber: fields.phoneNumber || '',
          email: fields.email || '',
          bloodType: fields.bloodType || '',
          diagnosis: fields.diagnosis || '',
          symptoms: fields.symptoms || [],
          allergies: fields.allergies || [],
          medicalHistory: fields.medicalHistory || [],
          medications: fields.medications || [],
          vitals: {
            bp: fields.vitals?.bp || '',
            temp: fields.vitals?.temp || '',
            pulse: fields.vitals?.pulse || '',
            respiratoryRate: fields.vitals?.respiratoryRate || '',
            spO2: fields.vitals?.spO2 || '',
            glucose: fields.vitals?.glucose || '',
          },
          labValues: {
            glucose: fields.labValues?.glucose || '',
            hemoglobin: fields.labValues?.hemoglobin || '',
            creatinine: fields.labValues?.creatinine || '',
          },
          fieldConfidence,
        },
        suggestedCorrections: {},
        message,
      };
    } catch (error) {
      this.logger.error(
        `[IMPORT] OCR extraction failed: ${error.message}`,
        error.stack,
      );
      await unlink(filePath).catch(() => {});
      throw new BadRequestException(
        `Failed to process image: ${error.message}`,
      );
    }
  }
}
