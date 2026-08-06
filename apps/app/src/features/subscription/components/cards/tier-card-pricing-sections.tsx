import { useTranslation } from "react-i18next";
import { subscriptionGstNotice } from "../../lib/billing-display-messages";
import { formatAmountLocale, formatCountLocale } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";
import { CalendarDays, Check, Stethoscope, Users } from "lucide-react";
import { formatTierPrice, type TierCardProps } from "./tier-card-types";

type TierPricing = NonNullable<TierCardProps["pricing"]>;

function TierCardPriceAmount({
  tier,
  pricing,
  billingCycle,
  currencySymbol,
}: {
  tier: number;
  pricing: TierPricing;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol?: string;
}) {
  const { t } = useTranslation("Subscription.usageMeter");
  if (billingCycle === "YEARLY" && typeof pricing.monthly === "number" && typeof pricing.yearly === "number" && tier < 4) {
    const discount = pricing.monthly * 12 - pricing.yearly;
    return (
      <span>
        {currencySymbol ?? ""}{formatAmountLocale(pricing.yearly)}{t("yearSuffix")}
        <span className="ml-2 shrink-0 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold tabular-nums text-success">
          {t("saveBadge", { amount: `${currencySymbol ?? ""}${formatAmountLocale(discount)}` })}
        </span>
      </span>
    );
  }
  return <>{formatTierPrice(tier, pricing, billingCycle, currencySymbol)}</>;
}

export function TierCardSummaryPricing({
  tier, pricing, billingCycle, currencySymbol,
}: {
  tier: number; pricing: TierPricing; billingCycle: "MONTHLY" | "YEARLY"; currencySymbol?: string; isCurrentTier: boolean;
}) {
  const { t } = useTranslation("Subscription");
  return (
    <div className="mt-5 space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[var(--fs-3xl)] font-semibold leading-none tabular-nums text-foreground">
          <TierCardPriceAmount tier={tier} pricing={pricing} billingCycle={billingCycle} currencySymbol={currencySymbol} />
        </p>
      </div>
      {pricing.monthly !== 0 && pricing.monthly !== "custom" ? (
        <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">{subscriptionGstNotice(t)}</p>
      ) : null}
    </div>
  );
}

export function TierCardKeyHighlights({ highlights, isSummary }: { highlights: string[]; isSummary: boolean }) {
  const { t } = useTranslation("Subscription.usageMeter");
  if (!highlights.length) return null;
  return (
    <ul className={cn("space-y-2 border-t border-border/60", isSummary ? "mt-5 pt-4" : "mt-3 pt-3")} aria-label={t("planHighlightsAriaLabel")}>
      {highlights.slice(0, isSummary ? 4 : 5).map((line) => (
        <li key={line} className="flex gap-2 text-[var(--fs-xs)] leading-snug text-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="text-pretty">{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function TierCardFullPricing({
  tier, pricing, billingCycle, currencySymbol, overageHint, overageItems, limitHighlights, usageHints,
}: {
  tier: number; pricing: TierPricing; billingCycle: "MONTHLY" | "YEARLY"; currencySymbol?: string;
  overageHint?: string; overageItems?: string[]; limitHighlights?: string[]; usageHints?: TierCardProps["usageHints"];
}) {
  const { t: tSub } = useTranslation("Subscription");
  const { t } = useTranslation("Subscription.usageMeter");
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[var(--fs-3xl)] font-semibold leading-[var(--lh-tight)] tabular-nums text-foreground">
            <TierCardPriceAmount tier={tier} pricing={pricing} billingCycle={billingCycle} currencySymbol={currencySymbol} />
          </p>
        </div>
        {pricing.monthly !== 0 && pricing.monthly !== "custom" ? (
          <p className="mt-1 text-[var(--fs-2xs)] leading-snug text-muted-foreground">{subscriptionGstNotice(tSub)}</p>
        ) : null}
        {overageItems?.length || overageHint ? (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("additionalUsageLabel")}</p>
            {overageItems?.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {overageItems.map((item) => (
                  <li key={item} className="rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">{item}</li>
                ))}
              </ul>
            ) : overageHint ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{overageHint}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      {limitHighlights?.length ? <TierCardLimitHighlights limitHighlights={limitHighlights} /> : usageHints ? <TierCardUsageHints usageHints={usageHints} /> : null}
    </div>
  );
}

export function TierCardSummaryOverage({ overageHint, overageItems }: { overageHint?: string; overageItems?: string[] }) {
  const { t } = useTranslation("Subscription.usageMeter");
  if (!overageItems?.length && !overageHint) return null;
  return (
    <div className="mt-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/80" aria-hidden>
          <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        {t("beyondIncludedUsage")}
      </div>
      {overageItems?.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" role="list">
          {overageItems.map((item) => (
            <li key={item} className="inline-flex items-center rounded-full border border-border/60 bg-card px-2 py-0.5 text-[var(--fs-2xs)] font-medium tabular-nums text-foreground/80">{item}</li>
          ))}
        </ul>
      ) : overageHint ? (
        <p className="mt-1.5 text-[var(--fs-xs)] leading-relaxed text-muted-foreground">{overageHint}</p>
      ) : null}
    </div>
  );
}

function TierCardLimitHighlights({ limitHighlights }: { limitHighlights: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm text-foreground">
      {limitHighlights.map((item, index) => {
        const icons = [Users, Stethoscope, CalendarDays, Check];
        const LimitIcon = icons[index] ?? Check;
        return (
          <li key={item} className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
            <LimitIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{item}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TierCardUsageHints({ usageHints }: { usageHints: NonNullable<TierCardProps["usageHints"]> }) {
  const { t } = useTranslation("Subscription.usageMeter");
  return (
    <ul className="grid grid-cols-1 gap-2 text-sm text-foreground">
      {usageHints.patients !== undefined ? (
        <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{usageHints.patients >= 999999 ? t("unlimitedPatients") : t("patientsCount", { value: formatCountLocale(usageHints.patients) })}</span>
        </li>
      ) : null}
      {usageHints.users !== undefined ? (
        <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
          <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{usageHints.users >= 999 ? t("unlimitedUsers") : t("usersCount", { count: usageHints.users })}</span>
        </li>
      ) : null}
      {usageHints.whatsappMsgs !== undefined ? (
        <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{usageHints.whatsappMsgs >= 999999 ? t("unlimitedWaMsgs") : t("waMsgsCount", { value: formatCountLocale(usageHints.whatsappMsgs) })}</span>
        </li>
      ) : null}
    </ul>
  );
}
