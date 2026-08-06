import type { Patient } from "@workspace/types";
import type { PatientsSortConfig } from "./patients-page-types";

export function getAriaSort(
  sortConfig: PatientsSortConfig | null,
  column: keyof Patient | "fullName",
) {
  if (sortConfig?.key !== column) return "none" as const;
  return sortConfig.direction === "asc" ? "ascending" : "descending";
}
