import { isToday, isYesterday } from "@workspace/utils";
import type { StaffNotification } from "@workspace/data-access";

export function categorize(notifications: StaffNotification[]) {
  const today: StaffNotification[] = [];
  const yesterday: StaffNotification[] = [];
  const older: StaffNotification[] = [];
  for (const n of notifications) {
    if (isToday(n.createdAt)) today.push(n);
    else if (isYesterday(n.createdAt)) yesterday.push(n);
    else older.push(n);
// jscpd:ignore-start
  }
  return { today, yesterday, older };
}

export function filterByCategory(
  notifications: StaffNotification[],
  types: readonly string[] | undefined,
): StaffNotification[] {
  if (!types) return notifications;
  const allowed = new Set(types);
  return notifications.filter((n) => allowed.has(String(n.type)));
}
// jscpd:ignore-end
