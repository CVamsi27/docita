import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { FollowUpStatus } from '@workspace/db';
import type { ListFollowUpsQuery } from '@workspace/types';
import {
  IFollowUpRepository,
  FOLLOW_UP_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/follow-up.repository.interface';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    @Inject(FOLLOW_UP_REPOSITORY_TOKEN)
    private readonly followUpRepository: IFollowUpRepository,
  ) {}

  async create(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    clinicId: string;
    scheduledDate: string;
    reason: string;
  }) {
    return this.followUpRepository.create({
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      clinicId: data.clinicId,
      scheduledDate: new Date(data.scheduledDate),
      reason: data.reason,
    });
  }

  async findUpcoming(clinicId: string) {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.followUpRepository.findUpcoming(clinicId, now, thirtyDays);
  }

  async findForClinic(clinicId: string, query: ListFollowUpsQuery = {}) {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.followUpRepository.findForClinic({
      clinicId,
      statuses: this.parseStatuses(query.status),
      from: query.from ? this.parseDate(query.from) : now,
      to: query.to ? this.parseDate(query.to) : thirtyDays,
      take: query.limit ?? 50,
    });
  }

  async findForAppointment(appointmentId: string, clinicId: string) {
    return this.followUpRepository.findForAppointment(appointmentId, clinicId);
  }

  async book(id: string, clinicId: string, bookedAppointmentId: string) {
    const followUp = await this.followUpRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!followUp) throw new NotFoundException('Follow-up not found');

    return this.followUpRepository.update(id, {
      status: 'BOOKED',
      bookedAppointmentId,
    });
  }

  async complete(id: string, clinicId: string) {
    const followUp = await this.followUpRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return this.followUpRepository.update(id, { status: 'COMPLETED' });
  }

  async cancel(id: string, clinicId: string) {
    const followUp = await this.followUpRepository.findByIdAndClinic(
      id,
      clinicId,
    );
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return this.followUpRepository.update(id, { status: 'CANCELLED' });
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Follow-up date filter is invalid');
    }
    return date;
  }

  private parseStatuses(status?: string): FollowUpStatus[] | undefined {
    if (!status) return [FollowUpStatus.PENDING, FollowUpStatus.REMINDER_SENT];
    const statuses = status
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item): item is FollowUpStatus =>
        Object.values(FollowUpStatus).includes(item as FollowUpStatus),
      );
    return statuses.length > 0 ? statuses : undefined;
  }
}
