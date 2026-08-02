"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, PageHeader } from "@workspace/ui/components";
import { PUBLIC_BOOKING_MAIN_CONTENT_ID, PUBLIC_BOOKING_MOBILE_DOCK_FOOTER_PAD_REVIEW_CLASS, PUBLIC_BOOKING_MOBILE_DOCK_FOOTER_PAD_VISIT_CONTACT_CLASS } from "@/features/public-booking/public-booking-constants";
import { PublicBookingDesktopLayout } from "@/features/public-booking/public-booking-desktop-layout";
import { PublicBookingDoneCard, PublicBookingPageFooter, PublicBookingSkipLink, PublicBookingTopChrome } from "@/features/public-booking/public-booking-components";
import { PublicBookingMobileLayout } from "@/features/public-booking/public-booking-mobile-layout";
import { usePublicBookingIsDesktopLayout } from "@/features/public-booking/use-public-booking-desktop-layout";
import { usePublicBookingPageState } from "@/features/public-booking/use-public-booking-page-state";
import { getFacilityLabel } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";

interface PublicBookingPageProps {
  referralCode: string;
}

export function PublicBookingPage({ referralCode }: PublicBookingPageProps) {
  const { t } = useTranslation("PublicBooking");
  const c = usePublicBookingPageState(referralCode);
  const isDesktopLayout = usePublicBookingIsDesktopLayout();

  const facilityWord = c.clinic
    ? getFacilityLabel(c.clinic.facilityLabel ?? "CLINIC")
    : "Clinic";

  if (c.done) {
    return (
      <AppPageScaffold
        className={cn(
          "app-shell-bg min-h-[100dvh] max-w-full",
          "px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
        )}
        contentClassName="space-y-0 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative">
          <PublicBookingSkipLink />
          <PublicBookingTopChrome />
        </div>
        <main
          id={PUBLIC_BOOKING_MAIN_CONTENT_ID}
          tabIndex={-1}
          className="outline-none"
        >
          <div className="mx-auto mt-6 w-full max-w-md px-3 pb-6 sm:mt-8 sm:px-0">
            {c.clinic ? (
              <PublicBookingDoneCard
                clinicName={c.clinic.name}
                facilityWord={facilityWord}
                phone={c.clinic.phone}
                address={c.clinic.address}
              />
            ) : null}
          </div>
          <PublicBookingPageFooter className="mt-6 max-w-md sm:mt-8" />
        </main>
      </AppPageScaffold>
    );
  }

  const showBookingHoldHeader = !c.clinic;
  const mobileDockActive = !isDesktopLayout && Boolean(c.clinic) && !c.done;
  const mobileFooterDockPadClass =
    mobileDockActive && c.mobileStep === "review"
      ? PUBLIC_BOOKING_MOBILE_DOCK_FOOTER_PAD_REVIEW_CLASS
      : mobileDockActive
        ? PUBLIC_BOOKING_MOBILE_DOCK_FOOTER_PAD_VISIT_CONTACT_CLASS
        : undefined;

  return (
    <AppPageScaffold
      className={cn(
        "app-shell-bg min-h-[100dvh] max-w-full",
        "px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
      )}
      contentClassName={cn(
        "space-y-0 pt-0",
        mobileDockActive
          ? "pb-0"
          : "pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-6 md:pb-8",
      )}
    >
      <div className="relative">
        <PublicBookingSkipLink />
        <PublicBookingTopChrome />
      </div>
      <main
        id={PUBLIC_BOOKING_MAIN_CONTENT_ID}
        tabIndex={-1}
        className="outline-none"
      >
        {showBookingHoldHeader ? (
          <PageHeader
            title={
              c.clinicQuery.isError
                ? t("linkUnavailableTitle")
                : t("requestVisitTitle")
            }
            titleAlign="center"
            className="mt-4 sm:mt-6"
            description={
              c.clinicQuery.isError
                ? t("linkUnavailableDescription")
                : t("fetchingLocation")
            }
          />
        ) : null}
        <DataState
          status={c.pageState}
          loadingMessage={t("loading")}
          errorMessage={t("error")}
          onRetry={() => void c.clinicQuery.refetch()}
          emptyIcon={CalendarIcon}
          emptyTitle={t("unavailableTitle")}
          emptyDescription={t("unavailableDescription")}
        >
          {c.clinic ? (
            isDesktopLayout ? (
              <PublicBookingDesktopLayout c={c} facilityWord={facilityWord} />
            ) : (
              <PublicBookingMobileLayout c={c} facilityWord={facilityWord} />
            )
          ) : null}
        </DataState>
        <PublicBookingPageFooter
          className={cn("mt-2 md:mt-5", mobileFooterDockPadClass)}
        />
      </main>
    </AppPageScaffold>
  );
}
