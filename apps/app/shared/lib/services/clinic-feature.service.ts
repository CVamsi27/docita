import {
  type ClinicFeatureConfig,
  type MedicationRoute,
  type PresetTag,
  type SpecialtySection,
  MEDICATION_ROUTES,
  getConfig,
  getPresetTags,
  getSpecialtySections,
  supportsFeature,
  getAllClinicTypes,
  getMedicationRoutes,
  getMedicationRoutesGrouped,
  getCategorizedTags,
} from "./clinic-feature-service-helpers";

export type {
  ClinicFeatureConfig,
  MedicationRoute,
  PresetTag,
  SpecialtySection,
};

export const ClinicFeatureService = {
  getConfig,
  getPresetTags,
  getSpecialtySections,
  supportsFeature,
  getAllClinicTypes,
  getMedicationRoutes,
  getMedicationRoutesGrouped,
  getCategorizedTags,
};

export { MEDICATION_ROUTES };
