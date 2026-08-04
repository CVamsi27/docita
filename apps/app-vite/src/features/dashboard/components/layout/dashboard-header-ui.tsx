import type { ReactNode } from "react";
import { Stethoscope } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { ClinicReferralShareToolbar } from "./clinic-referral-share-toolbar";

interface DashboardHeaderUIProps {
  userName: string;
  greeting: string;
  clinicCode?: string | null;
  clinicName?: string;
  /** Public online booking page URL for this clinic (e.g. for Google Maps). */
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode?: boolean;
  summary?: string;
  /** Extra controls (e.g. refresh) rendered before clinic/search actions. */
  headerActions?: ReactNode;
}

export function DashboardHeaderUI({
  userName,
  greeting,
  clinicCode,
  clinicName,
  publicOnlineBookingUrl,
  canQuickShareClinicCode = false,
  summary,
  headerActions,
}: DashboardHeaderUIProps) {
  return (
    <header className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:h-12 sm:w-12"
            aria-hidden
          >
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="ui-copy-stack min-w-0">
            <p className="ui-helper-text">
              {formatDate(new Date(), "EEEE, MMMM d")}
            </p>
            <h1 className="ui-page-title">
              {greeting}, {userName}!
            </h1>
            {summary ? (
              <p className="ui-page-subtitle max-w-2xl">{summary}</p>
            ) : null}
          </div>
        </div>

        <ClinicReferralShareToolbar
          clinicCode={clinicCode}
          clinicName={clinicName}
          publicOnlineBookingUrl={publicOnlineBookingUrl}
          canQuickShareClinicCode={canQuickShareClinicCode}
          leadingActions={headerActions}
        />
      </div>
    </header>
  );
}
