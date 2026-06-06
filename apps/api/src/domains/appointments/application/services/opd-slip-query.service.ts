import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { AppointmentQueryService } from './appointment-query.service';
import { OpdSlipPdfService } from './opd-slip-pdf.service';
import { PatientQueryService } from '@/domains/patients/application/services/patient-query.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { extractPdfTheme } from '@workspace/types';
import { calculateAge, getPatientFullName, isRecord } from '@workspace/utils';

@Injectable()
export class OpdSlipQueryService {
  constructor(
    private readonly appointmentQueryService: AppointmentQueryService,
    private readonly patientQueryService: PatientQueryService,
    private readonly pdfService: OpdSlipPdfService,
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    private readonly persistence: AppointmentPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /** Generates a blank OPD prescription slip for an appointment's patient. */
  async generatePdf(
    appointmentId: string,
    clinicId: string,
  ): Promise<{ buffer: Buffer; patientId: string }> {
    const appointment = await this.appointmentQueryService.getAppointment(
      appointmentId,
      clinicId,
    );

    const patient = await this.patientQueryService.getPatient(
      appointment.patientId,
      clinicId,
    );
    const patientData = patient.toPlain();

    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
        currency: true,
        branding: true,
        settings: true,
      },
    });

    if (!clinic?.name)
      throw new BadRequestException(
        'Clinic details are required to generate the OPD slip',
      );

    const settings = this.toRecord(clinic.settings);
    const revisitValidityDays = this.readNumber(
      settings,
      'opdSlipRevisitValidityDays',
    );
    const footerNote = this.readString(settings, 'opdSlipFooterNote');

    const buffer = await this.pdfService.generate({
      documentId: appointment.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phone || undefined,
        email: clinic.email || undefined,
        logo: clinic.logo || undefined,
        currency: clinic.currency || undefined,
        branding: extractPdfTheme(clinic.branding),
      },
      patient: {
        name: getPatientFullName(patientData),
        phoneNumber: patientData.phoneNumber || undefined,
        gender: patientData.gender || undefined,
        age: calculateAge(patientData.dateOfBirth) ?? undefined,
        patientId: patientData.id.slice(0, 8).toUpperCase(),
      },
      revisitValidityDays,
      footerNote,
      date: this.clock.now(),
    });

    return { buffer, patientId: appointment.patientId };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
  }

  private readNumber(
    source: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = source[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
