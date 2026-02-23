import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Specialization } from '@workspace/db';
import {
  IImportStrategy,
  ImportValidationResult,
} from './import-strategy.interface';

/**
 * Strategy for importing doctor/staff data from CSV.
 */
@Injectable()
export class DoctorImportStrategy implements IImportStrategy {
  readonly entityType = 'DOCTOR';
  private readonly logger = new Logger(DoctorImportStrategy.name);

  constructor(private prisma: PrismaService) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!row.name || !row.email) {
      return { valid: false, error: 'Missing name or email' };
    }
    return { valid: true };
  }

  async import(row: Record<string, unknown>, clinicId: string): Promise<void> {
    // Verify email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: row.email as string },
    });
    if (existing) {
      throw new Error(`Email already exists: ${String(row.email)}`);
    }

    // Parse specialization if provided
    const specializationValue = row.specialization as string | undefined;
    const specialization =
      specializationValue &&
      Object.values(Specialization).includes(
        specializationValue as Specialization,
      )
        ? (specializationValue as Specialization)
        : undefined;

    // Create doctor user
    await this.prisma.user.create({
      data: {
        email: row.email as string,
        name: row.name as string,
        password: 'temp_password', // Should be sent via separate notification
        role: 'DOCTOR',
        clinicId,
        specialization,
        registrationNumber: (row.registrationNumber as string) || undefined,
        phoneNumber: (row.phoneNumber as string) || undefined,
      },
    });

    this.logger.log(`Imported doctor: ${String(row.email)}`);
  }

  getTemplate(): Record<string, string> {
    return {
      name: '',
      email: '',
      phone: '',
      specialization: '',
      registrationNumber: '',
    };
  }
}
