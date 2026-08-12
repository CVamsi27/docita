import { type ClinicalInvestigation } from "@workspace/types";

/**
 * Allowed investigation categories. Kept in sync with the Zod enum in
 * `@workspace/types` (investigation categories field) — the two are
 * coupled intentionally; update both together.
 */
export const INVESTIGATION_CATEGORIES = [
  "LABORATORY",
  "IMAGING",
  "SPECIAL",
  "OTHER",
] as const;

/**
 * Allowed investigation statuses. Kept in sync with the Zod enum in
 * `@workspace/types` (investigation status field).
 */
export const INVESTIGATION_STATUSES = [
  "ORDERED",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;


export interface InvestigationRowProps {
  row: ClinicalInvestigation;
  index: number;
  readOnly?: boolean;
  canAttach: boolean;
  hasUploadContext: boolean;
  uploadingId: string | null;
  onUpdate: (index: number, patch: Partial<ClinicalInvestigation>) => void;
  onRemove: (index: number) => void;
  onAttach: (index: number, row: ClinicalInvestigation, file: File) => Promise<void>;
}
