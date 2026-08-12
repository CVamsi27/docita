import type { QueueItem } from "@workspace/data-access";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatChiefComplaintSummary } from "@workspace/utils";

const MAX_SUMMARY_LEN = 120;

export function truncateOpdSummary(
  text: string,
  maxLen = MAX_SUMMARY_LEN,
): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** One-line context for OPD queue rows: chief complaint, then visit type, then token type. */
export function getOpdQueueSummaryLine(item: QueueItem): string {
  const complaint = formatChiefComplaintSummary(item.appointment?.chiefComplaint);
  if (complaint) return truncateOpdSummary(complaint);
  const apptType = item.appointment?.type?.trim();
  if (apptType) return truncateOpdSummary(humanizeUiLabel(apptType));
  return humanizeUiLabel(item.tokenType);
}
