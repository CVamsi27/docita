import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, X } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { useActiveDelays, useClearDoctorDelay } from "@workspace/data-access";
import type { DoctorDelayResponse } from "@workspace/data-access";

interface DoctorDelayBannerProps {
  /** When provided, only shows delays for this doctor. */
  filterDoctorId?: string;
}

function DelayChip({
  delay,
  onClear,
  clearing,
}: {
  delay: DoctorDelayResponse;
  onClear: (id: string) => void;
  clearing: boolean;
}) {
  const { t } = useTranslation("Appointments");
  return (
    <div className="surface-warning flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
      <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span className="text-warning">
        <span className="font-medium">~{delay.delayMinutes} {t("delayBanner.minutes")}</span>
        {delay.reason ? (
          <span className="opacity-80"> · {delay.reason}</span>
        ) : null}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("delayBanner.clearDelay")}
        disabled={clearing}
        onClick={() => onClear(delay.id)}
        className="ml-1 rounded-full p-0.5 text-warning hover:bg-warning/20"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function DoctorDelayBanner({ filterDoctorId }: DoctorDelayBannerProps) {
  const { data: delays } = useActiveDelays();
  const { mutate: clearDelay, isPending } = useClearDoctorDelay();
  const [clearingId, setClearingId] = useState<string | null>(null);

  const visible = (delays ?? []).filter(
    (d) => !filterDoctorId || d.doctorId === filterDoctorId,
  );

  if (!visible.length) return null;

  const handleClear = (id: string) => {
    setClearingId(id);
    clearDelay(id, { onSettled: () => setClearingId(null) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((delay) => (
        <DelayChip
          key={delay.id}
          delay={delay}
          onClear={handleClear}
          clearing={isPending && clearingId === delay.id}
        />
      ))}
    </div>
  );
}
