import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  APPOINTMENT_READ_REPOSITORY_TOKEN,
  IAppointmentReadRepository,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { AppointmentSearchParams } from '@/domains/appointments/core/repositories/appointment-repository.types';
import { Role } from '@workspace/db';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { getClinicLocalDayUtcBounds } from '@/shared/common/utils/clinic-calendar-bounds';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

@Injectable()
export class AppointmentQueryService {
  constructor(
    @Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentReadRepository,
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    private readonly persistence: AppointmentPersistencePort,
  ) {}

  async getAppointment(
    id: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id, clinicId);
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (
      accessContext?.role === Role.DOCTOR &&
      accessContext.userId &&
      appointment.doctorId !== accessContext.userId
    ) {
      throw new ForbiddenException(
        'Doctors can only access their appointments',
      );
    }

    return appointment;
  }

  async listAppointments(
    params: AppointmentSearchParams & { calendarPickerDate?: string },
  ) {
    const { calendarPickerDate, ...rest } = params;
    let repoParams: AppointmentSearchParams = { ...rest };

    if (calendarPickerDate && !rest.startDate && !rest.endDate) {
      const bounds = await this.resolveCalendarPickerDayUtcBounds(
        rest.clinicId,
        calendarPickerDate,
      );
      if (bounds) {
        repoParams = {
          ...repoParams,
          startDate: bounds.rangeStart,
          endDate: bounds.rangeEndExclusive,
          intersectCalendarRange: true,
        };
      }
    }

    return this.appointmentRepository.findAll(repoParams);
  }

  async resolveCalendarPickerDayUtcBounds(
    clinicId: string,
    pickerDateStr: string,
  ): Promise<{ rangeStart: Date; rangeEndExclusive: Date } | null> {
    const row = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const timezone = row?.timezone?.trim() || 'Asia/Kolkata';
    return getClinicLocalDayUtcBounds(pickerDateStr, timezone);
  }
}
