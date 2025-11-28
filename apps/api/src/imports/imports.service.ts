import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { unlink } from 'fs/promises';
import { Gender } from '@workspace/db';
import {
  PATIENT_FIELD_MAPPINGS,
  ColumnMapping,
  ImportPreview,
  ImportResult,
  PatientFieldKey,
} from '@workspace/types';

// Re-export for backward compatibility
export { PATIENT_FIELD_MAPPINGS, type ColumnMapping, type ImportPreview, type ImportResult };

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Preview an import file and suggest column mappings
   */
  async previewImport(filePath: string): Promise<ImportPreview> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (data.length < 2) {
        throw new BadRequestException('File must have at least a header row and one data row');
      }

      const headers = data[0] as string[];
      const dataRows = data.slice(1, 6); // Get first 5 data rows for preview

      const columns: ColumnMapping[] = headers.map((header, index) => ({
        excelColumn: header,
        dbField: this.suggestFieldMapping(header),
        sampleValues: dataRows.map(row => String(row[index] || '')).filter(v => v),
      }));

      const suggestedMappings: Record<string, string> = {};
      columns.forEach(col => {
        if (col.dbField) {
          suggestedMappings[col.excelColumn] = col.dbField;
        }
      });

      // Convert sample data to object format
      const sampleData = dataRows.map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      return {
        columns,
        suggestedMappings,
        totalRows: data.length - 1, // Exclude header
        sampleData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to read file: ${(error as Error).message}`);
    }
  }

  /**
   * Process patient import with custom column mapping
   */
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
          const mapped = columnMapping 
            ? this.applyColumnMapping(row, columnMapping)
            : row;
          
          const duplicateCheck = await this.checkForDuplicates(mapped, clinicId);
          
          if (duplicateCheck.isDuplicate) {
            results.duplicates++;
            results.duplicateDetails.push({
              row: index + 2, // Excel row number (1-indexed + header)
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
      // Clean up temp file
      try {
        await unlink(filePath);
      } catch (e) {
        console.error('Failed to delete temp import file', e);
      }
    }
  }

  /**
   * Suggest a database field mapping based on Excel column header
   */
  private suggestFieldMapping(header: string): keyof typeof PATIENT_FIELD_MAPPINGS | null {
    const normalized = header.toLowerCase().trim();
    
    for (const [field, aliases] of Object.entries(PATIENT_FIELD_MAPPINGS)) {
      if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
        return field as keyof typeof PATIENT_FIELD_MAPPINGS;
      }
    }
    
    return null;
  }

  /**
   * Apply column mapping to transform Excel data to database fields
   */
  private applyColumnMapping(row: any, mapping: Record<string, string>): any {
    const result: any = {};
    
    for (const [excelCol, dbField] of Object.entries(mapping)) {
      if (row[excelCol] !== undefined && dbField) {
        result[dbField] = row[excelCol];
      }
    }
    
    return result;
  }

  /**
   * Check for duplicate patients
   */
  private async checkForDuplicates(
    data: any,
    clinicId?: string,
  ): Promise<{
    isDuplicate: boolean;
    reason: string;
    existingPatient?: { id: string; name: string; phone: string };
  }> {
    const phone = this.normalizePhoneNumber(data['phoneNumber'] || data['Phone Number'] || data['phone']);
    const firstName = this.cleanName(data['firstName'] || data['First Name'] || data['name'] || '');
    const lastName = this.cleanName(data['lastName'] || data['Last Name'] || '');
    
    // Check by phone number (exact match)
    if (phone) {
      const existingByPhone = await this.prisma.patient.findFirst({
        where: { 
          phoneNumber: phone,
          ...(clinicId && { clinicId }),
        },
        select: { id: true, firstName: true, lastName: true, phoneNumber: true },
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

    // Check by name + DOB (fuzzy match) - V2 feature
    const dobStr = data['dateOfBirth'] || data['Date of Birth'] || data['dob'];
    if (firstName && dobStr) {
      const dob = this.parseDate(dobStr);
      if (dob) {
        const existingByNameDob = await this.prisma.patient.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            ...(lastName && { lastName: { equals: lastName, mode: 'insensitive' } }),
            dateOfBirth: dob,
            ...(clinicId && { clinicId }),
          },
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
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

  /**
   * Import a single patient record
   */
  private async importSinglePatient(row: any, clinicId?: string) {
    // Extract and clean fields
    const firstName = this.cleanName(row['firstName'] || row['First Name'] || row['name']);
    const lastName = this.cleanName(row['lastName'] || row['Last Name'] || '');
    const phone = this.normalizePhoneNumber(row['phoneNumber'] || row['Phone Number'] || row['phone']);
    const genderStr = (row['gender'] || row['Gender'] || '').toString().toUpperCase();

    if (!firstName) {
      throw new Error('Missing required field: First Name');
    }
    if (!phone) {
      throw new Error('Missing required field: Phone Number');
    }

    // Parse gender
    let gender: Gender = Gender.OTHER;
    if (genderStr === 'MALE' || genderStr === 'M') gender = Gender.MALE;
    else if (genderStr === 'FEMALE' || genderStr === 'F') gender = Gender.FEMALE;

    // Parse date of birth
    const dobStr = row['dateOfBirth'] || row['Date of Birth'] || row['dob'];
    const dob = dobStr ? this.parseDate(dobStr) : new Date();

    // Clean email
    const email = this.cleanEmail(row['email'] || row['Email'] || row['email address']);

    // Create patient
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
        bloodGroup: (row['bloodGroup'] || row['Blood Group'] || '').toString().trim().toUpperCase(),
        allergies: (row['allergies'] || row['Allergies'] || '').toString().trim(),
        medicalHistory: row['medicalHistory'] || row['Medical History'] 
          ? [(row['medicalHistory'] || row['Medical History']).toString()]
          : [],
        clinicId,
      },
    });
  }

  /**
   * Normalize phone number
   */
  private normalizePhoneNumber(phone: any): string {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let normalized = phone.toString().replace(/\D/g, '');
    
    // Handle common formats
    if (normalized.length === 10) {
      // US format without country code
      return normalized;
    }
    if (normalized.length === 11 && normalized.startsWith('1')) {
      // US format with country code
      return normalized.substring(1);
    }
    if (normalized.length === 12 && normalized.startsWith('91')) {
      // Indian format with country code
      return normalized.substring(2);
    }
    
    return normalized;
  }

  /**
   * Clean and normalize a name
   */
  private cleanName(name: any): string {
    if (!name) return '';
    return name
      .toString()
      .trim()
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Clean and validate email
   */
  private cleanEmail(email: any): string | undefined {
    if (!email) return undefined;
    
    const cleaned = email.toString().trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emailRegex.test(cleaned) ? cleaned : undefined;
  }

  /**
   * Parse various date formats
   */
  private parseDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    
    // Handle Excel serial date number
    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + dateStr * 86400000);
    }

    const str = dateStr.toString().trim();
    
    // Try various formats
    const formats = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    // Try ISO format first
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try DD/MM/YYYY format (common in India)
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

}
