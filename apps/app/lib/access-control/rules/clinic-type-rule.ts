/**
 * Clinic Type-Based Access Rule
 *
 * Enforces clinic type restrictions on specialty features.
 * Priority: 25 (after role-based at 15, before subscription status at 20)
 *
 * Examples:
 * - DENTAL clinics can access dentalChart
 * - PEDIATRIC clinics can access growthChart
 * - GENERAL clinics have all core features but no specialty features
 *
 * This rule implements HARD BLOCKS for specialty features that don't match
 * the clinic type, ensuring proper feature segregation.
 */

import type {
  IAccessContext,
  IAccessDecision,
  IAccessRule,
} from "../interfaces";
import { CLINIC_TYPE_FEATURES, CLINIC_TYPE_LABELS } from "@workspace/types";

export class ClinicTypeBasedAccessRule implements IAccessRule {
  getRuleName(): string {
    return "ClinicTypeBasedAccess";
  }

  getPriority(): number {
    return 25; // After role-based (15), before subscription status (20)
  }

  canAccess(context: IAccessContext): boolean {
    // If no clinic type specified, allow (backward compatibility)
    if (!context.clinicType) {
      return true;
    }

    // Get feature matrix for this clinic type
    const typeFeatures = CLINIC_TYPE_FEATURES[context.clinicType];
    if (!typeFeatures) {
      return true; // Unknown clinic type, allow
    }

    // List of specialty features that are clinic-type specific
    const specialtyFeatures = [
      "dentalChart",
      "growthChart",
      "ophthalmologyExam",
      "cardiologyExam",
      "gynecologyExam",
      "dermatologyExam",
      "mentalStatusExam",
      "psychiatryExam",
      "visionTest",
      "ecgMonitoring",
      "imagingReview",
      "skinLesionTracking",
      "prenatalCare",
    ];

    // Check if this is a specialty feature
    if (specialtyFeatures.includes(context.feature)) {
      // Hard block: Feature must be explicitly enabled for this clinic type
      const featureKey = context.feature as keyof typeof typeFeatures;
      return typeFeatures[featureKey] === true;
    }

    // For core features (not in specialty list), always allow
    return true;
  }

  getReason(context: IAccessContext): string {
    if (!context.clinicType) {
      return "Clinic type not specified";
    }

    const clinicTypeLabel =
      CLINIC_TYPE_LABELS[context.clinicType] || context.clinicType;
    const featureName = context.feature
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();

    return `The ${featureName} feature is not available for ${clinicTypeLabel} clinics. This feature is specific to other clinic types. Please contact support if you need this feature enabled.`;
  }

  getDecision(context: IAccessContext): IAccessDecision {
    const granted = this.canAccess(context);

    return {
      granted,
      reason: granted
        ? "Feature supported by clinic type"
        : this.getReason(context),
      ruleName: this.getRuleName(),
      denialType: granted ? undefined : "clinic_type_unsupported",
      metadata: {
        unsupportedForClinicType: granted ? undefined : context.clinicType,
      },
    };
  }
}
