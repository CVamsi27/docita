"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface DoctorFilterOption {
  id: string;
  name: string;
}

interface DoctorFilterSelectProps {
  doctors: DoctorFilterOption[];
  selectedDoctorId: string | undefined;
  onDoctorSelect: (doctorId: string | undefined) => void;
  /** Extra classes for the trigger (e.g. width constraints). */
  triggerClassName?: string;
  ariaLabel?: string;
}

const ALL_DOCTORS_VALUE = "all";

/**
 * Filter-by-doctor select shared by every surface that lets a clinician
 * narrow a list or calendar to one doctor. `undefined` selection is encoded
 * as the `all` sentinel value internally; callers receive `undefined` back
 * when "All doctors" is chosen.
 *
 * The option labels are intentionally hardcoded English (the original
 * consumers were hardcoded too); a future i18n pass would need label props.
 */
export function DoctorFilterSelect({
  doctors,
  selectedDoctorId,
  onDoctorSelect,
  triggerClassName = "h-9 w-full text-sm",
  ariaLabel = "Filter by doctor",
}: DoctorFilterSelectProps) {
  return (
    <Select
      value={selectedDoctorId || ALL_DOCTORS_VALUE}
      onValueChange={(value) =>
        onDoctorSelect(value === ALL_DOCTORS_VALUE ? undefined : value)
      }
    >
      <SelectTrigger className={triggerClassName} aria-label={ariaLabel}>
        <SelectValue placeholder="Doctor" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_DOCTORS_VALUE}>All doctors</SelectItem>
        {doctors.map((doctor) => (
          <SelectItem key={doctor.id} value={doctor.id}>
            Dr. {doctor.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
