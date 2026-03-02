import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IImportStrategy,
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

  async import(row: Record<string, unknown>, clinicId: string): Promise<void> {
    const firstName = this.readString(row, 'firstName');
    const lastName = this.readString(row, 'lastName');
    const phoneNumber = this.readString(row, 'phoneNumber');
    if (!firstName || !lastName || !phoneNumber) {
      throw new Error(
        'Missing required patient fields: firstName, lastName, or phoneNumber',
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
        throw new Error(`Email already exists: ${email}`);
      }
    }

    await this.prisma.patient.create({
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
