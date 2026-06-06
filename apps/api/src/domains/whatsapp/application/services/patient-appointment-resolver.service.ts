import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { isRecord } from '@workspace/utils';
import {
  toAppointmentContext,
  type AppointmentContext,
} from './patient-response.types';

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULING,
  AppointmentStatus.IN_PROGRESS,
];

/** How far back/forward we match a patient reply to an appointment. */
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const LOOKAHEAD_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_LINK_WINDOW_MS = 72 * 60 * 60 * 1000;

@Injectable()
export class PatientAppointmentResolverService {
  private readonly logger = new Logger(PatientAppointmentResolverService.name);

  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Resolves which appointment a patient WhatsApp reply belongs to.
   * Prefers the appointment linked to the outbound message being replied to.
   */
  async resolveForInboundMessage(params: {
    phoneNumber: string;
    contextProviderMessageId?: string;
  }): Promise<AppointmentContext | null> {
    const fromContext = await this.resolveFromReplyContext(
      params.contextProviderMessageId,
    );
    if (fromContext) return fromContext;

    return this.resolveFromPatientPhone(params.phoneNumber);
  }

  private async resolveFromReplyContext(
    providerMessageId: string | undefined,
  ): Promise<AppointmentContext | null> {
    if (!providerMessageId) return null;

    const log = await this.persistence.whatsappLog.findFirst({
      where: { providerMessageId },
      select: {
        requestBody: true,
      },
    });

    const appointmentId = this.readAppointmentIdFromLogRequest(
      log?.requestBody,
    );
    if (!appointmentId) return null;

    return this.loadAppointmentContext(appointmentId);
  }

  private readAppointmentIdFromLogRequest(requestBody: unknown): string | null {
    if (!isRecord(requestBody)) {
      return null;
    }
    const direct = requestBody.appointmentId;
    if (typeof direct === 'string' && direct.length > 0) return direct;
    const variables = requestBody.variables;
    if (!isRecord(variables)) {
      return null;
    }
    const fromVariables = variables.appointmentId;
    return typeof fromVariables === 'string' && fromVariables.length > 0
      ? fromVariables
      : null;
  }

  private async resolveFromPatientPhone(
    phoneNumber: string,
  ): Promise<AppointmentContext | null> {
    const phoneVariants = this.buildPhoneVariants(phoneNumber);
    const patient = await this.persistence.patient.findFirst({ where: { phoneNumber: { in: phoneVariants } }, select: { id: true } });
    if (!patient) return null;

    const now = this.clock.now();
    const windowStart = new Date(now.getTime() - LOOKBACK_MS);
    const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

    const candidates = await this.persistence.appointment.findMany({
      where: { patientId: patient.id, startTime: { gte: windowStart, lte: windowEnd }, status: { in: ACTIVE_STATUSES } },
      orderBy: { startTime: 'asc' },
      include: { patient: true, doctor: true, clinic: true },
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return toAppointmentContext(candidates[0]);

    const reminderCutoff = new Date(now.getTime() - REMINDER_LINK_WINDOW_MS);
    const candidateIds = candidates.map((row) => row.id);

    const recentLogs = await this.persistence.whatsappLog.findMany({
      where: { patientId: patient.id, createdAt: { gte: reminderCutoff } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { requestBody: true, createdAt: true },
    });

    for (const log of recentLogs) {
      const linkedId = this.readAppointmentIdFromLogRequest(log.requestBody);
      if (linkedId && candidateIds.includes(linkedId)) {
        const match = candidates.find((row) => row.id === linkedId);
        if (match) return toAppointmentContext(match);
      }
    }

    const upcoming = candidates.filter((row) => row.startTime >= now);
    const pool = upcoming.length > 0 ? upcoming : candidates;
    const nearest = pool.reduce((best, current) => {
      const bestDelta = Math.abs(best.startTime.getTime() - now.getTime());
      const currentDelta = Math.abs(current.startTime.getTime() - now.getTime());
      return currentDelta < bestDelta ? current : best;
    });

    this.logger.log(`Resolved ambiguous patient reply to nearest appointment ${nearest.id}`);
    return toAppointmentContext(nearest);
  }

  private async loadAppointmentContext(
    appointmentId: string,
  ): Promise<AppointmentContext | null> {
    const appointment = await this.persistence.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
      },
    });

    if (!appointment) return null;

    return toAppointmentContext(appointment);
  }

  private buildPhoneVariants(phoneNumber: string): string[] {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return [
      phoneNumber,
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.slice(-10),
    ].filter(
      (value, index, array) =>
        value.length > 0 && array.indexOf(value) === index,
    );
  }
}
