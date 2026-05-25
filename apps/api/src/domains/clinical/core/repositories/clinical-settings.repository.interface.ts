export interface IClinicalSettingsRepository {
  getClinicSettings(clinicId: string): Promise<Record<string, unknown>>;
  updateClinicSettings(
    clinicId: string,
    settings: Record<string, unknown>,
  ): Promise<void>;
}

export const CLINICAL_SETTINGS_REPOSITORY_TOKEN = 'IClinicalSettingsRepository';
