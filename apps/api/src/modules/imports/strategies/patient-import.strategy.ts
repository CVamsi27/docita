import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IImportStrategy,
  ImportValidationResult,
} from './import-strategy.interface';

/**
 * Strategy for importing patient data from CSV.
 */
@Injectable()
export class PatientImportStrategy implements IImportStrategy {
  readonly entityType = 'PATIENT';

  constructor(private prisma: PrismaService) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!row.firstName || !row.lastName) {
      return { valid: false, error: 'Missing firstName or lastName' };
    }
    if (!row.phoneNumber) {
      return { valid: false, error: 'Missing phoneNumber' };
    }
    return { valid: true };
  }

  async import(row: Record<string, unknown>, clinicId: string): Promise<void> {
    const email = row.email as string | undefined;
    // Validate email uniqueness if provided
    if (email) {
      const existing = await this.prisma.patient.findFirst({
        where: { email },
      });
      if (existing) {
        throw new Error(`Email already exists: ${email}`);
      }
    }

    await this.prisma.patient.create({
      data: {
        firstName: row.firstName as string,
        lastName: row.lastName as string,
        phoneNumber: row.phoneNumber as string,
        email: (row.email as string) || undefined,
        dateOfBirth: row.dateOfBirth
          ? new Date(row.dateOfBirth as string)
          : new Date(),
        bloodGroup: (row.bloodGroup as string) || undefined,
        address: (row.address as string) || undefined,
        gender: (row.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'OTHER',
        clinicId,
      },
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
