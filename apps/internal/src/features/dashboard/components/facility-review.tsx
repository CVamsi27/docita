import type { RefObject } from "react";
import type { InternalClinicListEntry } from "@workspace/types";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { EditClinicDialog } from "@/features/dashboard/components/edit-clinic-dialog";

export function FacilityReview({
  clinic,
  onUpdate,
  returnFocusRef,
}: {
  clinic: InternalClinicListEntry;
  onUpdate: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const facts = [
    ["Type", humanizeUiLabel(clinic.type)],
    ["Access tier", humanizeUiLabel(clinic.tier)],
    ["Subscription status", clinic.subscriptionStatus.trim() || "Not recorded"],
    ["Email", clinic.email || "Not recorded"],
    ["Phone", clinic.phone || "Not recorded"],
    ["Address", clinic.address || "Not recorded"],
    ["Users", clinic._count.users],
    ["Patients", clinic._count.patients],
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="break-words font-sans text-xl font-semibold leading-snug">
          {clinic.name}
        </h3>
        <StatusBadge status={clinic.active ? "active" : "inactive"} />
      </div>
      <dl className="divide-y divide-border/60 text-sm">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <EditClinicDialog
        key={clinic.id}
        clinic={clinic}
        onClinicUpdated={onUpdate}
        triggerVariant="text"
        returnFocusRef={returnFocusRef}
      />
    </div>
  );
}
