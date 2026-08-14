import { Injectable } from '@nestjs/common';
import type {
  CreateAbdmCareContextRequest,
  CreateAbdmConsentRequest,
} from '@workspace/types';
import { AbdmExchangeService } from '@/domains/abdm/application/services/abdm-exchange.service';

@Injectable()
export class AbdmCommandService {
  constructor(private readonly exchange: AbdmExchangeService) {}

  createCareContext(clinicId: string, input: CreateAbdmCareContextRequest) {
    return this.exchange.createCareContext(clinicId, input);
  }

  requestCareContextLink(clinicId: string, careContextId: string) {
    return this.exchange.requestCareContextLink(clinicId, careContextId);
  }

  requestCareContextShare(clinicId: string, careContextId: string) {
    return this.exchange.requestCareContextShare(clinicId, careContextId);
  }

  createConsentRequest(clinicId: string, input: CreateAbdmConsentRequest) {
    return this.exchange.createConsentRequest(clinicId, input);
  }
}
