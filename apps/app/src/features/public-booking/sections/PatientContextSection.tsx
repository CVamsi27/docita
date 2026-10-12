"use client";

import { Building2, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, DataState, DescriptionList, EmptyState, MicroLabel, Timeline } from "@workspace/ui/components";
import { formatDate } from "@workspace/utils";
import { PublicBookingSectionCard } from "@/features/public-booking/public-booking-components";
import { appointmentStatusKey, appointmentTimelineAccent } from "@/features/public-booking/atoms/booking-constants";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingPatientContextSection({
  c,
  compactHeader = false,
}: {
  c: PublicBookingPageController;
  compactHeader?: boolean;
}) {
  const { t } = useTranslation("PublicBooking");

  if (!c.verificationToken || !c.clinic) return null;
  return (
    <PublicBookingSectionCard
      icon={Sparkles}
      micro={t("patientContext.micro")}
      title={t("patientContext.title")}
      description={t("patientContext.description", {
        clinic: c.clinic.name,
      })}
      compactHeader={compactHeader}
      cardClassName="transition-colors duration-150"
      headerClassName={cn(
        compactHeader
          ? "pb-3 pt-4 sm:pb-4 sm:pt-5"
          : "pb-4 pt-5 sm:pb-6 sm:pt-6",
      )}
      contentClassName="bg-background px-4 pt-5 sm:px-6 sm:pt-6"
    >
        <DataState
          status={
            c.contextQuery.isLoading
              ? "loading"
              : c.contextQuery.isError
                ? "error"
                : "success"
          }
          loadingMessage={t("patientContext.loading")}
          errorMessage={t("patientContext.error")}
          onRetry={() => void c.contextQuery.refetch()}
        >
          {c.contextQuery.data ? (
            <div className="space-y-5">
              {c.contextQuery.data.patientSince ? (
                <div className="rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5 shadow-sm">
                  <DescriptionList
                    columns={1}
                    orientation="vertical"
                    items={[
                      {
                        term: (
                          <span className="inline-flex items-center gap-2 font-medium uppercase tracking-wide">
                            <Building2
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            {t("patientContext.patientSince")}
                          </span>
                        ),
                        description: formatDate(
                          new Date(c.contextQuery.data.patientSince),
                          "d MMMM yyyy",
                        ),
                      },
                    ]}
                  />
                </div>
              ) : null}
              {c.contextQuery.data.appointments.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title={t("patientContext.noVisitsTitle")}
                  description={t("patientContext.noVisitsDescription")}
                  className="rounded-[var(--radius-md)] border border-dashed border-border/60 bg-background/80 px-3 py-6 sm:py-7 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                />
              ) : (
                <div className="space-y-3">
                  <MicroLabel as="p" className="mt-0">
                    {t("patientContext.recentVisits")}
                  </MicroLabel>
                  <Timeline
                    className="space-y-3"
                    items={c.contextQuery.data.appointments.map((a) => {
                      const statusKey = appointmentStatusKey(a.status);
                      return {
                        id: a.id,
                        title: a.doctorName ?? t("doctorPicker.nameFallback"),
                        description: formatDateTime(a.startTime),
                        meta: statusKey ? (
                          <Badge variant="secondary" className="w-fit shrink-0">
                            {t(statusKey)}
                          </Badge>
                        ) : null,
                        accent: appointmentTimelineAccent(a.status),
                      };
                    })}
                  />
                </div>
              )}
            </div>
          ) : null}
        </DataState>
    </PublicBookingSectionCard>
  );
}
