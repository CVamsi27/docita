import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  IAppointmentRepository,
  AppointmentSearchParams,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Role } from '@workspace/db';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { getClinicLocalDayUtcBounds } from '@/shared/common/utils/clinic-calendar-bounds';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

@Injectable()
export class AppointmentQueryService {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly prisma: PrismaService,
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
    const row = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const timezone = row?.timezone?.trim() || 'Asia/Kolkata';
    return getClinicLocalDayUtcBounds(pickerDateStr, timezone);
  }
}
