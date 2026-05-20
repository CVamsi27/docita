import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { type DiagnosisSyncItem } from '@workspace/types';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { hashDiagnosesContent } from '@/domains/appointments/core/domain-services/appointment-diagnosis-content.rules';

interface SyncAppointmentDiagnosesCommand {
  appointmentId: string;
  clinicId: string;
  diagnoses: DiagnosisSyncItem[];
  requestHash?: string;
}

@Injectable()
export class SyncAppointmentDiagnosesUseCase {
  constructor(
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    private readonly persistence: AppointmentPersistencePort,
  ) {}

  async execute(
    command: SyncAppointmentDiagnosesCommand,
  ): Promise<{ contentHash: string; skipped: boolean; count: number }> {
    const { appointmentId, clinicId, diagnoses, requestHash } = command;

    const appointment = await this.persistence.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      select: { id: true, clinicId: true },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    const codedDiagnoses = diagnoses.filter(
      (d): d is DiagnosisSyncItem & { icdCodeId: string } =>
        typeof d.icdCodeId === 'string' && d.icdCodeId.length > 0,
    );
    const computedHash = hashDiagnosesContent(diagnoses);

    if (requestHash && requestHash !== computedHash) {
      throw new BadRequestException(
        'Diagnosis payload content hash does not match supplied hash',
      );
    }

    const existing = await this.persistence.diagnosis.findMany({
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

    await this.persistence.$transaction(async (tx) => {
      await tx.diagnosis.deleteMany({ where: { appointmentId } });
      if (codedDiagnoses.length > 0) {
        await tx.diagnosis.createMany({
          data: codedDiagnoses.map((d, index) => ({
            appointmentId,
            icdCodeId: d.icdCodeId,
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
