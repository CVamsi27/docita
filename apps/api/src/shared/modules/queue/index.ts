export { IQueueProvider, QueueJob, QueueJobOptions, QueueStats } from './queue.interface';
export { JobNames } from './queue.interface';
export {
  SendEmailJobData,
  SendSmsJobData,
  SendWhatsAppJobData,
  GeneratePdfJobData,
  SendAppointmentReminderJobData,
} from './queue.interface';
export { InMemoryQueueService } from './in-memory-queue.service';
export { BullMQQueueService } from './bull-mq-queue.service';
export { QueueModule } from './queue.module';
