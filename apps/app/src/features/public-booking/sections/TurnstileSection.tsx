"use client";

import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, MicroLabel } from "@workspace/ui/components";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { TurnstileWidget } from "@workspace/ui/components/form/turnstile-widget";
import { PublicBookingSectionCard } from "@/features/public-booking/public-booking-components";
import type { PublicBookingPageController } from "@/features/public-booking/use-public-booking-page-state";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingTurnstileSection({
  c,
  compactHeader = false,
  layout = "card",
}: {
  c: PublicBookingPageController;
  compactHeader?: boolean;
  layout?: "card" | "inline";
}) {
  const { t } = useTranslation("PublicBooking");

  if (!c.siteKey) return null;

  const widget = (
    <>
      <TurnstileWidget
        siteKey={c.siteKey}
        onToken={(t) => {
          c.setTurnstileToken(t);
          c.setSubmitFieldErrors((prev) => {
            const next = { ...prev };
            delete next.turnstileToken;
            return next;
          });
        }}
        onExpire={() => {
          c.setTurnstileToken(null);
          c.setSubmitFieldErrors((prev) => {
            const next = { ...prev };
            delete next.turnstileToken;
            return next;
          });
        }}
        className="flex w-full justify-center [&_iframe]:max-w-full"
      />
      {c.submitFieldErrors.turnstileToken ? (
        <Alert
          variant="destructive"
          className={cn(
            "rounded-[var(--radius-md)] text-left [&>svg]:top-3.5",
            layout === "inline" ? "mt-3" : "mt-4",
          )}
        >
          <AlertDescription className="text-[length:var(--fs-xs)] leading-snug">
            {c.submitFieldErrors.turnstileToken}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );

  if (layout === "inline") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border/60 bg-card px-4 py-4 shadow-sm">
        <div className="flex gap-3">
          <CategoryAvatar
            icon={<Lock strokeWidth={1.5} />}
            tone="neutral"
            size="md"
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <MicroLabel as="p" className="mt-0">
              {t("turnstile.beforeContinue")}
            </MicroLabel>
            <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
              <span aria-hidden className="font-semibold text-destructive">
                *{" "}
              </span>
              {t("turnstile.inlineNote")}
            </p>
            {widget}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicBookingSectionCard
      icon={Lock}
      micro={t("turnstile.beforeContinue")}
      title={t("turnstile.quickVerification")}
      description={
        <>
          <span aria-hidden className="font-semibold text-destructive">
            *{" "}
          </span>
          {t("turnstile.description")}
        </>
      }
      tone="neutral"
      compactHeader={compactHeader}
      contentClassName="bg-muted/25 px-4 py-5 sm:px-6"
    >
      {widget}
    </PublicBookingSectionCard>
  );
}
