import { FALLBACK_PRICING_CONFIG, formatTierPrice } from "@/lib/landing-data";

const starterMonthly = FALLBACK_PRICING_CONFIG.tiers.find(
  (t) => t.id === "STARTER",
)?.pricing.monthly;
const starterPrice =
  typeof starterMonthly === "number"
    ? formatTierPrice(
        starterMonthly,
        FALLBACK_PRICING_CONFIG.currency.symbol,
      )
    : `${FALLBACK_PRICING_CONFIG.currency.symbol}499`;

const setupFrom = formatTierPrice(
  4999,
  FALLBACK_PRICING_CONFIG.currency.symbol,
);

const outcomes = [
  {
    label: "Guided setup",
    value: `From ${setupFrom}`,
    detail: "Scoped to your clinic, import, and training needs.",
  },
  {
    label: "Software entry",
    value: `${starterPrice}/mo`,
    detail: "Starter tier for digitizing core OPD workflows.",
  },
  {
    label: "India-hosted backend",
    value: "Mumbai region",
    detail: "Production API and database co-located for residency.",
  },
  {
    label: "Excel-first path",
    value: "CSV in / out",
    detail: "Bring patient lists and exports without a parallel stack.",
  },
] as const;

export function OutcomesStripSection() {
  return (
    <section
      className="landing-outcomes-strip landing-section landing-section-compact border-y border-border/60 bg-muted"
      aria-labelledby="outcomes-strip-heading"
    >
      <div className="ui-page-shell">
        <h2
          id="outcomes-strip-heading"
          className="sr-only"
        >
          Outcomes and operating facts
        </h2>
        <p className="mb-8 text-center font-mono text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Operating facts
        </p>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((item) => (
            <li
              key={item.label}
              className="rounded-2xl border border-border/70 bg-card px-5 py-5 text-center shadow-sm"
            >
              <p className="font-mono text-[var(--fs-2xs)] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {item.value}
              </p>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
