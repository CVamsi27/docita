import type { QueueAppointmentSummary, QueueTokenType } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatChiefComplaintSummary } from "@workspace/utils";

const MAX_SUMMARY_LEN = 120;

/**
 * The summary reads only the chief complaint, the visit type and the token type.
 * Narrowing to those keeps it usable by both queue projections: `GET /queue`
 * nests the first two under `appointment`, while `GET /queue/today` flattens
 * them to the entry itself.
 */
interface OpdQueueSummarySource {
  tokenType: QueueTokenType;
  appointment: Pick<QueueAppointmentSummary, "chiefComplaint" | "type"> | null;
}

export function truncateOpdSummary(
  text: string,
  maxLen = MAX_SUMMARY_LEN,
): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** One-line context for OPD queue rows: chief complaint, then visit type, then token type. */
export function getOpdQueueSummaryLine(item: OpdQueueSummarySource): string {
  const complaint = formatChiefComplaintSummary(
    item.appointment?.chiefComplaint ?? undefined,
  );
  if (complaint) return truncateOpdSummary(complaint);
  const apptType = item.appointment?.type?.trim();
  if (apptType) return truncateOpdSummary(humanizeUiLabel(apptType));
  return humanizeUiLabel(item.tokenType);
}