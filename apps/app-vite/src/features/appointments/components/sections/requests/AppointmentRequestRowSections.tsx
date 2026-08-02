import { AlertCircle } from "lucide-react";

export interface AppointmentRequestRowInfoProps {
  patientNameText: string;
  phone: string | null;
  arrivalRelative: string | null;
  reason: string | null | undefined;
  summaryPrimary: string;
  preferredDoctorLabel: string | null;
  notes: string | null | undefined;
  approveError: string | null;
}

export function AppointmentRequestRowInfo({
  patientNameText,
  phone,
  arrivalRelative,
  reason,
  summaryPrimary,
  preferredDoctorLabel,
  notes,
  approveError,
}: AppointmentRequestRowInfoProps) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="truncate text-[length:var(--fs-sm)] font-semibold leading-tight text-foreground">
          {patientNameText}
        </span>
        {phone ? (
          <span className="text-[length:var(--fs-xs)] tabular-nums text-muted-foreground">
            {phone}
          </span>
        ) : null}
        {arrivalRelative ? (
          <span className="text-[length:var(--fs-2xs)] text-muted-foreground/70">
            {arrivalRelative}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-1 text-[length:var(--fs-xs)] text-muted-foreground">
        <span className="text-foreground/80">
          {reason?.trim() ? reason : "No reason"}
        </span>
        <span className="mx-1.5 text-muted-foreground/40">·</span>
        {summaryPrimary}
        {preferredDoctorLabel ? (
          <>
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            {`Dr. ${preferredDoctorLabel}`}
          </>
        ) : null}
        {notes ? (
          <>
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            {notes}
          </>
        ) : null}
      </p>
      {approveError ? (
        <p
          role="alert"
          className="mt-0.5 flex items-center gap-1 text-[length:var(--fs-2xs)] text-destructive"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{approveError}</span>
        </p>
      ) : null}
    </div>
  );
}
