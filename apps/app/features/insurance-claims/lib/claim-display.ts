export {
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  CLAIM_STATUS_TRANSITIONS,
  CLAIM_STATUS_TONE,
} from "@workspace/types";

/** Major-unit value from persisted minor units (paise/cents). */
export const centsToMajor = (cents: number | null | undefined): number =>
  (cents ?? 0) / 100;
