import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  IQueueRepository,
  QUEUE_REPOSITORY_TOKEN,
  QueueTokenWithRelations,
} from '@/domains/appointments/core/repositories/queue.repository.interface';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject(QUEUE_REPOSITORY_TOKEN)
    private readonly queueRepository: IQueueRepository,
  ) {}

  async getQueue(clinicId: string, doctorId?: string, search?: string) {
    const { today, tomorrow } = this.todayRange();

    const tokens = await this.queueRepository.findTodayTokens(
      clinicId,
      today,
      tomorrow,
      doctorId,
      ['WAITING', 'IN_PROGRESS'],
    );

    const filtered = this.filterBySearch(tokens, search);
    return filtered.map(this.mapToken);
  }

  async getTodayQueue(clinicId: string, doctorId?: string, search?: string) {
    const { today, tomorrow } = this.todayRange();

    const tokens = await this.queueRepository.findTodayTokens(
      clinicId,
      today,
      tomorrow,
      doctorId,
    );

    const filtered = this.filterBySearch(tokens, search);

    const patients = filtered.map((t) => ({
      id: t.id,
      type: t.appointmentId
        ? 'appointment'
        : ('queue' as 'appointment' | 'queue'),
      tokenNumber: t.tokenNumber,
      tokenType: t.tokenType as
        | 'scheduled'
        | 'walk-in'
        | 'late-arrival'
        | 'pending',
      status: t.status,
      priority: t.priority,
      scheduledTime: t.scheduledTime?.toISOString() ?? null,
      checkInTime: t.createdAt.toISOString(),
      patient: {
        id: t.patient.id,
        firstName: t.patient.firstName,
        lastName: t.patient.lastName,
        phoneNumber: t.patient.phoneNumber ?? null,
        gender: t.patient.gender ?? null,
        dateOfBirth: t.patient.dateOfBirth?.toISOString() ?? null,
      },
      doctor: t.doctor ?? null,
      appointmentId: t.appointmentId ?? null,
      appointmentType: t.appointment?.type ?? null,
      estimatedWaitTime: t.estimatedWaitTime ?? null,
      calledAt: t.calledAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    }));

    const stats = {
      total: tokens.length,
      pending: tokens.filter((t) => t.status === 'WAITING').length,
      waiting: tokens.filter((t) => t.status === 'WAITING').length,
      inProgress: tokens.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: tokens.filter((t) => t.status === 'COMPLETED').length,
      noShow: 0,
      walkIns: tokens.filter((t) => t.tokenType === 'walk-in').length,
      scheduled: tokens.filter((t) => t.tokenType === 'scheduled').length,
      avgConsultationMinutes: this.calcAvgConsultation(
        tokens.filter((t) => t.consultationStart && t.completedAt),
      ),
    };

    return { patients, stats };
  }

  async checkIn(clinicId: string, appointmentId: string) {
    const appointment = await this.queueRepository.findAppointmentForCheckIn(
      appointmentId,
      clinicId,
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const existing = await this.queueRepository.findExistingToken(
      appointmentId,
      clinicId,
    );
    if (existing) {
      return { success: true, token: existing };
    }

    const { today } = this.todayRange();
    const lastNumber = await this.queueRepository.findLastTodayTokenNumber(
      clinicId,
      today,
    );

    const token = await this.queueRepository.createToken({
      clinicId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId ?? null,
      tokenNumber: lastNumber + 1,
      tokenType: 'scheduled',
      scheduledTime: appointment.startTime,
      estimatedDuration: 15,
      status: 'WAITING',
    });

    return { success: true, token };
  }

  async callPatient(clinicId: string, queueId: string) {
    const token = await this.queueRepository.findTokenByIdAndClinic(
      queueId,
      clinicId,
    );
    if (!token) throw new NotFoundException('Queue token not found');

    return this.queueRepository.updateToken(queueId, {
      status: 'IN_PROGRESS',
      calledAt: new Date(),
      consultationStart: new Date(),
    });
  }

  async completePatient(clinicId: string, queueId: string) {
    const token = await this.queueRepository.findTokenByIdAndClinic(
      queueId,
      clinicId,
    );
    if (!token) throw new NotFoundException('Queue token not found');

    return this.queueRepository.updateToken(queueId, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });
  }

  async resetQueue(clinicId: string) {
    const { today } = this.todayRange();
    await this.queueRepository.cancelTodayActiveTokens(clinicId, today);
    return { success: true };
  }

  private todayRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today, tomorrow };
  }

  private filterBySearch(
    tokens: QueueTokenWithRelations[],
    search?: string,
  ): QueueTokenWithRelations[] {
    if (!search) return tokens;
    const lower = search.toLowerCase();
    return tokens.filter((t) => {
      const name = `${t.patient.firstName} ${t.patient.lastName}`.toLowerCase();
      return name.includes(lower);
    });
  }

  private mapToken(t: QueueTokenWithRelations) {
    return {
      id: t.id,
      clinicId: t.clinicId,
      patientId: t.patientId,
      appointmentId: t.appointmentId,
      doctorId: t.doctorId,
      tokenNumber: t.tokenNumber,
      status: t.status,
      priority: t.priority,
      notes: t.notes,
      calledAt: t.calledAt?.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      createdAt: t.createdAt.toISOString(),
      tokenType: t.tokenType as 'scheduled' | 'walk-in' | 'late-arrival',
      scheduledTime: t.scheduledTime?.toISOString(),
      estimatedDuration: t.estimatedDuration,
      estimatedWaitTime: t.estimatedWaitTime,
      consultationStart: t.consultationStart?.toISOString(),
      patient: t.patient,
      doctor: t.doctor,
      appointment: t.appointment,
    };
  }

  private calcAvgConsultation(
    completed: Array<{
      consultationStart: Date | null;
      completedAt: Date | null;
    }>,
  ): number {
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, t) => {
      if (!t.consultationStart || !t.completedAt) return sum;
      return sum + (t.completedAt.getTime() - t.consultationStart.getTime());
    }, 0);
    return Math.round(total / completed.length / 60000);
  }
}
