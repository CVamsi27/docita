"use client";

import { Building2, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DataState,
  DescriptionList,
  EmptyState,
  MicroLabel,
  Timeline
} from "@workspace/ui/components";
import { formatDate } from "@workspace/utils";
import {
  appointmentTimelineAccent,
  BookingSectionHeader,
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
  formatAppointmentStatus,
} from "@/features/public-booking/public-booking-components";
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
  if (!c.verificationToken || !c.clinic) return null;
  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col transition-colors duration-150",
      )}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          compactHeader
            ? "pb-3 pt-4 sm:pb-4 sm:pt-5"
            : "pb-4 pt-5 sm:pb-6 sm:pt-6",
        )}
      >
        <BookingSectionHeader
          icon={Sparkles}
          micro="Your history here"
          title="Recent visits at this location"
          description={
            <>
              A short summary from your chart at {c.clinic.name} so you can book
              with context.
            </>
          }
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className="bg-background px-4 pt-5 sm:px-6 sm:pt-6">
        <DataState
          status={
            c.contextQuery.isLoading
              ? "loading"
              : c.contextQuery.isError
                ? "error"
                : "success"
          }
          loadingMessage="Loading your visit summary…"
          errorMessage="We could not load your visit summary."
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
                            Patient since
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
                  title="No prior visits on file"
                  description="You are all set to request a new time at this location."
                  className="rounded-[var(--radius-md)] border border-dashed border-border/60 bg-background/80 px-3 py-6 sm:py-7 [&_.ui-section-title]:text-[length:var(--fs-base)]"
                />
              ) : (
                <div className="space-y-3">
                  <MicroLabel as="p" className="mt-0">
                    Recent visits
                  </MicroLabel>
                  <Timeline
                    className="space-y-3"
                    items={c.contextQuery.data.appointments.map((a) => ({
                      id: a.id,
                      title: a.doctorName ?? "Doctor",
                      description: formatDateTime(a.startTime),
                      meta: (
                        <Badge variant="secondary" className="w-fit shrink-0">
                          {formatAppointmentStatus(a.status)}
                        </Badge>
                      ),
                      accent: appointmentTimelineAccent(a.status),
                    }))}
                  />
                </div>
              )}
            </div>
          ) : null}
        </DataState>
      </CardContent>
    </Card>
  );
}
