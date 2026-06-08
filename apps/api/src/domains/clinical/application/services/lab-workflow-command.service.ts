import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DATE_FORMATS, formatDate, getPatientFullName } from '@workspace/utils';
import { LabType } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  StorageProvider,
  GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
} from '@/domains/documents/application/ports/storage-provider.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import type {
  LabDirectoryRepository,
  LabRecord,
} from '@/domains/clinical/core/repositories/lab-directory.repository.interface';
import type { LabOrderRepository } from '@/domains/clinical/core/repositories/lab-order.repository.interface';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';

interface AttachResultInput {
  result?: Record<string, unknown>;
  notes?: string;
  uploadedBy: string;
}

@Injectable()
export class LabWorkflowCommandService {
  private readonly logger = new Logger(LabWorkflowCommandService.name);

  constructor(
    @Inject('LabWorkflowRepository')
    private readonly workflowRepository: LabWorkflowRepository,
    @Inject('LabDirectoryRepository')
    private readonly directoryRepository: LabDirectoryRepository,
    @Inject('LabOrderRepository')
    private readonly orderRepository: LabOrderRepository,
    private readonly storageProvider: StorageProvider,
    private readonly sendMessage: SendMessageUseCase,
    private readonly eventEmitter: EventEmitter2,
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

    if (order.hasResult()) {
      await this.releaseResult(id, clinicId);
    }
  }

  async releaseResult(id: string, clinicId: string): Promise<void> {
    const ctx = await this.workflowRepository.findReleaseContext(id, clinicId);
    if (!ctx) throw new NotFoundException('Lab order not found');
    if (ctx.status === 'COMPLETED' || ctx.status === 'CANCELLED')
      throw new BadRequestException('Lab order has already been finalised');
    if (!ctx.resultUrl)
      throw new BadRequestException(
        'Upload a result before releasing it to the patient',
      );
    if (!ctx.paidAt)
      throw new BadRequestException(
        'Verify payment before releasing results to the patient',
      );

    const now = this.clock.now();

    if (ctx.patient.phoneNumber) {
      const resultLink = this.storageProvider.supportsSignedUrls
        ? await this.storageProvider.generateSignedUrl(
            ctx.resultUrl,
            GENERATED_PDF_SIGNED_URL_TTL_SECONDS,
          )
        : ctx.resultUrl;

      try {
        await this.sendMessage.execute({
          clinicId,
          recipientPhone: ctx.patient.phoneNumber,
          templateName: 'lab_result_ready',
          variables: {
            patientName: getPatientFullName(ctx.patient),
            clinicName: ctx.clinicName,
            testName: ctx.testName,
            resultDate: formatDate(now, DATE_FORMATS.DATE_MEDIUM),
            resultLink,
          },
        });
      } catch (error) {
        if (error instanceof ForbiddenException) {
          this.logger.log(
            `Lab result WhatsApp skipped for order ${id}: ${error.message}`,
          );
        } else {
          this.logger.error(
            `Failed to send lab result WhatsApp for order ${id}`,
            error,
          );
        }
      }
    } else {
      this.logger.warn(
        `Lab order ${id} released without WhatsApp: patient has no phone number`,
      );
    }

    await this.workflowRepository.markReleased(id, clinicId, now);

    // allow-direct-emit: fire-and-forget notification after release completes;
    // the result+payment gates are already checked above.
    this.eventEmitter.emit(ApplicationEvents.LAB_RESULT_RELEASED, {
      orderId: id,
      clinicId,
      // jscpd:ignore-start
      patientId: ctx.patient.id,
    });
  }

  async createLab(
    clinicId: string,
    data: {
      name: string;
      type: LabType;
      phone?: string;
      email?: string;
      address?: string;
    },
  ): Promise<LabRecord> {
    return await this.directoryRepository.createLab(clinicId, data);
  }

  async updateLab(
    id: string,
    clinicId: string,
    data: Partial<{
      name: string;
      type: LabType;
      phone: string;
      email: string;
      address: string;
      active: boolean;
    }>,
  ): Promise<LabRecord> {
    return await this.directoryRepository.updateLab(id, clinicId, data);
    // jscpd:ignore-end
  }

  private async loadOrder(id: string, clinicId: string): Promise<LabOrder> {
    const order = await this.orderRepository.findOrderById(id);
    if (!order || order.clinicId !== clinicId)
      throw new NotFoundException('Lab order not found');
    return order;
  }
}
