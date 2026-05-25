import { Injectable } from '@nestjs/common';
import { QueueCommandService } from './queue-command.service';
import { QueueQueryService } from './queue-query.service';

/**
 * Facade — delegates clinic queue reads and mutations to query/command services.
 */
@Injectable()
export class QueueService {
  constructor(
    private readonly queryService: QueueQueryService,
    private readonly commandService: QueueCommandService,
  ) {}

  getQueue(clinicId: string, doctorId?: string, search?: string) {
    return this.queryService.getQueue(clinicId, doctorId, search);
  }

  getTodayQueue(clinicId: string, doctorId?: string, search?: string) {
    return this.queryService.getTodayQueue(clinicId, doctorId, search);
  }

  checkIn(clinicId: string, appointmentId: string) {
    return this.commandService.checkIn(clinicId, appointmentId);
  }

  callPatient(clinicId: string, queueId: string) {
    return this.commandService.callPatient(clinicId, queueId);
  }

  completePatient(clinicId: string, queueId: string) {
    return this.commandService.completePatient(clinicId, queueId);
  }

  resetQueue(clinicId: string) {
    return this.commandService.resetQueue(clinicId);
  }
}
