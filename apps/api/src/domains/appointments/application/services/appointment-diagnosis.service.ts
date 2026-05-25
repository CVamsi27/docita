import { Injectable } from '@nestjs/common';
import { type DiagnosisSyncItem } from '@workspace/types';
import { SyncAppointmentDiagnosesUseCase } from '@/domains/appointments/application/use-cases/sync-appointment-diagnoses.use-case';

/** Facade for diagnosis sync; delegates to {@link SyncAppointmentDiagnosesUseCase}. */
@Injectable()
export class AppointmentDiagnosisService {
  constructor(
    private readonly syncDiagnosesUseCase: SyncAppointmentDiagnosesUseCase,
  ) {}

  syncDiagnoses(
    appointmentId: string,
    clinicId: string,
    diagnoses: DiagnosisSyncItem[],
    requestHash?: string,
  ): Promise<{ contentHash: string; skipped: boolean; count: number }> {
    return this.syncDiagnosesUseCase.execute({
      appointmentId,
      clinicId,
      diagnoses,
      requestHash,
    });
  }
}
