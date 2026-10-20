import { useTranslation } from "react-i18next";
import { cn } from "@workspace/ui/lib/utils";
import { getStatusColor } from "@workspace/ui/components/indicators/status-badge";
import { APPOINTMENT_STATUS_LABELS } from "@workspace/types";
import type { AppointmentSummary } from "@/features/appointments/lib/appointments-page-helpers";

interface AppointmentSummaryBarProps {
  summary: AppointmentSummary;
}

/**
 * Status counts for the filtered appointment list. Row labels resolve through
 * `Appointments:summaryBar.status.*` with `APPOINTMENT_STATUS_LABELS` as the
 * fallback, so locales get translated copy while English stays pinned to the
 * one canonical map — a missing key degrades to the English label instead of
 * rendering a raw key.
 */
export function AppointmentSummaryBar({ summary }: AppointmentSummaryBarProps) {
  const { t } = useTranslation("Appointments");
  if (summary.total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs">
      <span className="font-semibold text-foreground">
        {summary.total} {t("summaryBar.appointment", { count: summary.total })}
      </span>
      {summary.breakdown.length > 0 ? (
        <span className="hidden text-muted-foreground sm:inline" aria-hidden>
          ·
        </span>
      ) : null}
      <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0">
        {summary.breakdown.map((item) => {
          const label = t(`summaryBar.status.${item.appointmentStatus}`, {
            defaultValue: APPOINTMENT_STATUS_LABELS[item.appointmentStatus],
          });
          return (
            <li
              key={item.appointmentStatus}
              className="inline-flex items-center gap-1.5 text-muted-foreground"
            >
              <span
                className={cn(
                  "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                  getStatusColor(item.tone),
                )}
                aria-hidden
              />
              <span>
                {label}{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {item.value}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}