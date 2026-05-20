import {
  Inject,
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { InvoiceStatusEnum } from '@/domains/billing/core/value-objects';
import { IInvoiceRepository } from '@/domains/billing/application/ports/invoice.repository.port';

export interface UpdateInvoiceStatusCommand {
  invoiceId: string;
  targetStatus: InvoiceStatusEnum;
}

@Injectable()
export class UpdateInvoiceStatusUseCase {
  private readonly logger = new Logger(UpdateInvoiceStatusUseCase.name);

  constructor(
    private invoiceRepository: IInvoiceRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(command: UpdateInvoiceStatusCommand): Promise<void> {
    const invoice = await this.invoiceRepository.findById(command.invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${command.invoiceId} not found`);
    }

    const currentStatus = invoice.getStatus();

    // AuditLogged: invoice status update
    this.logger.log({
      action: 'invoice.status-update',
      invoiceId: command.invoiceId,
      targetStatus: command.targetStatus,
    });
    if (!currentStatus.canTransitionTo(command.targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus.value} to ${command.targetStatus}`,
      );
    }

    try {
      invoice.transitionTo(command.targetStatus, this.clock.now());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid invoice transition';
      throw new BadRequestException(message);
    }

    await this.invoiceRepository.update(invoice);
  }
}
