import { useClinicCurrency } from "@/hooks/use-clinic-currency";

interface InvoiceTotalSectionProps {
  total: number;
}

export function InvoiceTotalSection({ total }: InvoiceTotalSectionProps) {
  const { formatCurrency } = useClinicCurrency();

  return (
    <div className="flex items-center justify-end gap-4 p-4 bg-muted/30 rounded-lg">
      <span className="text-lg font-medium">Total:</span>
      <span className="ui-section-title text-[var(--fs-2xl)] text-primary tabular-nums">
        {formatCurrency(total)}
      </span>
    </div>
  );
}
