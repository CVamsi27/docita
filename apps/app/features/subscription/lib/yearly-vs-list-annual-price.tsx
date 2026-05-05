/**
 * For annual billing, show 12× list monthly (undiscounted) struck through, an em dash,
 * then the discounted annual amount when the annual price is below list.
 */
export function YearlyVsListAnnualPrice({
  monthlyListPrice,
  discountedAnnualPrice,
  formatMoney,
  suffix = "/yr",
}: {
  monthlyListPrice: number;
  discountedAnnualPrice: number;
  formatMoney: (amount: number) => string;
  suffix?: string;
}) {
  const listAnnual = monthlyListPrice * 12;
  if (listAnnual <= discountedAnnualPrice) {
    return (
      <span className="tabular-nums">
        {formatMoney(discountedAnnualPrice)}
        {suffix}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 tabular-nums">
      <span className="text-muted-foreground line-through decoration-muted-foreground/70">
        {formatMoney(listAnnual)}
      </span>
      <span className="text-muted-foreground" aria-hidden>
        —
      </span>
      <span className="font-semibold text-foreground">
        {formatMoney(discountedAnnualPrice)}
        {suffix}
      </span>
    </span>
  );
}
