type ClinicSettings = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getClinicSettings(settings: unknown): ClinicSettings {
  return isRecord(settings) ? settings : {};
}
