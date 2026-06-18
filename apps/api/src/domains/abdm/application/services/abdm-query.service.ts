import { Injectable } from '@nestjs/common';
import { AbdmExchangeService } from '@/domains/abdm/application/services/abdm-exchange.service';

@Injectable()
export class AbdmQueryService {
  constructor(private readonly exchange: AbdmExchangeService) {}

  listCareContexts(clinicId: string, patientId?: string) {
    return this.exchange.listCareContexts(clinicId, patientId);
  }

  getOpsInbox(clinicId: string) {
    return this.exchange.getOpsInbox(clinicId);
  }

  listExternalRecords(clinicId: string, patientId?: string) {
    return this.exchange.listExternalRecords(clinicId, patientId);
  }
}
