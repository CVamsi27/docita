import { Feature } from "@workspace/types";

/**
 * Master client-side AI switch. OFF by default — mirrors the backend kill-switch
 * (`AI_EXTERNAL_ENABLED`). While off, processing features are hidden. The
 * informational Ask AI preview remains available and sends no patient data.
 * Re-enable processing by
 * setting `VITE_AI_ENABLED=true` (and the backend flag) once AI
 * processing is disclosed in the consent notice.
 */
export const AI_FEATURES_ENABLED =
  process.env.VITE_AI_ENABLED === "true";

/**
 * Features that depend on external AI. When {@link AI_FEATURES_ENABLED} is
 * false these are treated as unavailable regardless of tier/Intelligence, so
 * their `FeatureGate`s, nav items, and command-palette actions all disappear.
 */
export const AI_GATED_FEATURES: ReadonlySet<Feature> = new Set([
  Feature.AI_PRESCRIPTION_ASSISTANT,
  Feature.AI_DIAGNOSIS_HINTS,
  Feature.SMART_TASK_ENGINE,
  Feature.PREDICTIVE_NO_SHOW,
  Feature.PATIENT_SEGMENTATION,
  Feature.ANOMALY_DETECTION,
  Feature.OCR_ADVANCED,
]);
