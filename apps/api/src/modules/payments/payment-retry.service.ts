import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Cron } from '@nestjs/schedule';

export interface PaymentRetryData {
  invoiceId: string;
  paymentSessionId: string;
  clinicId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment Retry Service
 * Handles automatic payment retries with exponential backoff
 * Phase 1: Current implementation using Queue
 * Phase 2: Will add PaymentRetry table and Razorpay integration
 */
@Injectable()
export class PaymentRetryService {
  private readonly logger = new Logger(PaymentRetryService.name);
  private readonly maxRetries = parseInt(
    process.env.PAYMENT_RETRY_MAX_ATTEMPTS || '3',
    10,
  );
  private readonly backoffMultiplier = parseInt(
    process.env.PAYMENT_RETRY_BACKOFF_MULTIPLIER || '24',
    10,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('payment-retry') private readonly paymentRetryQueue: Queue,
  ) {}

  async scheduleRetry(data: PaymentRetryData): Promise<void> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) {
        throw new BadRequestException(`Invoice ${data.invoiceId} not found`);
      }

      this.logger.log(`Payment retry scheduled for invoice ${data.invoiceId}`);

      await this.paymentRetryQueue.add('schedule-retry', data, {
        attempts: 1,
      });
    } catch (error) {
      this.logger.error(`Failed to schedule payment retry: ${error.message}`);
      throw error;
    }
  }

  @Cron('*/30 * * * *')
  async processPendingRetries(): Promise<void> {
    try {
      this.logger.debug('Processing pending payment retries...');

      const unpaidInvoices = await this.prisma.invoice.findMany({
        where: {
          status: 'UNPAID',
        },
        take: 100,
      });

      this.logger.log(`Found ${unpaidInvoices.length} unpaid invoices`);

      for (const invoice of unpaidInvoices) {
        this.attemptPayment(invoice);
      }
    } catch (error) {
      this.logger.error(`Error processing pending retries: ${error.message}`);
    }
  }

  /**
   * Attempt to process a payment (placeholder for Razorpay integration)
   */
  private attemptPayment(invoice: any): boolean {
    try {
      this.logger.debug(`Attempting payment for invoice ${invoice.id}`);
      // Phase 2: This will integrate with Razorpay API
      // For now, return false to simulate retry behavior
      return false;
    } catch (error) {
      this.logger.error(`Payment attempt failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Process a single payment retry (legacy method name)
   */
  processRetry(retryData: PaymentRetryData): void {
    try {
      this.logger.log(
        `Processing payment retry for invoice ${retryData.invoiceId}`,
      );
      // Phase 2 implementation will handle Razorpay API calls
    } catch (error) {
      this.logger.error(`Error processing retry: ${error.message}`);
    }
  }

  /**
   * Calculate backoff hours for exponential retry strategy
   * Retry 1: 1h
   * Retry 2: 24h
   * Retry 3: 72h
   */
  private calculateBackoffHours(retryCount: number): number {
    const baseHour = 1;
    if (retryCount === 1) return baseHour;
    if (retryCount === 2) return this.backoffMultiplier;
    return this.backoffMultiplier * 3;
  }

  /**
   * Get pending retries for a clinic
   */
  getPendingRetries(clinicId: string): any[] {
    try {
      this.logger.debug(`Fetching pending retries for clinic ${clinicId}`);
      return [];
    } catch (error) {
      this.logger.error(`Failed to get pending retries: ${error.message}`);
      throw error;
    }
  }
}
