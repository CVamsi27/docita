import type { SupportWhatsAppMessage } from "@workspace/types";

export const THREAD_LIMIT = 100;
export const THREAD_MESSAGES_LIMIT = 500;

export function getThreadLabel(thread: {
  senderName?: string | null;
  threadPhoneNumber: string;
}) {
  return thread.senderName?.trim() || thread.threadPhoneNumber;
}

export function getWhatsAppLink(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

export function formatMessageType(messageType: string) {
  if (!messageType) return "Message";
  return messageType
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStatusBadgeVariant(status: string) {
  if (status === "PENDING") return "secondary";
  if (status === "NEW") return "default";
  if (status === "FAILED") return "destructive";
  return "secondary";
}

export function getMessageAuthor(
  message: Pick<
    SupportWhatsAppMessage,
    "direction" | "senderName" | "senderPhoneNumber"
  >,
) {
  if (message.direction === "OUTBOUND") return "You";
  return message.senderName?.trim() || message.senderPhoneNumber;
}

interface ThreadWithSearchableFields {
  senderName?: string | null;
  threadPhoneNumber: string;
  supportPhoneNumber: string;
  lastMessageBody: string;
  lastMessageType: string;
  lastMessageStatus: string;
  lastMessageDirection: string;
}

export function filterThreads<T extends ThreadWithSearchableFields>(
  threads: T[],
  search: string,
): T[] {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return threads;
  return threads.filter((thread) =>
    [
      thread.senderName,
      thread.threadPhoneNumber,
      thread.supportPhoneNumber,
      thread.lastMessageBody,
      thread.lastMessageType,
      thread.lastMessageStatus,
      thread.lastMessageDirection,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalized)),
  );
}

export const THREADS_LOAD_ERROR_FALLBACK = "We could not load WhatsApp messages right now. Please try again.";
export const MESSAGES_LOAD_ERROR_FALLBACK = "We could not load this conversation right now. Please try again.";
