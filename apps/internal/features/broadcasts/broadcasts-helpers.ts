import { DATE_FORMATS, formatDate, getUserFacingErrorMessage } from "@workspace/utils";

export const BROADCAST_LIST_LIMIT = 50;

export const CSV_NO_VALID_PHONES_ERROR =
  "No valid phone numbers were found in the CSV. Check the file and try again.";

export const CSV_UNREADABLE_ERROR = "We could not read this CSV file.";

export function buildDefaultTitle(label: string): string {
  return `${label} — ${formatDate(new Date(), DATE_FORMATS.DATETIME_LONG)}`;
}

export function buildRecipientPayload(
  recipients: { phoneNumber: string; name?: string }[],
): { phoneNumber: string; name?: string; variables?: { name: string } }[] {
  return recipients.map((recipient) => ({
    phoneNumber: recipient.phoneNumber,
    name: recipient.name,
    variables: recipient.name ? { name: recipient.name } : undefined,
  }));
}

export function getCsvReadError(error: unknown): string {
  return error instanceof Error ? error.message : CSV_UNREADABLE_ERROR;
}

export function getBroadcastsListStatus(
  query: { isLoading: boolean; isError: boolean },
): "loading" | "error" | "success" {
  if (query.isLoading) return "loading";
  if (query.isError) return "error";
  return "success";
}

export function getBroadcastsErrorMessage(
  error: unknown,
  context: "load" | "save",
  fallback: string,
): string {
  return getUserFacingErrorMessage(error, { context, fallback });
}
