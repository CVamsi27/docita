import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AuditService, AuditLogData } from './audit.service';

@Processor('audit')
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(private readonly auditService: AuditService) {}

  @Process('log-action')
  async handleLogAction(job: Job<AuditLogData>) {
    this.logger.debug(`Processing audit log job ${job.id}`);
    try {
      await this.auditService.createAuditLog(job.data);
    } catch (error) {
      this.logger.error(
        `Failed to process audit log job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
