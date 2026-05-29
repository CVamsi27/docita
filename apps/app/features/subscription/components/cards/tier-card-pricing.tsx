import { Tier } from "@/lib/subscription/tier-access";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";
import { formatAmountLocale, formatCountLocale } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";
import {
  CalendarDays,
  Check,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  LIMIT_ICONS,
  formatTierPrice,
  type TierCardProps,
} from "./tier-card-types";

type TierPricing = NonNullable<TierCardProps["pricing"]>;

export function TierCardPriceAmount({
  tier,
  pricing,
  billingCycle,
  currencySymbol,
}: {
  tier: Tier;
  pricing: TierPricing;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol?: string;
}) {
  if (
    billingCycle === "YEARLY" &&
    typeof pricing.monthly === "number" &&
    typeof pricing.yearly === "number" &&
    tier !== Tier.ENTERPRISE
  ) {
    return (
      <YearlyVsListAnnualPrice
        monthlyListPrice={pricing.monthly}
        discountedAnnualPrice={pricing.yearly}
        formatMoney={(amount) =>
          `${currencySymbol ?? ""}${formatAmountLocale(amount)}`
        }
      />
    );
  }

  return (
    <>{formatTierPrice(tier, pricing, billingCycle, currencySymbol)}</>
  );
}

export function TierCardSummaryPricing({
  tier,
  pricing,
  billingCycle,
  currencySymbol,
  isCurrentTier,
}: {
  tier: Tier;
  pricing: TierPricing;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol?: string;
  isCurrentTier: boolean;
}) {
  const showYearlySavings =
    !isCurrentTier &&
    billingCycle === "YEARLY" &&
    typeof pricing.monthly === "number" &&
    typeof pricing.yearly === "number" &&
    pricing.monthly > 0 &&
    pricing.monthly * 12 > pricing.yearly;

  return (
    <div className="mt-5 space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[var(--fs-3xl)] font-semibold leading-none tabular-nums text-foreground">
          <TierCardPriceAmount
            tier={tier}
            pricing={pricing}
            billingCycle={billingCycle}
            currencySymbol={currencySymbol}
          />
        </p>
        {showYearlySavings &&
        typeof pricing.monthly === "number" &&
        typeof pricing.yearly === "number" ? (
          <span className="shrink-0 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold tabular-nums text-success">
            Save {currencySymbol ?? ""}
            {formatAmountLocale(pricing.monthly * 12 - pricing.yearly)}
          </span>
        ) : null}
      </div>
      {pricing.monthly !== 0 && pricing.monthly !== "custom" ? (
        <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
          {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
        </p>
      ) : null}
    </div>
  );
}

export function TierCardLimitHighlights({
  limitHighlights,
}: {
  limitHighlights: string[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm text-foreground">
      {limitHighlights.map((item, index) => {
        const LimitIcon = LIMIT_ICONS[index] ?? Check;

        return (
          <li
            key={item}
            className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight"
          >
            <LimitIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{item}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function TierCardUsageHints({
  usageHints,
}: {
  usageHints: NonNullable<TierCardProps["usageHints"]>;
}) {
  return (
    <ul className="grid grid-cols-1 gap-2 text-sm text-foreground">
      {usageHints.patients !== undefined ? (
        <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            {usageHints.patients >= 999999
              ? "Unlimited patients"
              : `${formatCountLocale(usageHints.patients)} patients`}
          </span>
        </li>
      ) : null}
      {usageHints.users !== undefined ? (
        <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
          <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            {usageHints.users >= 999
              ? "Unlimited users"
              : `Up to ${usageHints.users} users`}
          </span>
        </li>
      ) : null}
      {usageHints.whatsappMsgs !== undefined ? (
        <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            {usageHints.whatsappMsgs >= 999999
              ? "Unlimited WA msgs"
              : `${formatCountLocale(usageHints.whatsappMsgs)} WA msgs/mo`}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

export function TierCardFullPricing({
  tier,
  pricing,
  billingCycle,
  currencySymbol,
  overageHint,
  overageItems,
  limitHighlights,
  usageHints,
}: {
  tier: Tier;
  pricing: TierPricing;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol?: string;
  overageHint?: string;
  overageItems?: string[];
  limitHighlights?: string[];
  usageHints?: TierCardProps["usageHints"];
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[var(--fs-3xl)] font-semibold leading-[var(--lh-tight)] tabular-nums text-foreground">
            <TierCardPriceAmount
              tier={tier}
              pricing={pricing}
              billingCycle={billingCycle}
              currencySymbol={currencySymbol}
            />
          </p>
        </div>
        {pricing.monthly !== 0 && pricing.monthly !== "custom" ? (
          <p className="mt-1 text-[var(--fs-2xs)] leading-snug text-muted-foreground">
            {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
          </p>
        ) : null}
        {overageItems?.length || overageHint ? (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Additional usage
            </p>
            {overageItems?.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {overageItems.map((item) => (
                  <li
                    key={item}
                    className="rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {overageHint}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {limitHighlights?.length ? (
        <TierCardLimitHighlights limitHighlights={limitHighlights} />
      ) : usageHints ? (
        <TierCardUsageHints usageHints={usageHints} />
      ) : null}
    </div>
  );
}

export function TierCardSummaryOverage({
  overageHint,
  overageItems,
}: {
  overageHint?: string;
  overageItems?: string[];
}) {
  if (!overageItems?.length && !overageHint) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/80"
          aria-hidden
        >
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Beyond included usage
      </div>
      {overageItems?.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" role="list">
          {overageItems.map((item) => (
            <li
              key={item}
              className="inline-flex items-center rounded-full border border-border/60 bg-card px-2 py-0.5 text-[var(--fs-2xs)] font-medium tabular-nums text-foreground/80"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : overageHint ? (
        <p className="mt-1.5 text-[var(--fs-xs)] leading-relaxed text-muted-foreground">
          {overageHint}
        </p>
      ) : null}
    </div>
  );
}

export function TierCardKeyHighlights({
  highlights,
  isSummary,
}: {
  highlights: string[];
  isSummary: boolean;
}) {
  if (!highlights.length) {
    return null;
  }

  return (
    <ul
      className={cn(
        "space-y-2 border-t border-border/60",
        isSummary ? "mt-5 pt-4" : "mt-3 pt-3",
      )}
      aria-label="Plan highlights"
    >
      {highlights.slice(0, isSummary ? 4 : 5).map((line) => (
        <li
          key={line}
          className="flex gap-2 text-[var(--fs-xs)] leading-snug text-foreground"
        >
          <Check
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
            aria-hidden
          />
          <span className="text-pretty">{line}</span>
        </li>
      ))}
    </ul>
  );
}
