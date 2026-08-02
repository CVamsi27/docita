export const DEFAULT_CONFIG = {
  formOptions: {} as Record<string, unknown>,
  defaults: {} as Record<string, unknown>,
  clinicSettings: {} as Record<string, unknown>,
} as const;

export type FormOptions = Record<string, unknown>;
export type DefaultValues = Record<string, unknown>;
export type ClinicSettings = Record<string, unknown>;
export type AppConfig = typeof DEFAULT_CONFIG;

export type SelectOption = { label: string; value: string };
export type DurationOption = { label: string; value: number };
export type PatientImportField = { key: string; label: string };
export type CurrencyOption = { code: string; symbol: string; name: string };