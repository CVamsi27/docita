import {
  Injectable,
  Inject,
  Logger,
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
import {
  getClinicLocalDayUtcBounds,
  isValidIanaTimezone,
} from '@/shared/common/utils/clinic-calendar-bounds';
import { DEFAULT_TIMEZONE } from '@workspace/utils';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

type ListAppointmentsParams = AppointmentSearchParams & {
  calendarPickerDate?: string;
  calendarRangeStartPicker?: string;
  calendarRangeEndPicker?: string;
};

type PaginatedAppointmentList = Awaited<
  ReturnType<IAppointmentReadRepository['findAll']>
>;

@Injectable()
export class AppointmentQueryService {
  private readonly logger = new Logger(AppointmentQueryService.name);

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
    )
      throw new ForbiddenException(
        'Doctors can only access their appointments',
      );

    return appointment;
  }

  async listAppointments(params: ListAppointmentsParams) {
    const {
      calendarPickerDate,
      calendarRangeStartPicker,
      calendarRangeEndPicker,
      ...rest
    } = params;
    let repoParams: AppointmentSearchParams = { ...rest };

    if (calendarPickerDate && !rest.startDate && !rest.endDate) {
      const bounds = await this.resolveCalendarPickerDayUtcBounds(
        rest.clinicId,
        calendarPickerDate,
      );
      if (!bounds) {
        return this.emptyCalendarFilteredPage(
          rest.clinicId,
          `date '${calendarPickerDate}'`,
        );
      }
      repoParams = this.mergeCalendarBoundsIntoParams(repoParams, bounds);
    } else if (
      (calendarRangeStartPicker || calendarRangeEndPicker) &&
      !rest.startDate &&
      !rest.endDate
    ) {
      const bounds = await this.resolveCalendarPickerRangeUtcBounds(
        rest.clinicId,
        calendarRangeStartPicker,
        calendarRangeEndPicker,
      );
      if (!bounds) {
        return this.emptyCalendarFilteredPage(
          rest.clinicId,
          `range '${calendarRangeStartPicker ?? ''}'..'${calendarRangeEndPicker ?? ''}'`,
        );
      }
      repoParams = this.mergeCalendarBoundsIntoParams(repoParams, bounds);
    }

    return this.appointmentRepository.findAll(repoParams);
  }

  // Shared by both calendar-picker branches above — resolving either a
  // single day or a start/end range yields the same UTC bounds shape, and
  // both merge it into `repoParams` identically, so the merge lives in one
  // place rather than the two branches drifting apart.
  private mergeCalendarBoundsIntoParams(
    repoParams: AppointmentSearchParams,
    bounds: { rangeStart: Date; rangeEndExclusive: Date },
  ): AppointmentSearchParams {
    return {
      ...repoParams,
      startDate: bounds.rangeStart,
      endDate: bounds.rangeEndExclusive,
      intersectCalendarRange: true,
    };
  }

  async resolveCalendarPickerDayUtcBounds(
    clinicId: string,
    pickerDateStr: string,
  ): Promise<{ rangeStart: Date; rangeEndExclusive: Date } | null> {
    const timezone = await this.resolveClinicTimezone(clinicId);
    return getClinicLocalDayUtcBounds(pickerDateStr, timezone);
  }

  private async resolveCalendarPickerRangeUtcBounds(
    clinicId: string,
    startPicker?: string,
    endPicker?: string,
  ): Promise<{ rangeStart: Date; rangeEndExclusive: Date } | null> {
    const timezone = await this.resolveClinicTimezone(clinicId);

    const startBounds = startPicker
      ? getClinicLocalDayUtcBounds(startPicker, timezone)
      : null;
    const endBounds = endPicker
      ? getClinicLocalDayUtcBounds(endPicker, timezone)
      : null;

    if (startPicker && !startBounds) return null;
    if (endPicker && !endBounds) return null;

    const rangeStart = startBounds?.rangeStart;
    const rangeEndExclusive = endBounds?.rangeEndExclusive;

    if (!rangeStart || !rangeEndExclusive) return null;

    if (rangeStart.getTime() >= rangeEndExclusive.getTime()) {
      return null;
    }

    return { rangeStart, rangeEndExclusive };
  }

  private async resolveClinicTimezone(clinicId: string): Promise<string> {
    return this.getClinicTimezone(clinicId);
  }

  async getClinicTimezone(clinicId: string): Promise<string> {
    const row = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const raw = row?.timezone?.trim() || DEFAULT_TIMEZONE;
    if (isValidIanaTimezone(raw)) {
      return raw;
    }

    this.logger.warn(
      `Clinic ${clinicId} has invalid timezone '${raw}'; falling back to ${DEFAULT_TIMEZONE}`,
    );
    return DEFAULT_TIMEZONE;
  }

  private emptyCalendarFilteredPage(
    clinicId: string,
    context: string,
  ): PaginatedAppointmentList {
    this.logger.warn(
      `Could not resolve calendar bounds for clinic ${clinicId} and ${context}. Returning empty page.`,
    );
    return {
      items: [],
      count: 0,
      hasMore: false,
    };
  }
}
