import { Inject, Injectable } from '@nestjs/common';
import {
  ILabRepository,
  LabQueueItem,
  LabRecord,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';

@Injectable()
export class LabWorkflowQueryService {
  constructor(
    @Inject('ILabRepository')
    private readonly labRepository: ILabRepository,
  ) {}

  async listQueue(
    clinicId: string,
    params: { labId?: string; status?: string; search?: string },
  ): Promise<LabQueueItem[]> {
    return await this.labRepository.findLabQueue(clinicId, params);
  }

  async listLabs(clinicId: string): Promise<LabRecord[]> {
    return await this.labRepository.findAllLabs(clinicId);
  }
}
