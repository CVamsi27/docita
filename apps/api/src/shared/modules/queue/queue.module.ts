/**
 * Queue Module
 *
 * Provides job queue abstraction with two implementations:
 * - InMemoryQueueService: For development (no persistence)
 * - BullMQQueueService: For production (Redis-backed)
 *
 * Usage:
 * 1. Import QueueModule in your feature module
 * 2. Inject IQueueProvider into your service
 * 3. Use queue.enqueue() to add jobs
 * 4. Register handlers with queue.process()
 *
 * Example:
 * @Injectable()
 * export class EmailService {
 *   constructor(
 *     @Inject('queue') private queue: IQueueProvider,
 *   ) {
 *     this.queue.process(JobNames.SEND_EMAIL, this.handleSendEmail.bind(this));
 *   }
 *
 *   async sendEmailAsync(to: string, subject: string) {
 *     await this.queue.enqueue(JobNames.SEND_EMAIL, { to, subject });
 *   }
 *
 *   private async handleSendEmail(job: QueueJob<SendEmailJobData>) {
 *     console.log(`Sending email to ${job.data.to}`);
 *     // Actual email sending logic
 *   }
 * }
 */

import { Module } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';
import { BullMQQueueService } from './bull-mq-queue.service';

const useQueue = process.env.QUEUE_PROVIDER || 'memory';

@Module({
  providers: [
    {
      provide: 'queue',
      useClass: useQueue === 'bull' ? BullMQQueueService : InMemoryQueueService,
    },
    InMemoryQueueService,
    BullMQQueueService,
  ],
  exports: ['queue'],
})
export class QueueModule {}
