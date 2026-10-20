import { getPatientFullName } from "@workspace/utils";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatDate } from "@/lib/formatters";
import {
  followUpStatusLabel,
  getFollowUpListQuery,
} from "@/features/follow-ups";
import { useFollowUps } from "@workspace/data-access";
import { Section } from "@workspace/ui/components/layout/section";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import { CalendarCheck } from "lucide-react";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";

export function TodayFollowUpsPanel({ enabled }: { enabled: boolean }) {
  const { t: tFollowUp } = useTranslation("FollowUps");
  const { t } = useTranslation("Dashboard");
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useFollowUps(enabled ? getFollowUpListQuery("today") : null);
  if (!enabled) return null;
  const preview = data.slice(0, 5);

  return (
    <Section
      id="today-follow-ups"
      title={t("followUps.title")}
      description={t("followUps.description")}
      actions={<ViewAllLinkUI to="/follow-ups" text={t("followUps.viewAll")} />}
      className="rounded-none border-x-0 border-t-0 bg-transparent shadow-none"
      contentClassName="p-0"
    >
      <DataState
        className="py-5"
        status={
          isLoading
            ? "loading"
            : isError
              ? "error"
              : preview.length
                ? "success"
                : "empty"
        }
        loadingMessage={t("followUps.loading")}
        errorMessage={t("followUps.error")}
        onRetry={() => {
          void refetch();
        }}
        emptyIcon={CalendarCheck}
        emptyTitle={t("followUps.emptyTitle")}
        emptyDescription={t("followUps.emptyDescription")}
      >
        <ListRowGroup className="rounded-none border-0 bg-transparent">
          {preview.map((followUp) => (
            <Link
              key={followUp.id}
              to={`/patients/${followUp.patientId}`}
              className="block border-b border-border/60 last:border-b-0 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <ListRow
                title={getPatientFullName(followUp.patient, "Patient")}
                meta={followUp.reason}
                time={t("followUps.dueDate", {
                  date: formatDate(followUp.scheduledDate),
                })}
                status={followUp.status}
                statusLabel={followUpStatusLabel(followUp.status, tFollowUp)}
                showChevron={false}
              />
            </Link>
          ))}
        </ListRowGroup>
      </DataState>
    </Section>
  );
}
