import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from './email.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  DomainEvents,
  AppointmentScheduledPayload,
  PatientCreatedPayload,
  EventMetadata,
} from '@/common/events/domain-events';

@Injectable()
export class EmailEventsListener {
  private readonly logger = new Logger(EmailEventsListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(DomainEvents.USER_CREATED)
  async handleUserCreated(payload: {
    userId: string;
    email: string;
    name: string;
    clinicId: string;
  }) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: payload.clinicId },
        select: { name: true },
      });

      await this.emailService.sendWelcomeEmail(
        payload.email,
        payload.name,
        clinic?.name || 'Your Clinic',
      );

      this.logger.log(`Welcome email sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${payload.email}`,
        error,
      );
    }
  }

  @OnEvent(DomainEvents.APPOINTMENT_SCHEDULED)
  async handleAppointmentScheduled(
    payload: AppointmentScheduledPayload & { metadata?: EventMetadata },
  ) {
    try {
      const [patient, doctor, clinic] = await Promise.all([
        this.prisma.patient.findUnique({
          where: { id: payload.patientId },
          select: { email: true, firstName: true, lastName: true },
        }),
        this.prisma.user.findUnique({
          where: { id: payload.doctorId },
          select: { name: true },
        }),
        payload.metadata?.clinicId
          ? this.prisma.clinic.findUnique({
              where: { id: payload.metadata.clinicId },
              select: { name: true },
            })
          : null,
      ]);

      if (patient?.email) {
        await this.emailService.sendAppointmentReminder(
          patient.email,
          `${patient.firstName} ${patient.lastName}`,
          doctor?.name || 'Your Doctor',
          payload.startTime,
          clinic?.name || 'The Clinic',
        );

        this.logger.log(`Appointment confirmation sent to ${patient.email}`);
      }
    } catch (error) {
      this.logger.error('Failed to send appointment confirmation email', error);
    }
  }

  @OnEvent(DomainEvents.PATIENT_CREATED)
  async handlePatientCreated(
    payload: PatientCreatedPayload & {
      email?: string;
      metadata?: EventMetadata;
    },
  ) {
    if (!payload.email) {
      return;
    }

    try {
      const clinic = payload.metadata?.clinicId
        ? await this.prisma.clinic.findUnique({
            where: { id: payload.metadata.clinicId },
            select: { name: true },
          })
        : null;

      this.logger.debug(
        `Patient ${payload.firstName} created at ${clinic?.name || 'clinic'} - email available`,
      );
    } catch (error) {
      this.logger.error('Failed to process patient creation for email', error);
    }
  }
}
