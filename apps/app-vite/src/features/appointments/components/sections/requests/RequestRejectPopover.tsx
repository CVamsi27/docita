import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@workspace/ui/components/form/form-primitives";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components";
import type { AppointmentRequestResponse } from "@workspace/types";
import { REJECT_REASON_CUSTOM, REJECT_REASON_OPTIONS } from "./request-row-helpers";

interface RequestRejectPopoverProps {
  request: AppointmentRequestResponse;
  rejectReason: string;
  rejectCustom: string;
  isMutating: boolean;
  canSubmitReject: boolean;
  setRejectReasonByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setRejectCustomByRequest: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onReject: (request: AppointmentRequestResponse) => void | Promise<void>;
}

export function RequestRejectPopover({
  request,
  rejectReason,
  rejectCustom,
  isMutating,
  canSubmitReject,
  setRejectReasonByRequest,
  setRejectCustomByRequest,
  onReject,
}: RequestRejectPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Reject"
          className="h-8 gap-1 px-2 text-[length:var(--fs-xs)] text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Reject</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,20rem)] space-y-2.5 p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="space-y-1">
          <label
            htmlFor={`apr-reject-reason-${request.id}`}
            className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
          >
            Reason
          </label>
          <Select
            value={rejectReason}
            onValueChange={(value) =>
              setRejectReasonByRequest((prev) => ({
                ...prev,
                [request.id]: value,
              }))
            }
          >
            <SelectTrigger
              id={`apr-reject-reason-${request.id}`}
              size="sm"
              className="h-8 w-full text-[length:var(--fs-xs)]"
            >
              <SelectValue placeholder="Choose a reason…" />
            </SelectTrigger>
            <SelectContent>
              {REJECT_REASON_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rejectReason === REJECT_REASON_CUSTOM ? (
          <div className="space-y-1">
            <label
              htmlFor={`apr-reject-${request.id}`}
              className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Message for patient
            </label>
            <Textarea
              id={`apr-reject-${request.id}`}
              value={rejectCustom}
              onChange={(event) =>
                setRejectCustomByRequest((prev) => ({
                  ...prev,
                  [request.id]: event.target.value,
                }))
              }
              placeholder="Write a short message…"
              rows={3}
              className="min-h-[60px] resize-y text-[length:var(--fs-xs)]"
            />
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-1 px-3 text-[length:var(--fs-xs)]"
            disabled={isMutating || !canSubmitReject}
            onClick={() => void onReject(request)}
          >
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Reject request
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
