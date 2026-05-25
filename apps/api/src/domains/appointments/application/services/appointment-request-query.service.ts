import { Injectable, Inject } from '@nestjs/common';
import type {
  AppointmentRequestListResponse,
  ListAppointmentRequestsQuery,
} from '@workspace/types';
import {
  APPOINTMENT_REQUEST_REPOSITORY_TOKEN,
  IAppointmentRequestRepository,
} from '@/domains/appointments/core/repositories/appointment-request.repository.interface';
import {
  mapAppointmentRequest,
  parseAppointmentRequestDate,
} from './appointment-request.helpers';

@Injectable()
export class AppointmentRequestQueryService {
  constructor(
    @Inject(APPOINTMENT_REQUEST_REPOSITORY_TOKEN)
    private readonly appointmentRequestRepository: IAppointmentRequestRepository,
  ) {}

  async listRequests(
    clinicId: string,
    filters: ListAppointmentRequestsQuery = {},
  ): Promise<AppointmentRequestListResponse> {
    const take = filters.limit ?? 20;
    const skip = filters.offset ?? 0;
    const { items, total } =
      await this.appointmentRequestRepository.findForClinic({
        clinicId,
        patientId: filters.patientId,
        status: filters.status,
        from: filters.from
          ? parseAppointmentRequestDate(filters.from, 'From date')
          : undefined,
        to: filters.to
          ? parseAppointmentRequestDate(filters.to, 'To date')
          : undefined,
        take,
        skip,
      });

    return {
      items: items.map((item) => mapAppointmentRequest(item)),
      count: total,
      hasMore: skip + items.length < total,
    };
  }
}
