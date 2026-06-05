import type { EmailSuppressionReason } from '@workspace/db';

export type ParsedSuppressionEvent = {
  email: string;
  reason: EmailSuppressionReason;
};
