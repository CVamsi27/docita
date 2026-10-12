import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import type {
  LabDirectoryRepository,
  LabRecord,
  CreateLabInput,
  UpdateLabInput,
} from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import type { LabOrderRepository } from '@/domains/clinical/core/repositories/lab-order.repository.interface';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import {
  LabResultReleaseService,
  type ReleaseOutcome,
} from '@/domains/clinical/application/services/lab-result-release.service';

interface AttachResultInput {
  result?: Record<string, unknown>;
  notes?: string;
  uploadedBy: string;
}

/**
 * Actor recorded on an auto-release. Distinguishing it from a named clinician
 * keeps the audit record honest about who initiated the patient notification.
 */
const AUTO_RELEASE_ACTOR = 'SYSTEM:auto-release';

@Injectable()
export class LabWorkflowCommandService {
  constructor(
    @Inject('LabWorkflowRepository')
    private readonly workflowRepository: LabWorkflowRepository,
    @Inject('LabDirectoryRepository')
    private readonly directoryRepository: LabDirectoryRepository,
    @Inject('LabOrderRepository')
    private readonly orderRepository: LabOrderRepository,
    private readonly storageProvider: StorageProvider,
    private readonly releaseService: LabResultReleaseService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async recordSampleCollection(
    id: string,
    clinicId: string,
    notes: string | undefined,
  ): Promise<void> {
    const order = await this.loadOrder(id, clinicId);
    if (order.isTerminal()) {
      throw new BadRequestException(
        'Cannot collect a sample for a completed or cancelled order',
      );
    }
    await this.workflowRepository.markSampleCollected(
      id,
      clinicId,
      notes,
      this.clock.now(),
    );
  }

  async uploadResult(
    id: string,
    clinicId: string,
    file: Express.Multer.File | undefined,
    input: AttachResultInput,
  ): Promise<void> {
    if (!file) throw new BadRequestException('A result file is required');
    const order = await this.loadOrder(id, clinicId);
    if (order.isTerminal()) {
      throw new BadRequestException(
        'Cannot upload a result for a completed or cancelled order',
      );
    }

    const objectKey = await this.storageProvider.upload(file, 'lab-results');

    await this.workflowRepository.attachResult(
      id,
      clinicId,
      {
        resultUrl: objectKey,
        result: input.result,
        notes: input.notes,
        uploadedBy: input.uploadedBy,
      },
      this.clock.now(),
    );

    await this.releaseIfReady(id, clinicId);
  }

  async verifyPayment(
    id: string,
    clinicId: string,
    data: { method: string; reference?: string; verifiedBy: string },
  ): Promise<void> {
    const order = await this.loadOrder(id, clinicId);
    if (order.isTerminal()) {
      throw new BadRequestException(
        'Cannot record payment for a completed or cancelled order',
      );
    }
    await this.workflowRepository.verifyPayment(
      id,
      clinicId,
      data,
      this.clock.now(),
    );

    await this.releaseIfReady(id, clinicId);
  }

  /**
   * Auto-release the result once both a result and payment are recorded. Re-loads
   * the order so the decision reflects the just-committed write, not a stale copy.
   *
   * `SYSTEM` is the releasedBy value for the auto path: a human did not press
   * Release, and the audit trail should say so.
   */
  private async releaseIfReady(id: string, clinicId: string): Promise<void> {
    const refreshed = await this.loadOrder(id, clinicId);
    if (refreshed.canRelease()) {
      await this.releaseService.releaseResult({
        orderId: id,
        clinicId,
        releasedBy: AUTO_RELEASE_ACTOR,
      });
    }
  }

  /**
   * Releases the result to the patient.
   *
   * The authorization and the notification are one effect: the order is claimed
   * before anything is sent, so a concurrent release — including the auto-release
   * above — cannot notify the patient twice. See LabResultReleaseService.
   */
  async releaseResult(
    id: string,
    clinicId: string,
    releasedBy: string,
  ): Promise<ReleaseOutcome> {
    const order = await this.loadOrder(id, clinicId);
    if (order.isTerminal())
      throw new BadRequestException('Lab order has already been finalised');
    if (!order.hasResult())
      throw new BadRequestException(
        'Upload a result before releasing it to the patient',
      );
    if (!order.isPaid())
      throw new BadRequestException(
        'Verify payment before releasing results to the patient',
      );

    return this.releaseService.releaseResult({
      orderId: id,
      clinicId,
      releasedBy,
    });
  }

  async createLab(clinicId: string, data: CreateLabInput): Promise<LabRecord> {
    return await this.directoryRepository.createLab(clinicId, data);
  }

  async updateLab(
    id: string,
    clinicId: string,
    data: UpdateLabInput,
  ): Promise<LabRecord> {
    return await this.directoryRepository.updateLab(id, clinicId, data);
  }

  private async loadOrder(id: string, clinicId: string): Promise<LabOrder> {
    const order = await this.orderRepository.findOrderById(id, clinicId);
    // Defense-in-depth on top of the tenant-scoped repository lookup.
    if (!order || order.clinicId !== clinicId)
      throw new NotFoundException('Lab order not found');
    return order;
  }
}
