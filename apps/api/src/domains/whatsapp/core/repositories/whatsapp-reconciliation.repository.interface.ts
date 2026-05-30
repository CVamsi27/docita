import { WhatsappLogStatus } from '@workspace/db';

/**
 * Aggregated count of outbound WhatsApp logs still sitting in a non-final
 * delivery status, grouped by clinic and status.
 */
export type StaleWhatsappLogGroup = {
  clinicId: string;
  status: WhatsappLogStatus;
  count: number;
  oldestCreatedAt: Date;
};

export const WHATSAPP_RECONCILIATION_REPOSITORY_TOKEN = Symbol(
  'WhatsappReconciliationRepository',
);

export interface IWhatsappReconciliationRepository {
  /**
   * Groups outbound WhatsApp logs still in a non-final status (QUEUED or SENT)
   * that were created before `createdBefore`. Read-only.
   */
  findStaleNonFinal(createdBefore: Date): Promise<StaleWhatsappLogGroup[]>;
}
