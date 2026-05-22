"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
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
  return (
    <div className="surface-warning flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
      <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span className="text-warning">
        <span className="font-medium">~{delay.delayMinutes} min delay</span>
        {delay.reason ? (
          <span className="opacity-80"> · {delay.reason}</span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label="Clear delay"
        disabled={clearing}
        onClick={() => onClear(delay.id)}
        className="ml-1 rounded-full p-0.5 text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
      >
        <X className="h-3 w-3" />
      </button>
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
