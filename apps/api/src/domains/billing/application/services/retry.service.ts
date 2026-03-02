import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus } from '@workspace/db';
import { runWithTenant } from '@/common/middleware/tenant.middleware';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/invoice.repository';

export interface PaymentRetryData {
  invoiceId: string;
  paymentSessionId: string;
  clinicId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly audit: AuditService,
    private configService: AppConfigService,
    @InjectQueue('payment-retry') private readonly paymentRetryQueue: Queue,
  ) {}

  async scheduleRetry(data: PaymentRetryData): Promise<void> {
    try {
      const invoice = await this.invoiceRepository.findById(data.invoiceId);

      if (!invoice) {
        throw new BadRequestException(`Invoice ${data.invoiceId} not found`);
      }

      this.logger.log(`Payment retry scheduled for invoice ${data.invoiceId}`);

      await this.paymentRetryQueue.add('schedule-retry', data, {
        attempts: 1,
      });
    } catch (error) {
      this.logger.error(
        `Failed to schedule payment retry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Cron('*/30 * * * *')
  async processPendingRetries(): Promise<void> {
    await runWithTenant({ bypassed: true }, async () => {
      try {
        this.logger.debug('Processing pending payment retries...');

        const result = await this.invoiceRepository.findAll({
          clinicId: '',
          status: InvoiceStatus.PENDING,
          limit: 100,
        });

        this.logger.log(`Found ${result.items.length} unpaid invoices`);

        for (const invoice of result.items) {
          this.attemptPayment(invoice.id);
        }
      } catch (error) {
        this.logger.error(
          `Error processing pending retries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  private attemptPayment(invoiceId: string): void {
    this.logger.debug(`Attempting payment for invoice ${invoiceId}`);
  }
}
