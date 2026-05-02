import type { ListFollowUpsQuery } from "@workspace/types";

export type FollowUpListView = "overdue" | "today" | "upcoming" | "all";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Shared list query for `/follow-ups` and dashboard Today panel. */
export function getFollowUpListQuery(
  view: FollowUpListView,
): ListFollowUpsQuery {
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  if (view === "overdue") {
    return {
      status: "PENDING,REMINDER_SENT",
      from: new Date(0).toISOString(),
      to: today.toISOString(),
      limit: 100,
    };
  }
  if (view === "today") {
    return {
      status: "PENDING,REMINDER_SENT",
      from: today.toISOString(),
      to: tomorrow.toISOString(),
      limit: 100,
    };
  }
  if (view === "upcoming") {
    return {
      status: "PENDING,REMINDER_SENT",
      from: tomorrow.toISOString(),
      to: addDays(today, 30).toISOString(),
      limit: 100,
    };
  }
  return { status: "PENDING,REMINDER_SENT", limit: 100 };
}
