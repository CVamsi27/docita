import type { StaffNotificationType } from '@workspace/db';

export const NOTIFICATION_RECIPIENT_RESOLVER_TOKEN =
  'INotificationRecipientResolver';

export interface NotificationRecipient {
  id: string;
  phoneNumber: string | null;
}

export interface INotificationRecipientResolver {
  resolveStaffRecipients(
    clinicId: string,
    doctorId: string | undefined,
    type: StaffNotificationType,
  ): Promise<NotificationRecipient[]>;
}
