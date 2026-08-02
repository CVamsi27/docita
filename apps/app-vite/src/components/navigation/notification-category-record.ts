import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryDef,
  type NotificationCategoryId,
} from "./notification-href";

/** check-as-cast-density: allow-file — partial category map build must become a full `Record`. */
export function buildNotificationCategoryRecord<T>(
  buildValue: (category: NotificationCategoryDef) => T,
): Record<NotificationCategoryId, T> {
  const record: Partial<Record<NotificationCategoryId, T>> = {};
  for (const category of NOTIFICATION_CATEGORIES) {
    record[category.id] = buildValue(category);
  }
  return record as Record<NotificationCategoryId, T>;
}
