import { createHash } from 'crypto';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { type DiagnosisSyncItem } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';

function hashDiagnosesContent(diagnoses: DiagnosisSyncItem[]): string {
  const canonical = diagnoses
    .filter((d) => d.icdCodeId)
    .map((d) => ({
      icdCodeId: d.icdCodeId,
      notes: d.notes?.trim() ?? '',
      isPrimary: Boolean(d.isPrimary),
    }))
    .sort((a, b) => (a.icdCodeId! > b.icdCodeId! ? 1 : -1));
  return createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex')
    .slice(0, 32);
}

/** Handles diagnosis synchronisation for appointments. */
@Injectable()
export class AppointmentDiagnosisService {
  constructor(private readonly prisma: PrismaService) {}

  async syncDiagnoses(
    appointmentId: string,
    clinicId: string,
    diagnoses: DiagnosisSyncItem[],
    requestHash?: string,
  ): Promise<{ contentHash: string; skipped: boolean; count: number }> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      select: { id: true, clinicId: true },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    const codedDiagnoses = diagnoses.filter((d) => d.icdCodeId);
    const computedHash = hashDiagnosesContent(diagnoses);

    if (requestHash && requestHash !== computedHash) {
      throw new BadRequestException(
        'Diagnosis payload content hash does not match supplied hash',
      );
    }

    const existing = await this.prisma.diagnosis.findMany({
      where: { appointmentId, appointment: { clinicId } },
      select: { icdCodeId: true, notes: true, isPrimary: true },
    });
    const existingHash = hashDiagnosesContent(
      existing.map((d) => ({
        icdCodeId: d.icdCodeId ?? undefined,
        notes: d.notes ?? undefined,
        isPrimary: d.isPrimary,
      })),
    );

    if (existingHash === computedHash) {
      return {
        contentHash: computedHash,
        skipped: true,
        count: codedDiagnoses.length,
      };
    }

    const primaryDiagnosisIndex = codedDiagnoses.findIndex(
      (diagnosis) => diagnosis.isPrimary,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.diagnosis.deleteMany({ where: { appointmentId } });
      if (codedDiagnoses.length > 0) {
        await tx.diagnosis.createMany({
          data: codedDiagnoses.map((d, index) => ({
            appointmentId,
            icdCodeId: d.icdCodeId!,
            notes: d.notes ?? null,
            isPrimary:
              primaryDiagnosisIndex >= 0
                ? index === primaryDiagnosisIndex
                : index === 0,
          })),
        });
      }
    });

    return {
      contentHash: computedHash,
      skipped: false,
      count: codedDiagnoses.length,
    };
  }
}
