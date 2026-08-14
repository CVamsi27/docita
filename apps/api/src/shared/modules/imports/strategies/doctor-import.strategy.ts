// jscpd:ignore-start
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IMPORT_STRATEGY_PERSISTENCE_PORT,
  type ImportStrategyPersistencePort,
} from '../ports/import-strategy.persistence.port';
import { Specialization } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import {
  readImportRowOptionalString,
  readImportRowRequiredString,
  readImportRowString,
} from '../import-row-normalizer';
import {
  IImportStrategy,
  ImportStrategyAuditContext,
  ImportValidationResult,
} from './import-strategy.interface';

@Injectable()
export class DoctorImportStrategy implements IImportStrategy {
  readonly entityType = 'DOCTOR';
  private readonly logger = new Logger(DoctorImportStrategy.name);

  constructor(
    @Inject(IMPORT_STRATEGY_PERSISTENCE_PORT)
    private readonly prisma: ImportStrategyPersistencePort,
  ) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (
      !readImportRowString(row, 'name') ||
      !readImportRowString(row, 'email')
    ) {
      return { valid: false, error: 'Missing name or email' };
    }
    return { valid: true };
  }

  async import(
    row: Record<string, unknown>,
    clinicId: string,
    _audit: ImportStrategyAuditContext,
  ): Promise<void> {
    void _audit;
    const email = readImportRowRequiredString(row, 'email');
    // jscpd:ignore-end
    const name = readImportRowRequiredString(row, 'name');

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) throw new Error('Doctor email already exists');

    const generatedPassword = nanoid(32);
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const specializationValue = readImportRowOptionalString(
      row,
      'specialization',
    );
    const specialization = specializationValue
      ? (parseStringEnumMember(
          Object.values(Specialization),
          specializationValue,
        ) ?? undefined)
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
          readImportRowOptionalString(row, 'registrationNumber') || undefined,
        phoneNumber:
          readImportRowOptionalString(row, 'phoneNumber') ||
          readImportRowOptionalString(row, 'phone') ||
          undefined,
      },
    });

    this.logger.log('Imported doctor account');
  }

  getTemplate(): Record<string, string> {
    return {
      name: '',
      email: '',
      phoneNumber: '',
      specialization: '',
      registrationNumber: '',
    };
  }
}
