import type { GenderValue as GV } from "./add-patient-dialog-constants";

type GenderValue = GV;

export const GENDER_VALUES: readonly GenderValue[] = [
  "MALE",
  "FEMALE",
  "OTHER",
  "INTERSEX",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const;

