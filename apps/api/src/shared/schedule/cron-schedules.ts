import { CronExpression } from '@nestjs/schedule';

/**
 * Central cron expressions for API schedulers. Override per-environment via
 * `AppConfigurationService` when a job must be disabled or retimed without code edits.
 */
export const CRON_SCHEDULES = {
  MEDICAL_CODE_SYNC: '0 4 * * *',
  DOCTOR_REVERIFICATION: '15 4 * * *',
  METRICS_DAILY_ROLLUP: '0 5 * * *',
  DATA_RETENTION: '0 23 * * *',
  EPHEMERAL_STORE_CLEANUP: '0 * * * *',
  BILLING_USAGE_AGGREGATION: '30 0 * * *',
  OVERAGE_BILLING_MONTHLY: '0 2 1 * *',
  OVERAGE_USAGE_THRESHOLDS: '30 * * * *',
  REMINDER_DISPATCH: '*/5 * * * *',
  REMINDER_HOURLY: CronExpression.EVERY_HOUR,
  ENTERPRISE_CONTRACT_TRUEUP: '15 3 * * *',
  PLATFORM_HEALTH_ALERTS: '*/2 * * * *',
  WHATSAPP_DELIVERY_RECONCILIATION: '45 * * * *',
  SUBSCRIPTION_REMINDER_DAILY: CronExpression.EVERY_DAY_AT_9AM,
  SUBSCRIPTION_REMINDER_HOURLY: CronExpression.EVERY_HOUR,
  BILLING_PAYMENT_REMINDERS: CronExpression.EVERY_DAY_AT_1AM,
  METRICS_FLUSH: CronExpression.EVERY_10_MINUTES,
  METRICS_AGGREGATE: CronExpression.EVERY_HOUR,
  // 6-field cron — first field is seconds. Outbox relay polls frequently
  // because consumers expect near-real-time event delivery; the
  // `processedAt, createdAt` index keeps the scan cheap.
  OUTBOX_RELAY: '*/5 * * * * *',
} as const;
