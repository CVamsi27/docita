import { useEffect, useState } from "react";
import {
  Badge,
  DataState,
} from "@workspace/ui/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { MessageSquareText } from "lucide-react";
import { formatDateTime, enIN } from "@workspace/utils";
import { apiGet } from "@/lib/api/api-client";

interface MessageLogEntry {
  id: string;
  kind: "WELCOME" | "RESEND_WELCOME" | "PAYOUT_NOTICE";
  channel: string;
  template: string;
  status: "QUEUED" | "SENT" | "FAILED";
  externalId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

const KIND_LABELS: Record<MessageLogEntry["kind"], string> = {
  WELCOME: "Welcome",
  RESEND_WELCOME: "Welcome (resend)",
  PAYOUT_NOTICE: "Payout notice",
};

interface ReferrerMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerId: string | null;
  referrerName: string;
}

/**
 * Operator view of a partner's message audit trail (welcome sends and
 * resends). Reads `GET /api/internal/referrers/:id/messages` when opened.
 */
export function ReferrerMessagesDialog({
  open,
  onOpenChange,
  referrerId,
  referrerName,
}: ReferrerMessagesDialogProps) {
  const [messages, setMessages] = useState<MessageLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!open || !referrerId) return;
    let cancelled = false;
    setLoading(true);
    setHasError(false);
    void (async () => {
      try {
        const data = await apiGet<MessageLogEntry[]>(
          `/api/internal/referrers/${referrerId}/messages`,
        );
        if (!cancelled) setMessages(data);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, referrerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" /> Messages — {referrerName}
          </DialogTitle>
          <DialogDescription>
            WhatsApp delivery audit trail for this partner
          </DialogDescription>
        </DialogHeader>
        <DataState
          status={loading ? "loading" : hasError ? "error" : "success"}
          loadingMessage="Loading messages…"
          errorMessage="We could not load the message log. Please try again."
        >
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages sent yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {KIND_LABELS[entry.kind] ?? entry.kind}
                    </span>
                    <Badge
                      variant={
                        entry.status === "FAILED"
                          ? "destructive"
                          : entry.status === "SENT"
                            ? "default"
                            : "outline"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {entry.channel} · {entry.template}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.sentAt
                      ? `Sent ${formatDateTime(entry.sentAt, undefined, { locale: enIN })}`
                      : `Created ${formatDateTime(entry.createdAt, undefined, { locale: enIN })}`}
                  </p>
                  {entry.errorMessage && (
                    <p className="mt-1 text-xs text-destructive">
                      {entry.errorMessage}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </DialogContent>
    </Dialog>
  );
}
