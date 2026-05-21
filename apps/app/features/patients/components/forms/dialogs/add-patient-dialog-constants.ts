export type GenderValue =
  | "MALE"
  | "FEMALE"
  | "OTHER"
  | "INTERSEX"
  | "NON_BINARY"
  | "PREFER_NOT_TO_SAY";

export const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "INTERSEX", label: "Intersex" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];
