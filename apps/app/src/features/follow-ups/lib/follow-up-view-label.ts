import type { FollowUpListView } from "./follow-up-list-query";

/** Resolve a follow-up worklist view to a translated label (FollowUps.viewOptions). */
export function followUpViewLabel(
  view: FollowUpListView,
  t: (key: string) => string,
): string {
  switch (view) {
    case "overdue":
      return t("viewOptions.overdue");
    case "today":
      return t("viewOptions.today");
    case "upcoming":
      return t("viewOptions.upcoming");
    case "all":
      return t("viewOptions.all");
  }
}
