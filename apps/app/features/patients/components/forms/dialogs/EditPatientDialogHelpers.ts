import type { GenderValue as GV } from "./add-patient-dialog-constants";
import { GENDER_OPTIONS as SHARED_OPTIONS } from "./add-patient-dialog-constants";

export type GenderValue = GV;

export const GENDER_VALUES: readonly GenderValue[] = [
  "MALE",
  "FEMALE",
  "OTHER",
  "INTERSEX",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const;

export const GENDER_OPTIONS = SHARED_OPTIONS;
