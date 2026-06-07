// jscpd:ignore-start
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
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
export class PrescriptionImportStrategy implements IImportStrategy {
  readonly entityType = 'PRESCRIPTION';

  constructor(private readonly prisma: PrismaService) {}

  validate(row: Record<string, unknown>): ImportValidationResult {
    if (!readImportRowString(row, 'appointmentId')) {
      return { valid: false, error: 'Missing appointmentId' };
    }
    return { valid: true };
  }

  async import(
    row: Record<string, unknown>,
    clinicId: string,
    _audit: ImportStrategyAuditContext,
  ): Promise<void> {
    void _audit;
    const appointmentId = readImportRowRequiredString(row, 'appointmentId');
// jscpd:ignore-end

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      include: { prescription: true },
    });
    if (!appointment) throw new Error('Appointment not found for this clinic');
    if (appointment.prescription)
      throw new Error('Appointment already has a prescription');

    await this.prisma.prescription.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        instructions: readImportRowOptionalString(row, 'instructions') ?? null,
      },
    });
  }

  getTemplate(): Record<string, string> {
    return {
      appointmentId: '',
      instructions: '',
    };
  }
}
