export const DEFAULT_CONFIG = {
  // check-as-cast-density: allow-file — empty config defaults widened to Record for the stable app-config shape
  formOptions: {} as Record<string, unknown>,
  defaults: {} as Record<string, unknown>,
  clinicSettings: {} as Record<string, unknown>,
} as const;

export type FormOptions = Record<string, unknown>;
export type DefaultValues = Record<string, unknown>;
export type ClinicSettings = Record<string, unknown>;
export type AppConfig = typeof DEFAULT_CONFIG;

export type SelectOption = { label: string; value: string };
