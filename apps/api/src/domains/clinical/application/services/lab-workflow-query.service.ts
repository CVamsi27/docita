import { Inject, Injectable } from '@nestjs/common';
import type { LabQueueItem } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import type { LabDirectoryRepository, LabRecord } from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';

@Injectable()
export class LabWorkflowQueryService {
  constructor(
    @Inject('LabWorkflowRepository')
    private readonly workflowRepository: LabWorkflowRepository,
    @Inject('LabDirectoryRepository')
    private readonly directoryRepository: LabDirectoryRepository,
  ) {}

  async listQueue(
    clinicId: string,
    params: { labId?: string; status?: string; search?: string },
  ): Promise<LabQueueItem[]> {
    return await this.workflowRepository.findLabQueue(clinicId, params);
  }

  async listLabs(clinicId: string): Promise<LabRecord[]> {
    return await this.directoryRepository.findAllLabs(clinicId);
  }
}
