import type { ChiefComplaintItem } from "./chief-complaint.types";
import { ComplaintHeader } from "./ComplaintHeader";
import { ComplaintDetails } from "./ComplaintDetails";

export function ChiefComplaintItemRow({
  item,
  index,
  readOnly,
  isListening,
  isSupported,
  onMicToggle,
  onUpdate,
  onRemove,
}: {
  item: ChiefComplaintItem;
  index: number;
  readOnly: boolean;
  isListening: boolean;
  isSupported: boolean;
  onMicToggle: () => void;
  onUpdate: (field: keyof ChiefComplaintItem, value: string) => void;
  onRemove: () => void;
}) {
  const isPrimary = index === 0;
  const hasComplaint = item.complaint.trim().length > 0;
  const durationNumber = Number(item.durationValue);
  const hasDurationValue = item.durationValue.trim().length > 0;
  const isDurationValid = !hasComplaint
    ? true
    : hasDurationValue && Number.isFinite(durationNumber) && durationNumber > 0;

  return (
    <div
      className={`space-y-3 rounded-[var(--radius-md)] border p-3 transition-colors duration-150 ${
        isPrimary
          ? "border-primary/30 bg-primary/5"
          : "border-border/70 bg-card hover:bg-muted/20"
      }`}
    >
      <ComplaintHeader
        index={index}
        isPrimary={isPrimary}
        hasComplaint={hasComplaint}
        readOnly={readOnly}
        onRemove={onRemove}
      />
      <ComplaintDetails
        item={item}
        index={index}
        readOnly={readOnly}
        isListening={isListening}
        isSupported={isSupported}
        isDurationValid={isDurationValid}
        hasComplaint={hasComplaint}
        onMicToggle={onMicToggle}
        onUpdate={onUpdate}
      />
    </div>
  );
}
