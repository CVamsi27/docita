import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Specialization } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import {
  IImportStrategy,
  ImportValidationResult,
} from './import-strategy.interface';

@Injectable()
export class DoctorImportStrategy implements IImportStrategy {
  readonly entityType = 'DOCTOR';
  private readonly logger = new Logger(DoctorImportStrategy.name);

  constructor(private prisma: PrismaService) {}

  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = source[key];
    return typeof value === 'string' ? value : undefined;
  }

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!row.name || !row.email) {
      return { valid: false, error: 'Missing name or email' };
    }
    return { valid: true };
  }

  async import(row: Record<string, unknown>, clinicId: string): Promise<void> {
    const email = this.readString(row, 'email');
    const name = this.readString(row, 'name');
    if (!email || !name) {
      throw new Error('Missing required doctor fields: name or email');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new Error('Doctor email already exists');
    }

    const generatedPassword = nanoid(32);
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const specializationValue = this.readString(row, 'specialization');
    const specialization =
      specializationValue &&
      Object.values(Specialization).includes(
        specializationValue as Specialization,
      )
        ? (specializationValue as Specialization)
        : undefined;

    await this.prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        role: 'DOCTOR',
        clinicId,
        specialization,
        registrationNumber:
          this.readString(row, 'registrationNumber') || undefined,
        phoneNumber: this.readString(row, 'phoneNumber') || undefined,
      },
    });

    this.logger.log('Imported doctor account');
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
