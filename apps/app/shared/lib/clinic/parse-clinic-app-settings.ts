import {
  appClinicSettingsSchema,
  type AppClinicSettings,
} from "@workspace/types";

/** Parse persisted clinic.settings JSON into typed app settings (empty object on failure). */
export function parseClinicAppSettings(settings: unknown): AppClinicSettings {
  const parsed = appClinicSettingsSchema.safeParse(settings);
  return parsed.success ? parsed.data : {};
}
