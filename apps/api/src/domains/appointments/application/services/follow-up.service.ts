import { Injectable } from '@nestjs/common';
import type { ListFollowUpsQuery } from '@workspace/types';
import { FollowUpCommandService } from './follow-up-command.service';
import { FollowUpQueryService } from './follow-up-query.service';

/**
 * Facade — delegates follow-up reads and mutations to query/command services.
 */
@Injectable()
export class FollowUpService {
  constructor(
    private readonly queryService: FollowUpQueryService,
    private readonly commandService: FollowUpCommandService,
  ) {}

  create(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    clinicId: string;
    scheduledDate: string;
    reason: string;
  }) {
    return this.commandService.create(data);
  }

  findUpcoming(clinicId: string) {
    return this.queryService.findUpcoming(clinicId);
  }

  findForClinic(clinicId: string, query: ListFollowUpsQuery = {}) {
    return this.queryService.findForClinic(clinicId, query);
  }

  findForAppointment(appointmentId: string, clinicId: string) {
    return this.queryService.findForAppointment(appointmentId, clinicId);
  }

  book(id: string, clinicId: string, bookedAppointmentId: string) {
    return this.commandService.book(id, clinicId, bookedAppointmentId);
  }

  complete(id: string, clinicId: string) {
    return this.commandService.complete(id, clinicId);
  }

  cancel(id: string, clinicId: string) {
    return this.commandService.cancel(id, clinicId);
  }
}
