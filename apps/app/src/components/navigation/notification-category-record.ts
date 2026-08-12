import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryDef,
  type NotificationCategoryId,
} from "./notification-href";

export function buildNotificationCategoryRecord<T>(
  buildValue: (category: NotificationCategoryDef) => T,
): Record<NotificationCategoryId, T> {
  // `Object.assign`'s variadic overload (spread argument) returns the merged
  // object as `any`, so the return annotation narrows without an `as`. The
  // completeness claim rests on `NOTIFICATION_CATEGORIES` (`as const`) being
  // the single source of truth for the key set: the mapped return type forces
  // every `NotificationCategoryId` to be produced at runtime.
  return Object.assign(
    {},
    ...NOTIFICATION_CATEGORIES.map((category) => ({
      [category.id]: buildValue(category),
    })),
  );
}
