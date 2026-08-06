import type { MarkDoctorDelayInput } from "@workspace/data-access";
import { MarkDoctorDelayDialog } from "@/features/appointments/components/dialogs/MarkDoctorDelayDialog";

interface MarkDoctorDelaySectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDoctorId: string | undefined;
  doctorsList: Array<{ id: string; name: string }> | null;
  isMarkingDelay: boolean;
  onConfirm: (input: MarkDoctorDelayInput) => void;
}

export function MarkDoctorDelaySection({
  open,
  onOpenChange,
  selectedDoctorId,
  doctorsList,
  isMarkingDelay,
  onConfirm,
}: MarkDoctorDelaySectionProps) {
  return (
    <MarkDoctorDelayDialog
      open={open}
      onOpenChange={onOpenChange}
      doctorId={selectedDoctorId ?? undefined}
      doctorName={
        selectedDoctorId
          ? (doctorsList?.find((d) => d.id === selectedDoctorId)?.name ?? "")
          : undefined
      }
      doctors={
        !selectedDoctorId && doctorsList
          ? doctorsList.map((d) => ({ id: d.id, name: d.name }))
          : undefined
      }
      isLoading={isMarkingDelay}
      onConfirm={onConfirm}
    />
  );
}
